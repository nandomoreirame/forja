# Roadmap do MVP do Forja 2.0

[English](ROADMAP.md) | [Português (Brasil)](ROADMAP.pt-BR.md)

Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.

Atualizado em: 01/11/2026.

## Status atual

A [spec chat-workflow](docs/specs/chat-workflow/SPEC.md) (aprovada em 01/11/2026) é a mãe de todas as fatias de core; a [spec do MVP funcional](docs/specs/functional-mvp/SPEC.md) continua como registro da interface entregue. A fila contém **28 specs e planos ativos, 158 tarefas e 70 requisitos de core**. Implementação: **64/158 tarefas; 10/28 entregas implementadas e validadas, 6 delas revisadas de forma independente**. As fatias substituídas (02 a 10, 12 a 17) mantêm seus arquivos com `phase: superseded` e ficam fora destes números.

O scaffold Electron com a tela inicial já está implementado. Ele é o ponto de partida; o fluxo RPI, os componentes shadcn compartilhados e as integrações com as CLIs continuam planejados.

O progresso combinado da documentação e da implementação é **53%**: SPEC aprovada vale 10%, PLAN pronto vale 10% e as tarefas de implementação validadas representam os 80% restantes por feature. A contagem de tarefas abaixo acompanha somente a implementação; a revisão da base web e o aceite visual do usuário continuam separados.

## Ordem de execução

As fatias 01a a 01f são telas mock navegáveis, só de frontend, adicionadas em 31/10/2026. Elas rodam no renderer do desktop com uma fonte de dados mock trocável e viram as telas que as fatias do chat-workflow (02 a 17) ligam ao core. A implementação recomendada é em dois lotes sequenciais: 01a a 01c, depois 01d a 01f.

A tabela apresenta a sequência recomendada. Cada plano declara suas dependências. Uma capacidade ausente em uma CLI bloqueia o trabalho que depende dela, sem impedir a entrega web independente. A aprovação da spec e a conclusão da implementação são estados separados.

As specs e os planos técnicos vinculados abaixo permanecem em inglês, conforme o formato RPI. Seus identificadores não são traduzidos.

