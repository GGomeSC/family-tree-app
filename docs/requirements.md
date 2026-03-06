# Requisitos do Projeto

Os requisitos abaixo foram derivados do comportamento implementado no código atual da aplicação.

## Requisitos Funcionais

- `RF-01` O sistema deve autenticar usuários por e-mail e senha e emitir token JWT para acesso à API.
- `RF-02` O sistema deve permitir consultar o usuário autenticado.
- `RF-03` O sistema deve permitir logout em nível de cliente, orientando a remoção do token armazenado.
- `RF-04` O sistema deve permitir que administradores criem novos usuários com perfil `admin` ou `staff`.
- `RF-05` O sistema deve restringir a criação de usuários ao perfil `admin`.
- `RF-06` O sistema deve permitir criar, listar, consultar e atualizar casos.
- `RF-07` O sistema deve permitir arquivar casos por exclusão lógica, registrando data de arquivamento.
- `RF-08` O sistema deve controlar transições de status de caso entre `Draft`, `Reviewed`, `Exported` e `Archived`.
- `RF-09` O sistema deve limitar a visualização de casos para usuários `staff` aos casos criados por eles, mantendo acesso total para `admin`.
- `RF-10` O sistema deve permitir cadastrar pessoas vinculadas a um caso, com nome, data de nascimento, marcação de `Richiedente` e observações.
- `RF-11` O sistema deve permitir editar e remover pessoas de um caso.
- `RF-12` Ao remover uma pessoa, o sistema deve remover também uniões e vínculos pai/mãe-filho associados a ela dentro do mesmo caso.
- `RF-13` O sistema deve permitir cadastrar uniões entre duas pessoas do mesmo caso.
- `RF-14` O sistema deve impedir união entre a mesma pessoa e ela própria.
- `RF-15` O sistema deve impedir cadastro duplicado de união para o mesmo par de pessoas.
- `RF-16` O sistema deve permitir editar e remover uniões existentes.
- `RF-17` O sistema deve permitir cadastrar vínculos pai/mãe-filho entre pessoas do mesmo caso.
- `RF-18` O sistema deve impedir vínculos pai/mãe-filho duplicados.
- `RF-19` O sistema deve impedir a criação de vínculos que gerem ciclo na linhagem.
- `RF-20` O sistema deve executar verificação preventiva de ciclo antes da persistência do vínculo e uma validação adicional após a gravação.
- `RF-21` O sistema deve gerar preview de layout automático da árvore para um caso com pessoas cadastradas.
- `RF-22` O preview deve retornar páginas, pessoas posicionadas, uniões, arestas e arestas de continuação entre páginas.
- `RF-23` O sistema deve identificar na visualização quais pessoas pertencem à linhagem principal e quais são cônjuges.
- `RF-24` O sistema deve permitir exportar a árvore genealógica de um caso em PDF.
- `RF-25` A exportação deve registrar histórico com autor, formato, versão de template, arquivo gerado e data de criação.
- `RF-26` O sistema deve permitir listar exportações de um caso.
- `RF-27` O sistema deve permitir baixar um PDF exportado quando o usuário tiver acesso ao caso correspondente.
- `RF-28` O frontend em modo `live` deve permitir login, listagem de casos, edição básica do caso, preview e exportação.
- `RF-29` O frontend deve oferecer um modo `mock` estático com dados fixos para demonstração da visualização da árvore, sem autenticação e sem chamadas de API.

## Requisitos Não Funcionais

- `RNF-01` A aplicação deve ser organizada em arquitetura full stack com frontend e backend separados.
- `RNF-02` A API deve usar HTTP/JSON e autenticação Bearer com JWT.
- `RNF-03` O backend deve usar FastAPI como camada de exposição da API.
- `RNF-04` A persistência deve ser implementada com SQLAlchemy ORM.
- `RNF-05` O projeto deve suportar PostgreSQL no ambiente Docker e SQLite em fluxo local/teste.
- `RNF-06` O ambiente de desenvolvimento deve poder ser executado com Docker Compose.
- `RNF-07` O frontend deve poder ser executado localmente com Vite.
- `RNF-08` O diretório de exportação deve ser configurável por variável de ambiente `EXPORT_DIR`.
- `RNF-09` As origens permitidas para CORS devem ser configuráveis por `ALLOWED_ORIGINS` e `ALLOWED_ORIGIN_REGEX`.
- `RNF-10` O sistema deve preservar segregação de acesso por caso entre usuários `admin` e `staff`.
- `RNF-11` O sistema deve aplicar integridade relacional e unicidade para e-mail de usuário, pares de união e vínculos pai/mãe-filho.
- `RNF-12` O frontend deve centralizar acesso à API e persistência do token em um cliente dedicado.
- `RNF-13` O modo `mock` deve permanecer desacoplado de autenticação e da API backend.
- `RNF-14` O preview e a exportação devem suportar paginação da árvore quando a altura do layout exceder a área de uma página.
- `RNF-15` A geração de PDF deve usar template HTML com renderização via Jinja2 e WeasyPrint.
- `RNF-16` O sistema deve disponibilizar endpoint de healthcheck para verificação básica de disponibilidade.
