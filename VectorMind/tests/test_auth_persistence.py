"""
Tests for Task 12 — Relational persistence, authentication, authorization, and cross-user isolation.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.database import Base, get_db
from api.main import app
from api.models import User, Conversation, Message, Document, ChunkMetadata

# SQLite in-memory with StaticPool so all connections share the same database
TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_user_registration_and_login(client: TestClient):
    # 1. Register User
    reg_resp = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "password123", "full_name": "Alice Researcher"},
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == "alice@example.com"
    assert user_data["full_name"] == "Alice Researcher"
    assert "hashed_password" not in user_data  # plain or hashed password never leaked

    # 2. Duplicate registration rejected
    dup_resp = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "anotherpassword"},
    )
    assert dup_resp.status_code == 409
    assert "already exists" in dup_resp.json()["detail"]

    # 3. Login with wrong password
    bad_login = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # 4. Login with correct password
    good_login = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "password123"},
    )
    assert good_login.status_code == 200
    token_data = good_login.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 5. Access /auth/me with valid Bearer token
    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alice@example.com"


def test_unauthorized_access(client: TestClient):
    # Unauthenticated calls to protected routes
    assert client.get("/auth/me").status_code == 401
    assert client.get("/conversations").status_code == 401
    assert client.post("/conversations", json={"title": "Test"}).status_code == 401


def test_conversation_persistence_and_resource_isolation(client: TestClient):
    # Register two separate users
    reg_a = client.post("/auth/register", json={"email": "userA@test.com", "password": "securepasswordA"})
    assert reg_a.status_code == 201
    token_a = client.post("/auth/login", json={"email": "userA@test.com", "password": "securepasswordA"}).json()["access_token"]

    reg_b = client.post("/auth/register", json={"email": "userB@test.com", "password": "securepasswordB"})
    assert reg_b.status_code == 201
    token_b = client.post("/auth/login", json={"email": "userB@test.com", "password": "securepasswordB"}).json()["access_token"]

    auth_a = {"Authorization": f"Bearer {token_a}"}
    auth_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a conversation
    create_resp = client.post("/conversations", json={"title": "User A Research"}, headers=auth_a)
    assert create_resp.status_code == 201
    conv_a_id = create_resp.json()["id"]

    # User A appends a message with citations
    msg_resp = client.post(
        f"/conversations/{conv_a_id}/messages",
        headers=auth_a,
        json={
            "sender": "user",
            "content": "What are vector indexes?",
            "citations": [
                {
                    "title": "HNSW Guide",
                    "text": "Hierarchical Navigable Small World graphs enable fast ANN.",
                    "distance": 0.12,
                    "page_number": 3,
                    "chunk_index": 1,
                }
            ],
        },
    )
    assert msg_resp.status_code == 201

    # User A views their conversation
    get_a = client.get(f"/conversations/{conv_a_id}", headers=auth_a)
    assert get_a.status_code == 200
    assert len(get_a.json()["messages"]) == 1
    assert get_a.json()["messages"][0]["citations"][0]["title"] == "HNSW Guide"

    # User B list conversations — should be empty (cross-user isolation)
    list_b = client.get("/conversations", headers=auth_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # User B tries to read User A's conversation — MUST RETURN 403 FORBIDDEN
    forbidden_get = client.get(f"/conversations/{conv_a_id}", headers=auth_b)
    assert forbidden_get.status_code == 403
    assert "Access forbidden" in forbidden_get.json()["detail"]

    # User B tries to append a message to User A's conversation — MUST RETURN 403 FORBIDDEN
    forbidden_post = client.post(
        f"/conversations/{conv_a_id}/messages",
        headers=auth_b,
        json={"sender": "user", "content": "Tampering attempt"},
    )
    assert forbidden_post.status_code == 403

    # User B tries to delete User A's conversation — MUST RETURN 403 FORBIDDEN
    forbidden_del = client.delete(f"/conversations/{conv_a_id}", headers=auth_b)
    assert forbidden_del.status_code == 403

    # User A can delete their own conversation
    del_a = client.delete(f"/conversations/{conv_a_id}", headers=auth_a)
    assert del_a.status_code == 204

    # Now it is gone
    assert client.get(f"/conversations/{conv_a_id}", headers=auth_a).status_code == 404
