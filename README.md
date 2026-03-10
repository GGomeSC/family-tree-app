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
# 1) Configure environment variables
cp .env.example .env

# 2) Generate a secure JWT secret
openssl rand -hex 32
# Paste the result into SECRET_KEY in .env

# 3) Start services
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

### Variaveis de ambiente e segredos

- O arquivo `.env` na raiz do projeto e usado pelo Docker Compose local.
- Para rodar apenas o backend fora do Docker, `backend/app/core/config.py` tambem suporta carregar um arquivo `.env` no diretorio `backend/`.
- Use `.env.example` como template e nunca comite segredos reais.
- O `SECRET_KEY` deve ser unico por ambiente (dev/staging/prod).
- Em `staging` e `production`, `SECRET_KEY` e obrigatorio e deve ter no minimo 32 caracteres; configuracoes invalidas falham no startup com erro explicito.

Gerar uma chave segura para JWT:

```bash
openssl rand -hex 32
```

Nota de seguranca:
- O `SECRET_KEY` historicamente versionado no repositório esta comprometido e nao deve ser reutilizado em nenhum ambiente.
- Ao rotacionar `SECRET_KEY`, tokens JWT antigos deixam de ser validos e os usuarios precisam autenticar novamente.

Producao:
- Injete `SECRET_KEY` via variaveis de ambiente da plataforma de deploy.
- Alternativamente, use Docker/Kubernetes secrets ou um secrets manager (ex.: AWS Secrets Manager, Vault).
- Nunca armazene segredos no Git, em imagens Docker, ou em arquivos versionados.

### Sem Docker

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

O backend local usa `backend/.env` automaticamente quando o arquivo existe. Variaveis do ambiente do shell continuam tendo precedencia.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Build de produção do frontend:

```bash
cd frontend
npm install
npm run build
```

### Database migrations

Alembic exige `DATABASE_URL` explicitamente. Se a variavel nao estiver definida, `alembic upgrade head` falha antes de conectar para evitar migracoes acidentais no banco errado.

Docker Compose/local stack:

```bash
cp .env.example .env
docker compose run --rm backend alembic upgrade head
```

O valor de `DATABASE_URL` vem do arquivo `.env` na raiz. O template padrao usa o PostgreSQL do Compose:

```bash
DATABASE_URL=postgresql+psycopg2://family_tree:family_tree@db:5432/family_tree
```

Backend local fora do Docker:

```bash
cd backend
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/family_tree alembic upgrade head
```

Template para backend local:

```bash
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/family_tree
```

Se estiver usando `backend/.env`, mantenha esse valor no proprio arquivo para que `uvicorn app.main:app --reload` carregue a configuracao automaticamente. O Alembic continua exigindo `DATABASE_URL` explicito no ambiente de execucao.

SQLite continua suportado para fluxos locais/teste quando configurado explicitamente, mas nunca como fallback implicito para Alembic:

```bash
cd backend
DATABASE_URL=sqlite:///./family_tree.db alembic upgrade head
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

### Frontend em produção com Docker

O frontend em produção recebe `VITE_API_URL` no build da imagem, não em runtime do container.

Build da imagem:

```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:8000/api/v1 \
  -t family-tree-frontend:prod \
  ./frontend
```

Executar localmente:

```bash
docker run --rm -p 8080:80 family-tree-frontend:prod
```

Nesse modo, o nginx serve os arquivos estáticos otimizados em `http://localhost:8080`.

## Tecnologias usadas

- Backend: FastAPI, SQLAlchemy, Alembic
- Frontend: React 18, TypeScript, Vite
- Banco de dados: PostgreSQL e SQLite
- Exportação: Jinja2 e WeasyPrint
