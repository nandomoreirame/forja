# Forja

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.

![Tela inicial do Forja com barra de comandos, atalhos de projeto e status da pasta aberta](docs/images/welcome.png)

**Scaffold inicial:** a tela de boas-vindas é uma prévia estática. As integrações com IA ainda não foram implementadas.

## Por que existe

Trabalhar com agentes de IA envolve decisões, especificações, planos, alterações de código, testes e revisões que precisam continuar conectados.
O Forja é opinativo sobre o fluxo RPI: o Pesquisador entende o problema, o Planejador transforma a spec aprovada em plano e o Implementador trabalha a partir desse plano antes dos testes e da revisão.
Você permanece no controle de cada etapa, com aprovações explícitas e execução visível.
As CLIs de programação instaladas são ferramentas de execução desse fluxo. O repositório atual fornece o scaffold; o MVP guiado está aprovado e planejado.

## Progresso

O progresso inclui a documentação e a implementação: **SPEC 10% + PLAN 10% + tarefas de implementação validadas 80%** por feature.

**MVP completo:** `████░░░░░░░░░░░░░░░░` **20%**. As 13 specs estão aprovadas e os 13 planos estão prontos. A implementação tem **8/62 tarefas** concluídas na primeira entrega (landing e styleguide, revisão independente pendente), com **0/13 entregas concluídas**.

| Ordem | Feature                             | SPEC (10%)                                                       | PLAN (10%)                                                           | Implementação (80%)    | Progresso                      |
| ----- | ----------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------- | ------------------------------ |
| 01    | `web-foundation-landing-styleguide` | [Aprovada](docs/specs/web-foundation-landing-styleguide/SPEC.md) | [Pronto](docs/plans/2026-10-30-web-foundation-landing-styleguide.md) | 8/8 (revisão pendente) | `████░░░░░░░░░░░░░░░░` **20%** |
| 02    | `cli-capability-contracts`          | [Aprovada](docs/specs/cli-capability-contracts/SPEC.md)          | [Pronto](docs/plans/2026-10-30-cli-capability-contracts.md)          | 0/3                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 03    | `project-feature-state`             | [Aprovada](docs/specs/project-feature-state/SPEC.md)             | [Pronto](docs/plans/2026-10-30-project-feature-state.md)             | 0/4                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 04    | `agent-settings-skills`             | [Aprovada](docs/specs/agent-settings-skills/SPEC.md)             | [Pronto](docs/plans/2026-10-30-agent-settings-skills.md)             | 0/4                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 05    | `artifact-approval-gates`           | [Aprovada](docs/specs/artifact-approval-gates/SPEC.md)           | [Pronto](docs/plans/2026-10-30-artifact-approval-gates.md)           | 0/5                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 06    | `feature-git-worktrees`             | [Aprovada](docs/specs/feature-git-worktrees/SPEC.md)             | [Pronto](docs/plans/2026-10-30-feature-git-worktrees.md)             | 0/4                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 07    | `managed-command-runtime`           | [Aprovada](docs/specs/managed-command-runtime/SPEC.md)           | [Pronto](docs/plans/2026-10-30-managed-command-runtime.md)           | 0/4                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 08    | `cli-agent-sessions`                | [Aprovada](docs/specs/cli-agent-sessions/SPEC.md)                | [Pronto](docs/plans/2026-10-30-cli-agent-sessions.md)                | 0/7                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 09    | `feature-workbench-composer`        | [Aprovada](docs/specs/feature-workbench-composer/SPEC.md)        | [Pronto](docs/plans/2026-10-30-feature-workbench-composer.md)        | 0/5                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 10    | `document-review-reader`            | [Aprovada](docs/specs/document-review-reader/SPEC.md)            | [Pronto](docs/plans/2026-10-30-document-review-reader.md)            | 0/4                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 11    | `terminal-panel-footer`             | [Aprovada](docs/specs/terminal-panel-footer/SPEC.md)             | [Pronto](docs/plans/2026-10-30-terminal-panel-footer.md)             | 0/5                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 12    | `guided-rpi-orchestration`          | [Aprovada](docs/specs/guided-rpi-orchestration/SPEC.md)          | [Pronto](docs/plans/2026-10-30-guided-rpi-orchestration.md)          | 0/5                    | `████░░░░░░░░░░░░░░░░` **20%** |
| 13    | `recovery-mvp-acceptance`           | [Aprovada](docs/specs/recovery-mvp-acceptance/SPEC.md)           | [Pronto](docs/plans/2026-10-30-recovery-mvp-acceptance.md)           | 0/4                    | `████░░░░░░░░░░░░░░░░` **20%** |

Cada barra vai de 0 a 100%. A parcela de implementação é proporcional às tarefas validadas de cada feature: `10 × spec aprovada + 10 × plano pronto + 80 × (tarefas concluídas / total de tarefas)`. O progresso geral pondera os percentuais das features pela quantidade de tarefas de implementação, para preservar o peso de cada entrega. Revisão independente e aceite final continuam sendo critérios separados; progresso não significa entrega aprovada.

