# Family Tree App (Italian Citizenship)

Aplicação web para criação de árvores genealógicas profissionais para processos de cidadania italiana.

Documentação detalhada:
- [Requisitos](docs/requirements.md)
- [Arquitetura](docs/architecture.md)
- [API](docs/api.md)

## O que é

O projeto permite autenticar usuários, organizar famílias, cadastrar pessoas e relações familiares, gerar uma visualização automática da árvore e exportar o resultado em PDF.

## Como rodar

### Com Docker

```bash
make up
```

Ou:

```bash
docker compose up -d --build
```

Acesse:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/health`

Usuário padrão:
- email: `admin@example.com`
- senha: `admin123`

### Sem Docker

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

### Modo mock

```bash
cd frontend
npm install
npm run build:mock
npm run preview:mock
```

## Tecnologias usadas

- Backend: FastAPI, SQLAlchemy, Alembic
- Frontend: React 18, TypeScript, Vite
- Banco de dados: PostgreSQL e SQLite
- Exportação: Jinja2 e WeasyPrint
