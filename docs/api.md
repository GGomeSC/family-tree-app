# Schema atual da API

## Convenções gerais

- Prefixo base: `/api/v1`;
- Formato: JSON, exceto download de PDF;
- Autenticação: Bearer token JWT;
- Perfis de usuário: `admin` e `staff`;
- Regra de visibilidade: usuários `staff` só acessam famílias criadas por eles; `admin` acessa todas.

## Auth

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | Não | Público | Autenticar usuário ativo | `email`, `password` | `message` + cookie HTTP-only de autenticação | `401` para credenciais inválidas; `429` ao exceder limite de tentativas com header `Retry-After` |
| `POST /auth/logout` | Sim | `admin` ou `staff` | Encerrar sessão no cliente | Sem body | `message` | Não invalida token no servidor; orienta remover o token no cliente |
| `GET /auth/me` | Sim | `admin` ou `staff` | Retornar usuário autenticado | Sem body | `id`, `name`, `email`, `role`, `created_at` | `401` para token ausente ou inválido |

### Rate limit de login

- Política: `5` requisições por IP a cada `15` minutos em `POST /auth/login`.
- Ao exceder o limite, a API responde `429` com:
  - body: `{ "detail": "Too many login attempts. Try again in <N> seconds." }`
  - header: `Retry-After: <N>`

## Users

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /users` | Sim | `admin` | Criar novo usuário | `name`, `email`, `password`, `role` | `id`, `name`, `email`, `role`, `created_at` | `403` se não for admin; `409` se e-mail já existir |

## Families

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /families` | Sim | `admin` ou `staff` | Listar famílias visíveis | Query opcional `status` | Lista de `FamilyOut` | `staff` vê apenas famílias próprias |
| `POST /families` | Sim | `admin` ou `staff` | Criar família | `title`, `client_reference?` | `FamilyOut` | `created_by` é definido pelo usuário autenticado |
| `GET /families/{family_id}` | Sim | `admin` ou `staff` | Consultar família | Sem body | `FamilyOut` | `404` se a família não existir ou não estiver visível |
| `PATCH /families/{family_id}` | Sim | `admin` ou `staff` | Atualizar título ou referência | `title?`, `client_reference?` | `FamilyOut` | `404` para família inexistente ou sem acesso |
| `PATCH /families/{family_id}/status` | Sim | `admin` ou `staff` | Alterar status da família | `status` | `FamilyOut` | `400` para transição inválida; ao arquivar preenche `archived_at` |
| `DELETE /families/{family_id}` | Sim | `admin` ou `staff` | Arquivar família | Sem body | `message` | Não remove fisicamente; muda status para `Archived` |

### Status de família

- `Draft` -> `Reviewed`, `Archived`
- `Reviewed` -> `Exported`, `Archived`, `Draft`
- `Exported` -> `Archived`, `Reviewed`
- `Archived` -> sem transições válidas

## People e relationships

### Pessoas

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /families/{family_id}/persons` | Sim | `admin` ou `staff` | Criar pessoa na família | `full_name`, `birth_date`, `is_richiedente`, `notes?` | `PersonOut` | `404` se a família não existir ou não estiver visível |
| `PATCH /families/{family_id}/persons/{person_id}` | Sim | `admin` ou `staff` | Atualizar pessoa | Campos opcionais de pessoa | `PersonOut` | `400` se a pessoa não pertencer à família |
| `DELETE /families/{family_id}/persons/{person_id}` | Sim | `admin` ou `staff` | Remover pessoa | Sem body | `message` | Remove também uniões e vínculos pai/mãe-filho associados na família |

### Uniões

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /families/{family_id}/unions` | Sim | `admin` ou `staff` | Criar união | `partner_a_person_id`, `partner_b_person_id`, `marriage_date?` | `UnionOut` | `400` se parceiros forem iguais; `400` se pessoa não pertencer à família; `409` para união duplicada |
| `PATCH /families/{family_id}/unions/{union_id}` | Sim | `admin` ou `staff` | Atualizar união | Campos opcionais da união | `UnionOut` | `404` se união não existir; `400` para parceiros iguais; `409` para duplicidade |
| `DELETE /families/{family_id}/unions/{union_id}` | Sim | `admin` ou `staff` | Remover união | Sem body | `message` | `404` se união não existir |

### Vínculos pai/mãe-filho

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /families/{family_id}/parent-child-links` | Sim | `admin` ou `staff` | Criar vínculo parental | `parent_person_id`, `child_person_id` | `message` | `400` se pessoa não pertencer à família; `400` se criar ciclo; `409` se vínculo já existir |
| `DELETE /families/{family_id}/parent-child-links/{link_id}` | Sim | `admin` ou `staff` | Remover vínculo parental | Sem body | `message` | `404` se vínculo não existir |

### Regras relevantes de integridade

- Pessoas referenciadas em uniões e vínculos devem pertencer à mesma família da rota.
- O sistema impede vínculo com ciclo usando verificação prévia e checagem adicional após a persistência.
- Uniões e vínculos pai/mãe-filho possuem restrição de unicidade por família.

## Preview

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /families/{family_id}/preview` | Sim | `admin` ou `staff` | Gerar preview de layout da árvore | Sem body | `pages`, `persons`, `unions`, `edges`, `continuation_edges` | `400` se a família não tiver pessoas; `404` se a família não estiver acessível |

### Estrutura resumida do preview

- `persons`: lista de nós com `id`, `name`, `birth_date`, `is_richiedente`, `x`, `y`, `role`, `page`
- `unions`: lista de uniões com parceiros e data de casamento
- `edges`: conexões entre pais e filhos
- `continuation_edges`: conexões que atravessam páginas

## Exports

| Método e rota | Autenticação | Papel | Finalidade | Payload resumido | Resposta resumida | Erros e regras |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /families/{family_id}/export/pdf` | Sim | `admin` ou `staff` | Gerar exportação PDF | Sem body | `ExportOut` | `400` se a família não tiver pessoas; `503` se WeasyPrint estiver indisponível |
| `GET /families/{family_id}/exports` | Sim | `admin` ou `staff` | Listar exportações da família | Sem body | Lista de `ExportOut` | Ordena da mais recente para a mais antiga |
| `GET /exports/{export_id}/download` | Sim | `admin` ou `staff` | Baixar PDF exportado | Sem body | Arquivo PDF | `404` se export não existir; acesso depende da visibilidade da família |

### Estrutura resumida de exportação

- `ExportOut`: `id`, `family_id`, `exported_by`, `format`, `template_version`, `file_path`, `created_at`

## Endpoint auxiliar

| Método e rota | Autenticação | Papel | Finalidade | Resposta |
| --- | --- | --- | --- | --- |
| `GET /health` | Não | Público | Verificação simples de disponibilidade da aplicação | `{ "status": "ok" }` |
