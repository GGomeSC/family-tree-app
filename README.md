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

### Bootstrap de admin local

Depois de subir os serviços, crie (ou promova) um usuário admin local com variáveis de ambiente:

Com Docker:

```bash
docker compose exec \
  -e BOOTSTRAP_ADMIN_EMAIL=admin.local@example.com \
  -e BOOTSTRAP_ADMIN_PASSWORD='troque-esta-senha' \
  -e BOOTSTRAP_ADMIN_NAME='Local Admin' \
  backend python -m app.cli.bootstrap_admin
```

Sem Docker (backend local):

```bash
cd backend
BOOTSTRAP_ADMIN_EMAIL=admin.local@example.com \
BOOTSTRAP_ADMIN_PASSWORD='troque-esta-senha' \
BOOTSTRAP_ADMIN_NAME='Local Admin' \
python -m app.cli.bootstrap_admin
```

Se o usuário já existir e você quiser redefinir a senha:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin.local@example.com \
BOOTSTRAP_ADMIN_PASSWORD='nova-senha-local' \
python -m app.cli.bootstrap_admin --reset-password
```

Faça login no frontend usando exatamente os valores de `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD`.

Nota de segurança: não comite credenciais reais no repositório; mantenha-as em variáveis de ambiente locais.

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
