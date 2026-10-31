Crie EXATAMENTE UMA nova prancha/tela desktop intitulada "Forja 2.0 - Styleguide e componentes - MVP", neste projeto. Use como fontes visuais as telas APROVADAS b1e7dc73f23d4af5b81d37d978ef4b68 (execução), a486490d997146329aa2b82c637c98ee (configurações) e 2551431dbc994626a9fd20cd8290a8d7 (terminais). Preserve todas as telas originais.

OBJETIVO:
Extrair e apresentar ISOLADAMENTE os componentes bases e composições importantes que JÁ EXISTEM nos desenhos do Forja, com dados mockados simples e estados visíveis. Esta será a referência para uma galeria de componentes implementada ANTES das telas funcionais, em React + TypeScript + shadcn/ui + Tailwind CSS. NÃO é um redesign, dashboard ou nova função do produto.
Shadcn/ui fornece a base comportamental; os componentes DEVEM ser customizados para reproduzir os desenhos aprovados. NÃO aplicar o tema padrão de shadcn nem transformar o Forja em um dashboard genérico.

FIDELIDADE OBRIGATÓRIA:

- Terminal Noir, JetBrains Mono local, preto neutro, cinzas sutis, divisórias 1px e âmbar #F5A623 nos focos/ações existentes.
- Adotar as formas e proporções REAIS dos componentes das telas aprovadas, incluindo os pequenos raios existentes; NÃO reinterpretar como zero-radius brutalista ou rounded/pill genérico.
- Ícones lineares coerentes com Lucide, sem Material Symbols, emojis, fotos, ilustrações ou avatares com iniciais.
- Mesmo tamanho aparente da tipografia e densidade das telas. Corpo 13px, metadados 11px, ações/input aproximadamente 32px quando compatível com a referência; topbar 40px e statusbar 32px.
- Preservar estilo atual de topbar, sidebar, chat, formulários, abas e terminal.
- Sem gradientes, efeitos decorativos, grandes títulos, marketing, cards excessivos ou cores novas.
- Todas as amostras são MOCKS VISUAIS, sem chamadas de IA, shells reais ou comandos executados.
- Texto da interface em português brasileiro; nomes de componentes e tokens em inglês são rótulos técnicos da galeria.

FORMATO DA PRANCHA:
Uma única página de styleguide desktop, largura lógica 1280px, verticalmente rolável conforme necessário. NÃO espremer tudo dentro de 1024px nem gerar múltiplas telas. Fundo idêntico ao app. Cabeçalho compacto "Styleguide" e subtítulo "Componentes do MVP · Terminal Noir".
Amostras agrupadas nas SETE seções abaixo, separadas por divisórias simples, com componente e rótulo técnico. Os componentes aparecem separados, não montar uma nova tela de execução inteira. Manter estados lado a lado quando couber. Não adicionar navegação, filtros, busca, temas, exportação ou botões da própria galeria.

SEÇÃO 1: TOKENS
Swatches pequenos, com nome e valor:
canvas #0E0E0E
chrome #1C1C1C
surface #121214
overlay #18181B
border #2A2A2A
foreground #E6E6E6
muted #979797
accent #F5A623
Esses valores servem de referência para mapear os tokens semânticos de Tailwind/shadcn. NÃO desenhar um editor de tokens.
Amostras JetBrains Mono: body 13px, metadata 11px, label 12px, heading compacto 18px.
Espaçamento: 4, 8, 12, 16, 24 e 32px. Raios discretos de 3/4px para controles e o raio do compositor igual ao desenho aprovado.
Se houver leve diferença entre estes tokens e uma tela antiga, preferir o scaffold atual para os tokens e a anatomia das telas aprovadas para os componentes, sem inventar terceiro padrão.

SEÇÃO 2: PRIMITIVAS, SHADCN/UI + TAILWIND

- Button: primário "Salvar alterações"; secundário "Parar processo"; ghost "Ver solicitação"; botão só com ícone de engrenagem. Amostras default, hover, focus-visible, disabled e loading. O hover é uma amostra estática identificada, sem reinventar cores. Disabled deve comunicar indisponibilidade real; não reproduzir o artifício temporário de desabilitar todos os botões do scaffold.
- Input: label "Modelo", placeholder "Usar o padrão da ferramenta", estados default, foco, disabled e erro "Informe um valor válido".
- Textarea: label "Instruções adicionais", placeholder já existente.
- Select/Combobox: "Agente: Implementador" e "Ferramenta de IA: Codex". Mostrar uma amostra FECHADA e apenas UM menu ABERTO do seletor de agente com cinco opções: Pesquisador, Planejador, Implementador, Testador, Revisor. Item Implementador selecionado, sem criar agente ou opções extra.
- Checkbox: "rpi-implement" marcado e "git" desmarcado.
- Switch: "Invocar próximo agente automaticamente" desligado e "Interromper ao enviar uma nova mensagem" ligado.
- Badge/StatusIndicator: "Aprovada", "Rascunho", "Desatualizada", "Aguardando aprovação", "Em execução", "Concluído", "Falhou", "Interrompido". Estados identificados por texto/ícone, não apenas cor. Loading discreto só para execução ativa.
- Kbd: Ctrl+Enter e Ctrl+Shift+P.
Não adicionar calendários, charts, tabelas administrativas, sliders, carrosséis ou componentes que o MVP não usa.

SEÇÃO 3: ESTRUTURA DO APP, AMOSTRAS ISOLADAS

