# VectorMind — AGENTS.md (Project Rules)

## Project Identity
- **Derivative of**: https://github.com/perryvegehan/Your-OWN-AI
- **New name**: VectorMind — AI knowledge and semantic search platform
- **License**: Preserve original license; credit original project; document new contributions separately.

## Mandatory Technology Stack
- **Runtime / Backend**: Python (primary), FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, pytest
- **Database**: PostgreSQL (users, document metadata, chunk metadata, conversations, messages, preferences)
- **Vector Engine**: Migrated Python brute-force, KD-Tree, and HNSW implementations (kept as primary engine)
- **Embeddings / LLM**: Ollama (preserve existing integration)
- **Numeric ops**: NumPy where appropriate
- **Frontend**: React + TypeScript + Vite; React Router; Tailwind CSS (or equivalent consistent system); Lucide icons; Recharts

## Architecture Rules
1. Keep vector algorithms **independent** of FastAPI routing and SQLAlchemy.
2. Separate: API routers | Pydantic schemas | services | database models | embedding clients | document ingestion | RAG orchestration.
3. PostgreSQL is for **relational persistence only**; it does NOT replace the custom vector engine.
4. Do **not** call the original C++ executable for normal application operations after Python migration (document any exceptions).
5. Keep original C++ source as reference during migration. Do not claim parity without test evidence.
6. **Inspect before modifying**. Reuse existing functionality and API contracts; do not invent endpoints or replace working code with mocks.
7. Avoid broad unrelated refactors. Every task must be scoped and independently testable.

## Visual Design Specification
- **Style**: Glassmorphism — translucent surfaces *selectively*, restrained backdrop blur, subtle borders, soft shadows.
- Use **solid surfaces** for dense tables and forms where readability matters.
- **Avoid**: excessive purple-blue gradients, glowing borders everywhere, fake metrics, fabricated testimonials, random badges, decorative animation without purpose.
- UI must be **responsive**: desktop, laptop, tablet, mobile. No horizontal overflow.
- **Accessible**: labels, keyboard focus, sufficient contrast, `prefers-reduced-motion` respected.
- **Animations**: purposeful, 150–250 ms, prefer `transform` and `opacity`.

## Reliability & Security Rules
- Use **environment variables** for all secrets. Never commit credentials or expose secrets to the frontend.
- Validate all requests and uploads; return meaningful HTTP errors.
- Handle DB/Ollama failures, empty states, loading states, partial ingestion failures, retries.
- Use **Alembic migrations** (never ad hoc schema changes). Use transactions and constraints.
- Add tests for: core algorithms, API behavior, ingestion, retrieval, persistence, authorization.
- Never use mock values as real production metrics. Never claim tests passed unless actually verified.
- Do **not** remove original license notices.

## Required Workflow for Every Task
1. Inspect the relevant code and report the current implementation.
2. State the files likely to change and the approach.
3. Implement only the current task.
4. Run relevant tests, type checks, lint checks, and builds available in the repository.
5. Fix regressions caused by the task.
6. Summarize: files changed, commands run, actual results, limitations, and exact verification commands.
7. **Wait for user approval** before beginning the next task.

## Completion Standard
The final application must:
- Use a tested Python vector engine, FastAPI, PostgreSQL, React/TypeScript, and Ollama where supported.
- Have a responsive, distinctive glassmorphism UI.
- Include documented setup, migrations, testing, and deployment.
- Accurately distinguish inherited code from new contributions.
