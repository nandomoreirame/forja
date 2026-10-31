Crie EXATAMENTE UMA variante desktop da tela existente "Forja 2.0 - Projeto aberto (Terminal Noir)", source screen 02e65671524b4ea8ade154cb310d66ff, neste mesmo projeto. Nome da nova tela: "Forja 2.0 - Feature em execução - MVP Guiado". Preserve a tela original. Não gere outras telas nem alternativas.

REGRA PRINCIPAL, OBRIGATÓRIA:
Siga estritamente o que JÁ FOI CRIADO neste projeto como padrão. Reutilize o design system Terminal Noir (assets/5b9c6324d3984091bd92105445a6e550) e a composição da tela de referência: topbar, sidebar esquerda, painel central, painel Git à direita, campo de chat e statusbar. Isto é uma evolução pontual do produto existente, NÃO um redesign. NÃO use o design system Technical Precision Dark: RPI aqui significa Research, Plan, Implement, não Raspberry Pi.
Mantenha JetBrains Mono, fundo quase preto neutro, superfícies discretas, divisórias finas, ícones lineares pequenos, âmbar #F5A623 somente nos estados ativos e ações principais. Mesmas dimensões e densidade da referência, desktop 1280 x 1024 em pixels lógicos. Sem novos estilos, gradientes, ilustrações, mascotes, fotos, avatares, sombras decorativas ou grandes títulos.

ELEMENTOS A PRESERVAR:

1. Topbar existente: marca FORJA v2.0 à esquerda, command bar com nome "dev" e dica Ctrl+Shift+P, engrenagem de configurações à direita. SEM setas voltar/avançar. Não adicionar controles de janela, barra de navegação, segundo cabeçalho global ou menus novos.
2. Sidebar esquerda com largura e estilo existentes: pasta aberta "dev"; seções dos cinco agentes fixos, especificações, planos e habilidades. Acrescente somente a seção "REVISÕES", usando exatamente o mesmo padrão das outras seções. Não adicione botão de criar agente, instalar skills ou onboarding. O vínculo existente de editar agentes pode se chamar "Configurar agentes".
3. Painel Git à direita: reutilize o painel atual; apenas preencha com o repositório, worktree e branch da feature ativa. Não invente um novo painel de métricas, diff ou terminal.
4. Statusbar: manter padrão existente, altura 32px e texto legível de aproximadamente 13px; pasta aberta ~/dev à esquerda e UTF-8 à direita.

ALTERAÇÕES SOLICITADAS, SOMENTE ESTAS:
A. ABAS POR FEATURE:
Substitua a aba genérica "Conversa" por duas abas no topo do painel central.

- Ativa: "Login com OAuth", indicador discreto "Implementer em execução".
- Inativa: "Busca no catálogo", indicador discreto "Aguardando aprovação".
Cada aba representa uma feature inteira, não um agente. O nome é renomeável; não desenhe menu de rename aberto, botão extra de rename ou outras abas.
Um indicador pequeno de atividade/estado basta, sem texto excessivo e sem ícones novos de funções não pedidas.

B. CONTEXTO DA FEATURE:
Imediatamente abaixo das abas, uma faixa compacta dentro do painel central, sem cards:
"Login com OAuth" e "Guiado".
"Destino: ~/dev/projects/forja" e "Branch: feature/login-oauth".
Uma linha discreta de etapas: "Research ✓  →  Planner ✓  →  Implementer •  →  Tester  →  Reviewer".
A linha mostra andamento, não são mais cinco abas.
O diretório aberto na janela é ~/dev. O destino Git desta feature é ~/dev/projects/forja. NÃO confundir os dois.
Outra feature pode apontar a outro repositório. Não colocar seletor de projeto no compositor.

C. SIDEBAR NO CONTEXTO DA FEATURE ATIVA:
Agentes fixos, sempre estes cinco: "Pesquisador", "Planejador", "Implementador", "Testador", "Revisor". Implementador selecionado e "Executando"; demais estados discretos. Não criar agentes.
ESPECIFICAÇÕES: "login-oauth/SPEC.md" com status "Aprovada".
PLANOS: "login-oauth.md" com status "Aprovado".
REVISÕES: "login-oauth.md" com status "Correção solicitada".
HABILIDADES: "rpi-implement", "test-driven-development", "git". Visualização somente leitura, SEM adicionar/editar skills.
Os artefatos ficam em ~/dev/docs; o destino Git permanece outro diretório.
Usar linhas compactas, NÃO transformar listas em cards.

