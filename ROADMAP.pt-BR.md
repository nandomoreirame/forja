# Roadmap do MVP do Forja 2.0

[English](ROADMAP.md) | [Português (Brasil)](ROADMAP.pt-BR.md)

Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.

Atualizado em: 30/10/2026.

## Status atual

A [spec principal do MVP, em inglês](docs/specs/functional-mvp/SPEC.md), está aprovada. A fila contém **13 specs e planos aprovados, 65 tarefas e 60 requisitos**. A implementação dessa fila começou: **0/13 entregas concluídas; a primeira entrega está totalmente implementada (8/8 tarefas, 8/65 no total) e validada, com revisão independente pendente**.

O scaffold Electron com a tela inicial já está implementado. Ele é o ponto de partida; o fluxo RPI, os componentes shadcn compartilhados e as integrações com as CLIs continuam planejados.

O progresso combinado da documentação e da implementação é **30%**: SPEC aprovada vale 10%, PLAN pronto vale 10% e as tarefas de implementação validadas representam os 80% restantes por feature. A contagem de tarefas abaixo acompanha somente a implementação; nenhuma entrega está concluída.

## Ordem de execução

A tabela apresenta a sequência recomendada. Cada plano declara suas dependências. Uma capacidade ausente em uma CLI bloqueia o trabalho que depende dela, sem impedir a entrega web independente. A aprovação da spec e a conclusão da implementação são estados separados.

As specs e os planos técnicos vinculados abaixo permanecem em inglês, conforme o formato RPI. Seus identificadores não são traduzidos.

| Ordem | Spec                                                                                      | Plano                                                                                | Tarefas concluídas | Spec / plano      | Implementação | Validação / revisão independente |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------ | ----------------- | ------------- | -------------------------------- |
| 01    | [web-foundation-landing-styleguide](docs/specs/web-foundation-landing-styleguide/SPEC.md) | [Plano de implementação](docs/plans/2026-10-30-web-foundation-landing-styleguide.md) | 8/8                | Aprovada / pronto | Implementada  | Aprovada / pendente              |
| 02    | [cli-capability-contracts](docs/specs/cli-capability-contracts/SPEC.md)                   | [Plano de implementação](docs/plans/2026-10-30-cli-capability-contracts.md)          | 0/3                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 03    | [project-feature-state](docs/specs/project-feature-state/SPEC.md)                         | [Plano de implementação](docs/plans/2026-10-30-project-feature-state.md)             | 0/4                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 04    | [agent-settings-skills](docs/specs/agent-settings-skills/SPEC.md)                         | [Plano de implementação](docs/plans/2026-10-30-agent-settings-skills.md)             | 0/4                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 05    | [artifact-approval-gates](docs/specs/artifact-approval-gates/SPEC.md)                     | [Plano de implementação](docs/plans/2026-10-30-artifact-approval-gates.md)           | 0/5                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 06    | [feature-git-worktrees](docs/specs/feature-git-worktrees/SPEC.md)                         | [Plano de implementação](docs/plans/2026-10-30-feature-git-worktrees.md)             | 0/6                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 07    | [managed-command-runtime](docs/specs/managed-command-runtime/SPEC.md)                     | [Plano de implementação](docs/plans/2026-10-30-managed-command-runtime.md)           | 0/4                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 08    | [cli-agent-sessions](docs/specs/cli-agent-sessions/SPEC.md)                               | [Plano de implementação](docs/plans/2026-10-30-cli-agent-sessions.md)                | 0/8                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 09    | [feature-workbench-composer](docs/specs/feature-workbench-composer/SPEC.md)               | [Plano de implementação](docs/plans/2026-10-30-feature-workbench-composer.md)        | 0/5                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 10    | [document-review-reader](docs/specs/document-review-reader/SPEC.md)                       | [Plano de implementação](docs/plans/2026-10-30-document-review-reader.md)            | 0/4                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 11    | [terminal-panel-footer](docs/specs/terminal-panel-footer/SPEC.md)                         | [Plano de implementação](docs/plans/2026-10-30-terminal-panel-footer.md)             | 0/5                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 12    | [guided-rpi-orchestration](docs/specs/guided-rpi-orchestration/SPEC.md)                   | [Plano de implementação](docs/plans/2026-10-30-guided-rpi-orchestration.md)          | 0/5                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |
| 13    | [recovery-mvp-acceptance](docs/specs/recovery-mvp-acceptance/SPEC.md)                     | [Plano de implementação](docs/plans/2026-10-30-recovery-mvp-acceptance.md)           | 0/4                | Aprovada / pronto | Planejada     | Não executada / não iniciada     |

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

1. Verificar os contratos das cinco CLIs instaladas, especialmente a conexão MCP e a restrição efetiva do shell nativo.
2. Adicionar projetos por pasta, estado das features, configurações dos agentes fixos e skills somente leitura.
3. Adicionar aprovações de artefatos, worktrees por feature e execução gerenciada acompanhável.
4. Conectar os cinco adaptadores de CLI e a interface de features com compositor global.
5. Adicionar revisão de trechos de documentos, terminais do usuário, abas dos agentes e previews no footer.
6. Concluir a orquestração guiada, as rodadas limitadas de correção, a recuperação e o aceite no Linux.

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
