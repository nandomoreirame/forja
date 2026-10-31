Crie EXATAMENTE UMA nova variante desktop da tela APROVADA "Forja 2.0 - Feature em execução - MVP Guiado", source screen b1e7dc73f23d4af5b81d37d978ef4b68, neste mesmo projeto. Título: "Forja 2.0 - Feature em execução com terminais - MVP Guiado". Preserve integralmente a tela original. NÃO alterar a tela de configurações.

REGRA ABSOLUTA:
Siga rigorosamente o design JÁ CRIADO. Reutilize Terminal Noir, JetBrains Mono, preto neutro, superfícies discretas, divisórias finas e âmbar #F5A623. Mesma resolução desktop 1280x1024 lógica. NÃO criar outro design system. RPI é Research, Plan, Implement, não Raspberry Pi. Não inventar nada além do pedido.

PRESERVAR SEM REDESIGN:

- Topbar FORJA v2.0, command bar "dev" com Ctrl+Shift+P e engrenagem, sem voltar/avançar.
- Sidebar esquerda "dev", os cinco agentes fixos, documentos de ESPECIFICAÇÕES, PLANOS, REVISÕES e catálogo HABILIDADES somente leitura.
- Abas de FEATURE: "Login com OAuth" ativa e "Busca no catálogo" inativa. NÃO converter em abas principais de agentes ou terminais.
- Contexto da feature, linha de etapas Research -> Planner -> Implementer -> Tester -> Reviewer.
- Painel Git à direita e seus metadados.
- Histórico existente do Implementador com as mesmas mensagens e evento "Testador solicitou correção · Rodada 1 de 3" e link "Ver solicitação". Não criar mensagens novas ou avatares.
- Statusbar 32px na base da janela: ~/dev à esquerda, UTF-8 à direita.

ÚNICA MUDANÇA ESTRUTURAL:
Acrescentar um painel inferior recolhível "Terminal", SOMENTE dentro da área central, com abas para shell manual e execuções MCP do agente. Mantenha o ÚNICO compositor global da tela aprovada, sempre visível imediatamente ACIMA desse painel.

ORDEM VERTICAL OBRIGATÓRIA NA ÁREA CENTRAL:

1. Abas de features existentes.
2. Contexto da feature e linha RPI.
3. Histórico da conversa, rolável.
4. Compositor global compacto, fixo na base da área de conversa, ACIMA do painel Terminal.
5. Painel Terminal aberto com aproximadamente 240px de altura lógica, logo acima da statusbar.
6. Statusbar existente na base de toda a janela.
Reservar espaço real para compositor e terminal. Sem sobrepor ou esconder histórico, sidebar, painel Git, botões ou statusbar. NÃO estender o terminal sobre a largura da sidebar ou do painel Git.
O histórico pode ocupar menos altura; NÃO aumentar arbitrariamente a altura da tela ou colocar o terminal fora da viewport. O painel fica aberto nesta variante; desenhe apenas um controle discreto para recolhê-lo.

COMPOSITOR GLOBAL:
Preservar componentes, textos e aparência do aprovado. Reduzir apenas a altura ociosa se necessário para caber com o terminal.

- Combobox fechado "Implementador", contexto "Login com OAuth", destino "~/dev/projects/forja".
- Placeholder EXATO "Envie uma instrução, @ para selecionar um agente".
- Dica "Ctrl+Enter para enviar" e botão âmbar "Enviar".
- O compositor envia instruções ao agente. NÃO é um terminal, não recebe prompt de shell e não deve ser duplicado em cada aba de execução.
- Não adicionar modelo, upload, microfone, Turbo ou controles não pedidos.

PAINEL TERMINAL, SOMENTE ELEMENTOS PEDIDOS:
Cabeçalho compacto "Terminal".
Três abas internas, nesta ordem:

- "Terminal" (shell manual do usuário, inativa).
- "Implementador · testes" (inativa, status textual "Concluído").
- "Implementador · dev" (ATIVA, status textual "Em execução").
As abas de terminal pertencem à feature "Login com OAuth". Ao alternar feature, aparecem os terminais da outra feature, sem misturar diretórios ou saídas.
Não desenhar janela nova, popup, segunda tela ou três painéis simultâneos. Mostrar apenas o conteúdo da aba ativa "Implementador · dev".
Não inventar botão + para novos shells, split terminal, seleção de shell, lixeira, perfis, SSH ou menus de ações avançadas. O MVP tem um shell manual e abas para execuções dos agentes.