| Ordem | Spec | Plano | Tarefas concluídas | Spec / plano | Implementação | Validação / revisão independente |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | [web-foundation-landing-styleguide](docs/specs/web-foundation-landing-styleguide/SPEC.md) | [Plano](docs/plans/2026-10-30-web-foundation-landing-styleguide.md) | 8/8 | Aprovada / pronto | Implemented | Passed / pending |
| 01a | [project-home-screen](docs/specs/project-home-screen/SPEC.md) | [Plano](docs/plans/2026-10-31-project-home-screen.md) | 6/6 | Aprovada / pronto | Implemented | Passed / passed |
| 01b | [command-palette](docs/specs/command-palette/SPEC.md) | [Plano](docs/plans/2026-10-31-command-palette.md) | 4/4 | Aprovada / pronto | Implemented | Passed / passed |
| 01c | [new-conversation-composer](docs/specs/new-conversation-composer/SPEC.md) | [Plano](docs/plans/2026-10-31-new-conversation-composer.md) | 4/4 | Aprovada / pronto | Implemented | Passed / passed |
| 01d | [conversation-screen](docs/specs/conversation-screen/SPEC.md) | [Plano](docs/plans/2026-10-31-conversation-screen.md) | 7/7 | Aprovada / pronto | Implemented | Passed / passed |
| 01e | [settings-screen](docs/specs/settings-screen/SPEC.md) | [Plano](docs/plans/2026-10-31-settings-screen.md) | 6/6 | Aprovada / pronto | Implemented | Passed / not started |
| 01f | [document-viewer-screen](docs/specs/document-viewer-screen/SPEC.md) | [Plano](docs/plans/2026-10-31-document-viewer-screen.md) | 4/4 | Aprovada / pronto | Implemented | Passed / passed (Claude only) |
| 01g | [project-sidebar-navigator](docs/specs/project-sidebar-navigator/SPEC.md) | [Plano](docs/plans/2026-10-31-project-sidebar-navigator.md) | 6/6 | Aprovada / pronto | Implemented | Passed / passed (Claude only) |
| 01h | [conversation-agent-identity](docs/specs/conversation-agent-identity/SPEC.md) | [Plano](docs/plans/2026-10-31-conversation-agent-identity.md) | 5/5 | Aprovada / pronto | Implemented | Passed / pending |
| 01i | [workbench-ui-refresh](docs/specs/workbench-ui-refresh/SPEC.md) | [Plano](docs/plans/2026-11-01-workbench-ui-refresh.md) | 0/5 | Aprovada / pronto | Implemented (evidence tasks open) | Passed / not started |
| 01j | [ui-quick-adjustments](docs/specs/ui-quick-adjustments/SPEC.md) | [Plano](docs/plans/2026-11-01-ui-quick-adjustments.md) | 14/14 | Aprovada / pronto | Implemented | Passed / pending (no reviewer available) |
| 02 | [chat-core-store](docs/specs/chat-core-store/SPEC.md) | [Plano](docs/plans/2026-11-01-chat-core-store.md) | 0/7 | Aprovada / pronto | Planned | Not run / not started |
| 03 | [ipc-workbench-source](docs/specs/ipc-workbench-source/SPEC.md) | [Plano](docs/plans/2026-11-01-ipc-workbench-source.md) | 0/5 | Aprovada / pronto | Planned | Not run / not started |
| 04 | [cli-capability-adapters](docs/specs/cli-capability-adapters/SPEC.md) | [Plano](docs/plans/2026-11-01-cli-capability-adapters.md) | 0/10 | Aprovada / pronto | Planned | Not run / not started |
| 05 | [forja-mcp-gateway](docs/specs/forja-mcp-gateway/SPEC.md) | [Plano](docs/plans/2026-11-01-forja-mcp-gateway.md) | 0/5 | Aprovada / pronto | Planned | Not run / not started |
| 06 | [chat-turns](docs/specs/chat-turns/SPEC.md) | [Plano](docs/plans/2026-11-01-chat-turns.md) | 0/7 | Aprovada / pronto | Planned | Not run / not started |
| 07 | [artifact-publication](docs/specs/artifact-publication/SPEC.md) | [Plano](docs/plans/2026-11-01-artifact-publication.md) | 0/5 | Aprovada / pronto | Planned | Not run / not started |
| 08 | [ferreiro-orchestrator](docs/specs/ferreiro-orchestrator/SPEC.md) | [Plano](docs/plans/2026-11-01-ferreiro-orchestrator.md) | 0/8 | Aprovada / pronto | Planned | Not run / not started |
| 09 | [chat-worktrees](docs/specs/chat-worktrees/SPEC.md) | [Plano](docs/plans/2026-11-01-chat-worktrees.md) | 0/7 | Aprovada / pronto | Planned | Not run / not started |
| 10 | [test-review-loop](docs/specs/test-review-loop/SPEC.md) | [Plano](docs/plans/2026-11-01-test-review-loop.md) | 0/3 | Aprovada / pronto | Planned | Not run / not started |
| 11 | [acceptance-merge](docs/specs/acceptance-merge/SPEC.md) | [Plano](docs/plans/2026-11-01-acceptance-merge.md) | 0/6 | Aprovada / pronto | Planned | Not run / not started |
| 12 | [backlog-board-core](docs/specs/backlog-board-core/SPEC.md) | [Plano](docs/plans/2026-11-01-backlog-board-core.md) | 0/5 | Aprovada / pronto | Planned | Not run / not started |
| 13 | [terminals-runtime](docs/specs/terminals-runtime/SPEC.md) | [Plano](docs/plans/2026-11-01-terminals-runtime.md) | 0/4 | Aprovada / pronto | Planned | Not run / not started |
| 14 | [project-files-source-control](docs/specs/project-files-source-control/SPEC.md) | [Plano](docs/plans/2026-11-01-project-files-source-control.md) | 0/4 | Aprovada / pronto | Planned | Not run / not started |
| 15 | [settings-skills-usage](docs/specs/settings-skills-usage/SPEC.md) | [Plano](docs/plans/2026-11-01-settings-skills-usage.md) | 0/3 | Aprovada / pronto | Planned | Not run / not started |
| 16 | [attention-notifications](docs/specs/attention-notifications/SPEC.md) | [Plano](docs/plans/2026-11-01-attention-notifications.md) | 0/3 | Aprovada / pronto | Planned | Not run / not started |
| 17 | [recovery-acceptance](docs/specs/recovery-acceptance/SPEC.md) | [Plano](docs/plans/2026-11-01-recovery-acceptance.md) | 0/4 | Aprovada / pronto | Planned | Not run / not started |

## Primeira entrega: base web

O primeiro plano entrega um site Vite separado em `site/`, com landing e styleguide no mesmo lote de implementação:

| Página     | Inglês padrão | Português brasileiro |
| ---------- | ------------- | -------------------- |
| Landing    | `/`           | `/pt-br`             |
| Styleguide | `/styleguide` | `/pt-br/styleguide`  |

