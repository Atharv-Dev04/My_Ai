"""
Conversations router — chat session persistence, history retrieval, and message management.

Endpoints:
    GET    /conversations             List conversations for authenticated user
    POST   /conversations             Create a new conversation session
    GET    /conversations/{id}        Get conversation details with all messages & citations
    DELETE /conversations/{id}        Delete conversation (strictly owner-scoped)
    POST   /conversations/{id}/messages Append message to conversation (strictly owner-scoped)
"""
from __future__ import annotations

from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import Conversation, Message, User
from api.services.auth_service import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CitationItem(BaseModel):
    id: Optional[int] = None
    title: str
    text: str
    distance: float
    page_number: Optional[int] = None
    chunk_index: int = 0


class MessageCreate(BaseModel):
    sender: str  # "user" | "assistant"
    content: str
    citations: Optional[List[CitationItem]] = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    content: str
    citations: Optional[Any] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationSummary(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    messages: List[MessageResponse]

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[ConversationSummary], summary="List user's conversations")
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ConversationSummary]:
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [
        ConversationSummary(
            id=c.id,
            title=c.title,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
            message_count=len(c.messages),
        )
        for c in convs
    ]


@router.post("", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED, summary="Create a conversation")
def create_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationSummary:
    conv = Conversation(
        user_id=current_user.id,
        title=body.title.strip() or "New Conversation",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        message_count=0,
    )


@router.get("/{conversation_id}", response_model=ConversationDetail, summary="Get conversation messages")
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetail:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    # Resource-level authorization check
    if conv.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not own this conversation",
        )

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        messages=[
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender=m.sender,
                content=m.content,
                citations=m.citations,
                created_at=m.created_at.isoformat(),
            )
            for m in conv.messages
        ],
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete conversation")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    # Resource-level authorization check
    if conv.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not own this conversation",
        )

    db.delete(conv)
    db.commit()


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Append a message")
def append_message(
    conversation_id: int,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    # Resource-level authorization check
    if conv.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not own this conversation",
        )

    citations_data = [c.model_dump() for c in body.citations] if body.citations else None
    msg = Message(
        conversation_id=conv.id,
        sender=body.sender,
        content=body.content,
        citations=citations_data,
    )
    db.add(msg)
    # Update conversation updated_at and first title if it is "New Conversation"
    if conv.title == "New Conversation" and body.sender == "user":
        conv.title = body.content[:40].strip() or "Conversation"

    db.commit()
    db.refresh(msg)

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender=msg.sender,
        content=msg.content,
        citations=msg.citations,
        created_at=msg.created_at.isoformat(),
    )