O scaffold Electron e a tela inicial estática já estão implementados e não entram nessa nova fila. A primeira entrega planejada reúne a landing bilíngue e o styleguide shadcn/Tailwind compartilhado em `site/`, com mocks do produto localizados.

### Status da landing page

- **Publicada:** https://forjav2.web.app com `/`, `/pt-br`, `/styleguide` e `/pt-br/styleguide`. Para publicar, use `npm run deploy:site` (projeto Firebase `ascode-e08f8`, site de hosting `forjav2`).
- **Implementado:** landing bilíngue com as sete seções aprovadas, troca de idioma na mesma página, recortes aprovados do Stitch no hero e nas funcionalidades planejadas, cabeçalho e rodapé para mobile, favicon; styleguide bilíngue com os componentes compartilhados.
- **Testes:** 30 testes unitários e 6 testes E2E com Playwright passam. A baseline visual do styleguide ainda precisa de revisão humana.
- **Pendente:** revisão de fidelidade ao Stitch bloco a bloco no styleguide (seções 2, 3, 5 e 6) e na landing; as versões em inglês dos recortes e o hero ainda mostram textos da interface em português; revisão independente. O contador de implementação do plano continua em 0/8 até essa revisão ser concluída.

Consulte o [roadmap em português](ROADMAP.pt-BR.md) para ver a ordem e os status de validação e revisão. O [índice dos planos, em inglês](docs/plans/README.md), contém as dependências e os comandos de implementação. As specs e os planos técnicos vinculados na tabela permanecem em inglês.

## Instalação

Requer Node.js 24 ou superior, npm e um ambiente gráfico compatível com Electron.
Execute os comandos na raiz do repositório:

```sh
npm install
npm run dev
```

A janela Electron abre na tela inicial. Esta prévia não exige conta de provedor nem chave de API.

## Uso

A tela inicial mostra ações de projeto, barra de comandos, configurações e status da pasta aberta.
Os controles têm feedback ao passar o mouse e cursor de mão, mas cliques e atalhos ainda não executam ações.

Para conferir somente a interface no navegador:

```sh
npm run dev:web
```

Abra a URL local informada pelo Vite. Essa prévia não inicia o núcleo nem cria um banco de dados.

## Arquitetura

| Área                | Implementação atual                                        |
| ------------------- | ---------------------------------------------------------- |
| Aplicativo desktop  | Electron, electron-vite, electron-builder                  |
| Interface           | React, TypeScript, CSS Modules e tokens semânticos         |
| Ícones e tipografia | Lucide e JetBrains Mono distribuída localmente             |
| Núcleo              | Utility process separado do Electron                       |
| Persistência        | SQLite via `node:sqlite`, WAL e migrations SQL versionadas |
| Contratos           | Validação Zod na fronteira de mensagens do núcleo          |
| Testes              | Vitest e Testing Library                                   |

Radix e Zustand estão instalados para as próximas telas; a tela inicial estática ainda não os utiliza.
Os adaptadores de IA definem somente interfaces TypeScript. Execução de sessões, conexões MCP, aprovações, armazenamento de credenciais, backups e atualizações automáticas ainda não foram implementados.
O renderer ainda não se comunica com o contrato de saúde do núcleo.

O repositório contém atualmente um aplicativo desktop. A próxima entrega aprovada adiciona `site/` para a landing e a galeria de componentes. Ela permanece no mesmo repositório para compartilhar componentes de UI e tokens com o Electron, sem introduzir outro serviço de backend ou workspace npm.

```text
src/
  main/          Janela e ciclo de vida do aplicativo
  preload/       Reservado para uma API desktop restrita
  core/          SQLite, mensagens do núcleo e interfaces dos adaptadores de IA
  shared/        Contratos de comunicação validados
  renderer/src/
    app/         Estrutura do aplicativo e composição da tela
    shared/      Tokens visuais e UI reutilizável
test/           Testes de componentes, validação de entradas e banco
```

## Desenvolvimento

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

O build gera arquivos em `out/`. Há configurações de instaladores para Linux AppImage, Windows NSIS e macOS DMG, mas o empacotamento e a distribuição ainda não foram validados.

## Segurança

O renderer usa sandbox e context isolation, com integração Node.js desabilitada.
O preload não expõe APIs desktop. Novas janelas e navegação externa são bloqueadas.
A interface atual não chama provedores de IA, executa CLIs de programação nem armazena credenciais.

O núcleo grava `forja.db` no diretório de dados do aplicativo Electron. Em desenvolvimento, usa o diretório separado `Forja Dev`.
O banco não está criptografado. Não armazene segredos neste scaffold.

A prévia web escuta na interface de loopback, na porta informada pelo Vite, sem autenticação.
Os servidores de desenvolvimento são apenas para uso local. O aplicativo empacotado não inicia um servidor HTTP.
Relate problemas de segurança de forma privada ao mantenedor, sem incluir credenciais ou arquivos sensíveis.

## Licença

A licença do projeto ainda não foi definida. Nesta etapa, não há concessão de licença para o código do projeto; as dependências mantêm suas respectivas licenças.