- Topbar: fragmento compacto idêntico ao aprovado, FORJA v2.0, command bar "dev", engrenagem. Sem setas esquerda/direita.
- FeatureTabs: "Login com OAuth" ativa e "Busca no catálogo" inativa. São features, NÃO agentes. Mostrar nome, estado, hover e focus em amostras discretas; não desenhar editor de rename aberto.
- SidebarRow: agente Implementador selecionado, "Executando"; documento login-oauth/SPEC.md com status "Aprovada"; skill rpi-implement somente leitura. Uma linha de cada, sem repetir sidebar inteira.
- FeatureContext: "Login com OAuth", "Guiado", "Destino: ~/dev/projects/forja", "Branch: feature/login-oauth", linha Research -> Planner -> Implementer -> Tester -> Reviewer.
- Statusbar: altura 32px, ~/dev e UTF-8. Não acrescentar métricas.

SEÇÃO 4: CONVERSA E COMPOSITOR

- Message: uma mensagem simples do usuário e uma do Implementador, sem avatars, iniciais ou horários inventados. Texto mock: "Corrija o cenário de token expirado." e "Vou corrigir o cenário e executar os testes."
- HandoffLink: "Testador solicitou correção · Rodada 1 de 3" com "Ver solicitação".
- Composer: copiar EXATAMENTE a anatomia do compositor global aprovado; combobox Implementador, contexto Login com OAuth, diretório de destino; placeholder "Envie uma instrução, @ para selecionar um agente"; Ctrl+Enter e Enviar.
Uma única amostra de compositor basta. Não adicionar upload, microfone, anexos, Turbo ou seletor de modelo.
- InlineNotice: estado vazio "Nenhuma conversa nesta feature." e erro "Não foi possível iniciar a ferramenta." em duas amostras compactas, sem inventar fluxo de recuperação.

SEÇÃO 5: DOCUMENTOS E APROVAÇÃO

- DocumentHeader: "SPEC.md", "Rascunho", ação "Aprovar spec". Ação fica na galeria como componente, não altera o estado real.
- MarkdownPreview: amostra pequena com título "Objetivo", parágrafo, lista de tarefas, tabela de duas colunas e bloco de código. Apenas exemplos técnicos curtos.
- MermaidPreview: diagrama simples renderizado "Research -> Planner -> Implementer", sem fonte Mermaid exposta como se fosse diagrama pronto.
- SelectionPopover: um trecho do parágrafo selecionado e ação EXATA "Revisar com o agente". NÃO enviar sozinho ou criar editor rich-text.
- ApprovalNotice: "Plano bloqueado: aprove a spec para continuar." Sem ignorar bloqueio, aprovação automática ou novos botões.
Não gerar a tela inteira de leitor de documentos.

SEÇÃO 6: TERMINAIS, SEGUINDO O AJUSTE DO USUÁRIO

- TerminalTabs: ícone de JANELA DE TERMINAL à esquerda de CADA aba; "Implementador · testes" Concluído, "Implementador · dev" Em execução e "zsh" (shell manual). O shell é apenas exemplo do padrão do usuário, não uma escolha fixa do app.
- Botão + à DIREITA da faixa para abrir outro shell manual e seta para baixo para recolher. Esse + FOI explicitamente aprovado, não o remover.
- AgentExecution: metadados Agente: Implementador, Via MCP do Forja, CWD e Comando: npm run dev. Botão "Parar processo". CWD completo em linha própria ou quebra legível, SEM truncar em "~/d…". Saída somente leitura com "Processo iniciado. Aguardando saída...".
- UserTerminal: pequena amostra SEPARADA, aba zsh e prompt "~/.worktrees/login-oauth %", sem comando executado e sem agente digitando nele.
- CollapsedTerminalToolbar: amostra do painel RECOLHIDO no footer, com itens individuais dos mesmos três terminais. Loading no dev, concluído nos testes e ocioso no zsh. Hover sobre dev mostra pequeno tooltip com agente, comando, diretório completo e estado. Clique conceitualmente reabre a aba exata; não desenhar outro painel extra para isso.
- Recolher não encerra processos. Não usar lixeira ou close como se fosse a seta para baixo.
NÃO adicionar SSH, split terminal, perfil de shell, seleção de shell, logs de sucesso inventados ou novas funcionalidades.

SEÇÃO 7: NOTAS DE FIDELIDADE, CURTAS
Texto exato:
"Reutilizar estes componentes nas telas."
"Referências aprovadas definem a anatomia; requisitos do MVP definem o comportamento."
"Não copiar extras inventados pelo Stitch."
"Validar hover, foco, teclado, loading, disabled, vazio e erro."
Sem novos componentes nesta seção.

ENTREGA:
EXATAMENTE UMA prancha de styleguide com as sete seções e componentes isolados com mocks simples. Preservar as telas originais. Não criar fluxos novos, configurações adicionais, temas ou um produto de gerenciamento de design systems.
Não criar nada fora deste inventário. O objetivo é remover decisões visuais improvisadas durante a implementação, não expandir o MVP.

## Resultado

- [Styleguide no Stitch](https://stitch.withgoogle.com/projects/9281162402489678867/screens/5cae4de038e748b7a1a0f06f6f332da3).
- A geração continuou no servidor após erro de conexão; o resultado foi localizado por consulta, sem reenviar o pedido.
- Aprovação visual pendente. A implementação deverá usar shadcn/ui e Tailwind, com as exceções de fidelidade documentadas no planejamento.
