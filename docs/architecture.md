# Arquitetura do Sistema

Esta descrição reflete a arquitetura implementada atualmente no projeto.

## Visão geral

O sistema é uma aplicação full stack com frontend React e backend FastAPI. O frontend consome a API em modo `live` e também possui um modo `mock` estático para demonstração visual. O backend concentra autenticação, regras de negócio, persistência dos dados, geração de layout da árvore e exportação em PDF.

```text
Browser
  |
  +--> Frontend React/Vite (modo live) ----HTTP/JSON + JWT----> FastAPI
  |                                                         |
  |                                                         +--> SQLAlchemy --> PostgreSQL/SQLite
  |                                                         +--> graph.py
  |                                                         +--> layout.py
  |                                                         +--> export.py --> Jinja2 + WeasyPrint --> PDFs
  |
  +--> Frontend React/Vite (modo mock, sem API)
```

## Componentes principais

### Frontend

- Implementado com React 18, TypeScript e Vite.
- Em modo `live`, usa `frontend/src/api/client.ts` para autenticação, chamadas da API e persistência do token.
- Em modo `mock`, renderiza `MockPreviewPage` com dados fixos e sem dependência de backend.
- As páginas principais em modo `live` são login, listagem de casos e editor do caso.
- `HierarchyPreview` é o componente de exibição da árvore e recebe os dados já processados do preview.

### Backend

- Implementado com FastAPI.
- Expõe rotas em `/api/v1` para autenticação, usuários, casos, pessoas, preview e exportações.
- Usa dependências de autenticação para validar JWT e resolver o usuário atual.
- Aplica restrição de acesso por papel e por visibilidade do caso.

### Persistência

- Usa SQLAlchemy ORM para mapear as entidades do domínio.
- Em Docker, o banco padrão é PostgreSQL.
- Em execução local e testes, o projeto suporta SQLite por configuração de `DATABASE_URL`.

### Serviços de domínio

- `graph.py`: valida relações pai/mãe-filho e detecta ciclos na linhagem.
- `layout.py`: calcula gerações, posições dos nós, paginação e arestas do preview.
- `export.py`: renderiza HTML com Jinja2 e converte o resultado para PDF com WeasyPrint.

## Modos de runtime do frontend

### Modo `live`

- Usa roteamento normal da aplicação.
- Exige autenticação.
- Consome a API em `/api/v1`.
- Permite criar casos, pessoas, uniões, vínculos, visualizar preview e gerar exportações.

### Modo `mock`

- Usa dados estáticos de demonstração.
- Não realiza login.
- Não chama a API.
- Pode usar roteamento `hash` para compatibilidade com publicação estática, como GitHub Pages.

## Fluxo principal

1. O usuário faz login e recebe um token JWT.
2. O frontend envia o token Bearer nas chamadas subsequentes.
3. O usuário cria ou acessa um caso.
4. O backend registra pessoas, uniões e vínculos pai/mãe-filho, validando integridade e ciclos.
5. O endpoint de preview usa `layout.py` para calcular posições e estrutura visual da árvore.
6. O endpoint de exportação usa o layout, renderiza HTML com template e gera um PDF em diretório configurável.
7. O frontend lista exportações já geradas e permite baixar o arquivo correspondente.

## Entidades centrais

- `User`: usuário autenticável com nome, e-mail, senha criptografada, papel (`admin` ou `staff`) e status de ativação.
- `Case`: unidade principal de trabalho, com título, referência do cliente, status e autor.
- `Person`: pessoa vinculada a um caso, com nome, nascimento, marcação de `Richiedente` e observações.
- `Union`: relacionamento entre duas pessoas do mesmo caso.
- `ParentChildLink`: vínculo direcional entre ascendente e descendente.
- `Export`: registro de um arquivo exportado, com formato, versão de template, autor e caminho do arquivo.

## Regras arquiteturais observáveis

- A visibilidade de casos é central para o backend: `admin` acessa todos os casos e `staff` apenas os próprios.
- O frontend não faz chamadas diretas fora do cliente central de API.
- O preview é calculado no backend, e o frontend atua como camada de apresentação.
- A exportação depende do mesmo layout usado na visualização, reduzindo divergência entre preview e PDF.
