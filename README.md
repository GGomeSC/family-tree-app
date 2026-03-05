# Family Tree App (Italian Citizenship)

Aplicação web para criação de árvores familiares profissionais para processos de cidadania italiana.

## Stack
- Backend: FastAPI + SQLAlchemy + Alembic + PostgreSQL/SQLite
- Frontend: React + TypeScript (Vite)
- Exportação: HTML -> PDF com WeasyPrint

## Funcionalidades V1
- Login com JWT e perfis (`admin`, `staff`)
- CRUD de casos
- Cadastro de pessoas, uniões e vínculos pai/mãe-filho(a)
- Validação de ciclo de parentesco
- Preview de layout automático por geração
- Exportação PDF com múltiplas páginas
- Marcação de múltiplos `Richiedente`
- Histórico e download de exportações

## Estrutura
- `backend/`: API + regras de negócio + migrations
- `frontend/`: interface web separada
- `docker-compose.yml`: ambiente local completo

## Arquitetura
```text
                                   +----------------------+
                                   |   Browser (React)    |
                                   | frontend (Vite + TS) |
                                   +----------+-----------+
                                              |
                                              | HTTP/JSON + JWT
                                              v
+-----------------------+          +----------+-----------+
|   Mock mode (Pages)   |          |   FastAPI Backend    |
| MockPreviewPage.tsx   |          |   /api/v1/* routes   |
+-----------+-----------+          +----------+-----------+
            |                                 |
            | (sem API)                       | SQLAlchemy ORM
            |                                 v
            |                      +----------+-----------+
            |                      |    PostgreSQL DB     |
            |                      | (docker: family_tree)|
            |                      +----------------------+
            |
            |                                 +--------------------------+
            |                                 | Services (backend/app/)  |
            |                                 | - graph.py (ciclos)      |
            |                                 | - layout.py (preview)    |
            |                                 | - export.py (HTML->PDF)  |
            |                                 +------------+-------------+
            |                                              |
            |                                              | Jinja2 + WeasyPrint
            |                                              v
            |                                 +------------+-------------+
            |                                 |  /app/exports (volume)   |
            +-------------------------------->| PDFs para download        |
                                              +--------------------------+
```

Fluxo principal:
1. Frontend autentica em `/api/v1/auth/login` e guarda JWT.
2. CRUD de casos/pessoas/relacionamentos passa pelo backend e persiste no PostgreSQL.
3. `GET /cases/{id}/preview` usa `layout.py` para gerar coordenadas da árvore.
4. `POST /cases/{id}/export/pdf` renderiza HTML (`templates/tree.html`) e gera PDF com WeasyPrint.
5. Frontend baixa arquivo por `GET /api/v1/exports/{export_id}/download`.

## Rodar local com Docker (recomendado)

### Pré-requisitos
- Docker Engine + Docker Compose plugin (`docker compose`)

### 1) Subir tudo
Na raiz do projeto:

```bash
docker compose up -d --build
```

Ou com `Makefile`:

```bash
make up
```

### 2) Conferir containers
```bash
docker compose ps
```

Serviços esperados:
- `family_tree_db`
- `family_tree_backend`
- `family_tree_frontend`

### 3) Acessar aplicação
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/health`

Usuário padrão criado no startup:
- email: `admin@example.com`
- senha: `admin123`

## Teste rápido local (smoke test)

### Via UI
1. Abra `http://localhost:5173`
2. Faça login com `admin@example.com` / `admin123`
3. Crie um caso
4. Adicione pessoas, união e vínculo pai-filho
5. Clique em `Gerar PDF`

### Via API (opcional)
```bash
curl -s http://localhost:8000/health
```

## Logs e troubleshooting
```bash
docker compose logs -f --tail=200
```

Se backend não subir por causa do banco:
```bash
docker compose down
docker compose up -d --build
```

Para reiniciar limpando volumes (apaga banco local):
```bash
docker compose down -v
docker compose up -d --build
```

## Rodar testes com Docker
```bash
docker compose exec backend python -m pytest -q
```

Ou com `Makefile`:
```bash
make test
```

## Parar ambiente
```bash
docker compose down
```

## Execução sem Docker (alternativa)

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Preview estático (GitHub Pages)

Para gerar o mock estático (sem backend), use:

```bash
cd frontend
npm install
npm run build:mock
npm run preview:mock
```

Com `build:mock`, a aplicação entra em modo de demonstração:
- renderiza apenas a tela de visualização da árvore com dados fixos
- usa roteamento hash (`#/`) para compatibilidade com GitHub Pages
- funciona sem autenticação e sem chamadas de API

Deploy automático:
- workflow em `.github/workflows/deploy-pages.yml`
- publicação em push para `main` (quando houver mudanças em `frontend/**`)
- URL esperada: `https://ggomesc.github.io/family-tree-app/`

## Endpoints principais
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/cases`
- `POST /api/v1/cases/{case_id}/persons`
- `POST /api/v1/cases/{case_id}/unions`
- `POST /api/v1/cases/{case_id}/parent-child-links`
- `GET /api/v1/cases/{case_id}/preview`
- `POST /api/v1/cases/{case_id}/export/pdf`
- `GET /api/v1/exports/{export_id}/download`