CONTEÚDO EXATO DA ABA ATIVA DO AGENTE:
Faixa compacta de metadados, sem cards:
"Agente: Implementador" | "Via MCP do Forja" | "Em execução".
"CWD: ~/dev/projects/forja/.worktrees/login-oauth".
"Comando: npm run dev".
Ação pequena "Parar processo" no canto direito do painel, distinta da ação "Interromper" do agente no histórico.
Área de saída somente leitura, monoespaçada, fundo preto:
> forja@2.0.0 dev
> electron-vite dev

Processo iniciado. Aguardando saída...
Use SOMENTE estas linhas de exemplo. Não inventar portas, URLs, duração medida, PID, tokens, logs adicionais, resultado de testes ou código de saída para processo ainda ativo.
Sem campo de digitação, cursor de shell ou input no terminal DO AGENTE. O usuário acompanha a saída e pode parar o processo; não digita dentro dessa execução.
Não criar um texto explicativo longo no painel.

ABA MANUAL, CONTRATO NÃO EXIBIDO NO SCREENSHOT:
A aba "Terminal" é o shell livre e separado do usuário. Seu diretório inicial é a worktree da feature se ela existir; senão o repositório destino, ou a pasta aberta se ainda não houver destino. O agente NÃO pode digitar nesse shell. Somente essa aba permite entrada manual. Não renderize o conteúdo dela nesta variante.

ABA DE TESTES, CONTRATO NÃO EXIBIDO NO SCREENSHOT:
A aba "Implementador · testes" mantém o comando executado e sua saída após terminar, com código de saída. Não renderize resultados inventados nesta variante; o status Concluído basta na aba.
O painel de execução identifica agente, comando e diretório. Saídas ao vivo são visíveis ao usuário, enquanto o agente recebe o resultado pelo MCP do Forja. Processos persistentes podem continuar ativos, ser consultados e parados separadamente.
Execução de comando não é aprovação de etapa ou merge.

PROIBIÇÕES FINAIS:
NÃO criar outro terminal fora da área central, editor de código, diff, dashboard, onboarding, métricas, notificações, ferramentas de deploy ou configurações novas.
NÃO adicionar comandos ao chat, mensagens novas, menus abertos, seletores extras, decoração, ícones de funções não pedidas ou animações.
NÃO expor credenciais nem tratar stdout como chat.
Não alterar o padrão da topbar, sidebar, painel Git ou statusbar.
Só acrescentar o painel Terminal com suas três abas e acomodar o compositor imediatamente acima, sempre visível.
Entregue EXATAMENTE UMA variante, com a aba interna "Implementador · dev" ativa.

## Resultado

- [Tela gerada no Stitch](https://stitch.withgoogle.com/projects/9281162402489678867/screens/2551431dbc994626a9fd20cd8290a8d7).
- Variante única, original preservada. Validação humana pendente.

## Ajustes posteriores aprovados pelo usuário

Estes ajustes substituem as restrições anteriores sobre o botão de novo shell e o nome da aba manual:

- Exibir um ícone de janela de terminal à esquerda do título de cada aba, tanto manual quanto de execução do agente.
- Exibir o botão `+` à direita da faixa de abas para criar outro terminal manual na feature selecionada.
- Nomear cada terminal manual pelo shell padrão do usuário, como `zsh`, em vez do título genérico `Terminal`. Não fixar zsh para todos os usuários.
- Cada novo terminal manual é uma sessão independente, iniciada no diretório de execução da feature.
- Preservar os títulos identificados por agente e comando, como `Implementador · testes` e `Implementador · dev`, nas abas de execução MCP somente leitura.
- O botão de recolher permanece à direita. O compositor global permanece visível acima do painel.
- [Referência ajustada pelo usuário](../references/feature-terminals-user-refinement.png).

## Painel recolhido no footer

- A seta para baixo recolhe o painel em uma toolbar compacta no footer. Recolher não encerra os processos nem fecha os shells.
- A toolbar representa individualmente os terminais da feature selecionada, preservando nome e estado.
- Comandos em execução mostram loading; concluídos, falhos e interrompidos têm indicadores distintos. Um shell manual ocioso não deve parecer um comando de agente em execução.
- Ao passar o mouse, exibir um resumo compacto com terminal, agente quando aplicável, comando disponível, diretório e estado. Não inventar porcentagem de progresso ou estimativa de conclusão.
- Ao clicar no item, expandir o painel e selecionar a aba exata, preservando saída e sessão.
- Ao trocar de feature, a toolbar acompanha os terminais daquela feature; execuções das demais continuam em segundo plano.
- Manter o compositor global visível e preservar as informações existentes da statusbar.
- Este comportamento está aprovado como requisito; ainda não foi gerada uma imagem do estado recolhido.