D. CONVERSA E RASTREABILIDADE:
O painel central apresenta o histórico do agente Implementador na feature "Login com OAuth". Reutilize o estilo de mensagens das telas existentes de agentes ativos.
Use SOMENTE estas três entradas de exemplo, sem inventar respostas, métricas, ferramentas ou conteúdos extras:

1. Usuário: "Corrija o cenário de token expirado seguindo o plano aprovado."
2. Evento compacto de rastreabilidade: "Testador solicitou correção · Rodada 1 de 3" com link textual "Ver solicitação".
3. Implementador: "Estou corrigindo o tratamento de token expirado e adicionando o teste de regressão."
Estado discreto "Executando" e ação "Interromper", sem logs inventados.
A conversa do Testador é acessível pelo link e pela sidebar DENTRO da mesma feature; não desenhar uma nova aba principal de agente.
Limite de três rodadas automáticas existe, mas não criar um dashboard para isso.
Spec e plano aprovados são pré-requisitos. Não exibir botão para ignorar aprovação ou aprovar automaticamente.

E. COMPOSITOR GLOBAL ÚNICO:
Reutilize a aparência do campo de chat existente, mas posicione-o FIXO/FLUTUANTE na parte inferior da área central, logo acima da statusbar, com margem pequena. NÃO centralizar verticalmente como na tela antiga.
Deixe espaço reservado para o histórico não ficar escondido. Não cobrir a sidebar nem o painel Git.
Esse é o ÚNICO campo de envio da aplicação e permanece no mesmo lugar quando o usuário abre documentos ou configurações. Não desenhar outros campos de chat por agente ou por mensagem.
Dentro do compositor:

- Combobox compacto "Implementador" com chevron, estilo coerente com o projeto; esse é o seletor de DESTINATÁRIO, não um seletor de modelo.
- Identificação discreta "Login com OAuth".
- Placeholder EXATO: "Envie uma instrução, @ para selecionar um agente".
- Rodapé do campo: "Ctrl+Enter para enviar" e botão âmbar "Enviar".
- Diretório destino legível "~/dev/projects/forja" em metadado compacto do compositor.
O combobox está FECHADO nesta tela. Não desenhar dropdown aberto nem opções extras.
O destinatário acompanha o agente ativo da feature selecionada. Outra aba em execução não muda essa seleção.
Não adicionar upload, microfone, ditado, Turbo, anexos, escolha de modelo, escolha de projeto, contador de tokens ou ações / não solicitadas.

F. PAINEL GIT EXISTENTE:
Repositório: "forja".
Diretório: "~/dev/projects/forja".
Worktree: "~/dev/projects/forja/.worktrees/login-oauth".
Branch: "feature/login-oauth".
Destino: "release/2.0".
Estado: "Em implementação".
Não desenhar merge/push automático, botão de deploy, commit automático ou aprovações de integração que não estão sendo solicitadas nesta tela.

PROIBIÇÕES FINAIS:
NÃO criar nenhuma função, tela, seção, texto, botão ou decoração além do que foi explicitamente pedido.
NÃO criar onboarding, tela de configurações, leitor de documento, popup de seleção de texto, dashboard, Kanban, terminal, editor de código, painel de analytics, menu de notificações ou modo Agêntico.
NÃO redesenhar a topbar, sidebar, compositor e painel Git. Apenas aplicar as alterações listadas.
NÃO tratar agentes como abas principais. Cada aba principal é uma feature com fluxo RPI próprio.
NÃO adicionar conteúdo de exemplo além dos textos definidos acima.
Se houver ambiguidade, preserve o componente atual e faça a menor adaptação possível.
Entregue somente UMA tela desktop, mantendo o padrão existente.

## Resultado

- [Tela gerada no Stitch](https://stitch.withgoogle.com/projects/9281162402489678867/screens/b1e7dc73f23d4af5b81d37d978ef4b68).
- Tela original preservada. Variante única gerada com modo REFINE.
- Validação humana pendente. A imagem ainda introduziu marcadores com iniciais e horário nas mensagens, apesar das restrições; esses detalhes não estão aprovados como requisitos do MVP.