Essas rotas estão implementadas e publicadas; veja o status da landing abaixo. O site e o Electron utilizarão os mesmos componentes shadcn/ui customizados e tokens Tailwind. Os previews terão mocks determinísticos no idioma da página, incluindo agentes, mensagens, estados e botões. Comandos, caminhos e nomes das ferramentas permanecem intactos. A galeria funciona sem efeitos de Electron, IA, Git ou terminais nativos.

A implementação deve seguir as [referências visuais e exceções aprovadas](docs/design/forja-2.0/component-fidelity.md). A publicação está disponível com `npm run deploy:site`.

### Status da landing page

- **Publicada:** https://forjav2.web.app com `/`, `/pt-br`, `/styleguide` e `/pt-br/styleguide`. Para publicar, use `npm run deploy:site` (projeto Firebase `ascode-e08f8`, site de hosting `forjav2`).
- **Implementado:** landing bilíngue com as sete seções aprovadas, troca de idioma na mesma página, recortes aprovados do Stitch no hero e nas funcionalidades planejadas, cabeçalho e rodapé para mobile, favicon; styleguide bilíngue com os componentes compartilhados.
- **Testes:** 40 testes unitários e 6 testes E2E com Playwright passam. A baseline visual do styleguide ainda precisa de revisão humana.
- **Pendente:** revisão de fidelidade ao Stitch bloco a bloco no styleguide (seções 2, 3, 5 e 6) e na landing; as versões em inglês dos recortes e o hero ainda mostram textos da interface em português; revisão independente. As 8 tarefas do plano estão implementadas e validadas; a entrega só conta como concluída depois dessa revisão.

## Entregas seguintes

1. Persistir chats, itens de backlog e histórico no core (02) e servi-los ao renderer por IPC (03).
2. Verificar as cinco CLIs e normalizar seus fluxos (04); adicionar o gateway MCP com escopo e o executor gerenciado (05).
3. Rodar turnos reais por chat (06) e publicar, validar e aprovar os resultados (07).
4. Deixar o Ferreiro orquestrar as fases, com avanço automático após aprovações (08).
5. Implementar em worktrees próprios (09), ciclar teste e revisão (10), aceitar com preview rodando e fazer o merge (11).
6. Tornar backlog e Board reais (12), concluir terminais (13), arquivos e controle de versão (14), configurações e uso (15), atenção (16) e então recuperação e aceite ao vivo (17).

## Regras de status

- **Planejada:** spec aprovada e plano pronto; implementação ainda não concluída.
- **Em andamento:** implementação iniciada, com tarefas restantes e falhas visíveis.
- **Bloqueada:** uma dependência externa identificada impede o trabalho correspondente. Registrar o bloqueio e continuar o trabalho independente quando autorizado.
- **Implementada:** o código previsto existe. Isso não significa que foi validado ou revisado de forma independente.
- **Entregue:** todas as tarefas e verificações exigidas passaram, a revisão independente está registrada e as evidências de aceite continuam válidas.

Manter o `docs/specs/<slug>/STATE.md`, este roadmap e o resumo de progresso do [README em português](README.pt-BR.md) consistentes. Atualizar a contagem de tarefas somente após sua conclusão real. Uma verificação de CLI ausente ou ignorada não conta como aprovada; a validação do implementador não substitui a revisão independente.

Os arquivos STATE.md acompanham o desenvolvimento do próprio Forja. O produto guardará o estado dos projetos do usuário como JSON no SQLite, sem criar arquivos STATE.md de runtime nesses projetos.

## Critérios de aceite

- TDD e testes por tarefa; lint, typecheck com o compilador local e builds relevantes.
- Integração com SQLite, Git, processos e PTYs reais em recursos temporários.
- Verificações no navegador para as quatro rotas e os mocks nos dois idiomas.
- Comparação visual com componentes e telas aprovados, além de teclado e foco.
- Testes de ponta a ponta no Electron para features paralelas destinadas a repositórios diferentes, invalidação de aprovações, correções vinculadas, interrupção/fila, terminais e restauração.
- Evidências autenticadas de execução controlada para Claude Code, Codex, OpenCode, agy e Grok antes de declarar suporte completo às cinco CLIs.

## Referências

- [README em português](README.pt-BR.md).
- [Spec principal aprovada, em inglês](docs/specs/functional-mvp/SPEC.md).
- [Índice dos planos e comandos de implementação, em inglês](docs/plans/README.md).
- [Mapa de requisitos e tarefas, em inglês](docs/plans/requirement-map.md).
- [Validação do planejamento, em inglês](docs/plans/VALIDATION.md).

Onboarding, agentes personalizados, aprovações autônomas, base de conhecimento do projeto, homologação de outros sistemas operacionais e publicação automática ficam fora deste MVP.
