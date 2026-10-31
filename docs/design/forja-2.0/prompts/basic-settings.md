Crie EXATAMENTE UMA variante desktop da tela aprovada "Forja 2.0 - Feature em execução - MVP Guiado" (screen b1e7dc73f23d4af5b81d37d978ef4b68) no mesmo projeto. Nome: "Forja 2.0 - Configurações básicas - MVP Guiado". Preserve a original. Entregue somente esta tela, sem variações extras.

REGRA ABSOLUTA:
Reutilize ESTRITAMENTE o padrão visual e os componentes das telas existentes: topbar, sidebar esquerda, abas por feature, compositor global, statusbar e painel Git. Design system Terminal Noir, JetBrains Mono, quase preto neutro, bordas finas e âmbar #F5A623. NÃO use Technical Precision Dark. RPI significa Research, Plan, Implement, não Raspberry Pi.
Isto é uma configuração simples de um MVP desktop, NÃO um onboarding, NÃO uma central administrativa. Não criar etapas, wizard, cards de apresentação ou explicações de marketing. Não redesenhar componentes. Em caso de dúvida, preservar a referência e fazer a menor adaptação.

COMPOSIÇÃO:

- Mesmas dimensões da tela aprovada, desktop 1280x1024 em pixels lógicos.
- Topbar idêntica: FORJA v2.0, command bar "dev", Ctrl+Shift+P, engrenagem ativa. Sem setas esquerda/direita e sem controles novos.
- Sidebar esquerda IDÊNTICA à tela aprovada: pasta "dev", cinco agentes (Pesquisador, Planejador, Implementador, Testador, Revisor), link "Configurar agentes", seções ESPECIFICAÇÕES, PLANOS, REVISÕES, HABILIDADES. Manter o contexto da feature "Login com OAuth". Não adicionar/editar agentes ou skills.
- Preserve as abas de feature "Login com OAuth" e "Busca no catálogo". Configurações é uma visualização global aberta pela engrenagem, NÃO uma nova feature e NÃO uma nova aba de agente.
- Substitua APENAS o histórico da área central pelo formulário de configurações abaixo.
- Preserve o painel Git à direita da feature selecionada. Esse painel é contexto somente leitura, não um formulário de configuração do projeto.
- Preserve o ÚNICO compositor global fixo/flutuante na base da área central, acima da statusbar. Ele deve permanecer idêntico à tela aprovada e não esconder campos ou botões. O formulário tem rolagem própria acima dele.
- Statusbar existente: 32px, ~/dev à esquerda, UTF-8 à direita.
- NÃO renderize chat/conversas adicionais nesta tela.

CONTEÚDO EXATO DO FORMULÁRIO:
Cabeçalho compacto "Configurações".
Texto auxiliar: "Configure os agentes e o comportamento de execução."
Abaixo, apenas dois seletores de seção: "Agentes" (ativo) e "Geral" (inativo). São subseções do formulário, não abas de feature.
Desenhe o estado "Agentes" aberto, com os campos completos de um agente selecionado. NÃO desenhar os cinco formulários simultaneamente.

SEÇÃO AGENTES, ESTADO VISÍVEL:

1. Seletor compacto com label "Agente" e valor "Implementador". Opções permitidas (apenas no comportamento, NÃO desenhar dropdown aberto): Pesquisador, Planejador, Implementador, Testador, Revisor. Papéis fixos, sem criar, excluir ou renomear agentes.
2. Combobox label "Ferramenta de IA", valor "Codex". Únicas opções permitidas: Claude Code, Codex, OpenCode, agy, Grok. NÃO Gemini, Pi, OpenAI API, OpenRouter ou provedores adicionais.
3. Metadado compacto "Detectado no sistema". Este é estado visual de ferramenta instalada, NÃO afirmar login validado nem conectividade testada. Sem chave de API, sem OAuth, sem login, sem instalar/atualizar/desinstalar ferramentas e sem botão de teste que não combinamos.
4. Campo de texto label "Modelo", placeholder "Usar o padrão da ferramenta". Vazio neste exemplo, para evitar inventar nomes de modelos.
5. Combobox label "Nível de raciocínio", valor "Padrão da ferramenta", texto auxiliar "Disponível quando suportado pela ferramenta." Não abrir o menu nem inventar opções universais de raciocínio.
6. Textarea pequena label "Instruções adicionais", placeholder "Instruções específicas para este agente". Vazia.
7. Lista de checkboxes label "Skills do agente", usando SOMENTE três exemplos de skills existentes: "rpi-implement" marcado, "test-driven-development" marcado, "git" desmarcado. Texto auxiliar "Selecione as skills que serão incluídas no contexto do agente." NÃO seletor de ferramentas MCP, plugins, marketplace, instalação, edição ou exclusão de skills.
8. Toggle DESLIGADO label EXATA "Invocar próximo agente automaticamente". Auxiliar "Inicia a próxima etapa ou solicita uma correção. Não aprova specs, planos ou integração Git."
9. Uma única ação primária âmbar "Salvar alterações", alinhada ao final do formulário, visível sem sobrepor o compositor. Não acrescentar cancelamento, reset, exportação, importação, duplicação, restauração ou salvar por campo.

SEÇÃO GERAL, CONTRATO PARA QUANDO O USUÁRIO SELECIONAR:
NÃO renderizar outro painel aberto ou outra tela. A subseção "Geral" fica inativa no screenshot. Se houver protótipo clicável, seu conteúdo terá SOMENTE:

- Campo "Diretório de skills", valor "~/.skills/", editável.
- Texto auxiliar "Leitura somente. Edite suas skills fora do Forja."
- Ação secundária "Recarregar skills". A pasta pode ser alterada, inclusive para a pasta de skills do Claude Code. NÃO desenhar instalador, editor ou marketplace.
- Toggle LIGADO "Interromper ao enviar uma nova mensagem".
- Auxiliar "Quando desligado, as mensagens aguardam em uma fila."
- Informação somente leitura "Modo de acompanhamento: Guiado".
- Informação somente leitura "Limite de rodadas automáticas: 3".
- Ação "Salvar alterações", mesmo padrão da seção Agentes.
Modo Agêntico está FORA do MVP. NÃO desenhar seletor de modo, opção desabilitada Agêntico, card 'em breve' nem botão de desbloqueio.
Não incluir nenhuma outra configuração. Em particular, sem conhecimento do projeto, edição de configurações do repositório, branch padrão, permissões avançadas, workspace, perfil, conta, equipe, cobrança, métricas, notificações, tema ou idioma.

COMPOSITOR GLOBAL, PRESERVAR EXATAMENTE O APROVADO:

- Combobox fechado "Implementador"; contexto "Login com OAuth"; destino "~/dev/projects/forja".
- Placeholder "Envie uma instrução, @ para selecionar um agente".
- Dica "Ctrl+Enter para enviar" e botão "Enviar".
- Conversar no compositor NÃO altera configurações. O agente continua trabalhando na feature, sem acesso ao formulário e sem receber automaticamente seus valores.
- Salvar alterações pertence ao formulário e NÃO ao chat.
- Não adicionar campo de chat dentro do formulário, comandos para configurar o app por IA, microfone, anexos, Turbo ou modelo no compositor.
- Estado visual da feature pode ser "Pronto" nesta tela para não sugerir aplicação imediata de alterações a um turno em execução.

PROIBIÇÕES FINAIS:
Crie SOMENTE o que foi pedido. Não invente novas configurações, agentes, integrações, botões, menus, painéis, contadores, dados, conteúdo de conversa ou textos auxiliares.
Não gerar onboarding, leitor de documentos ou qualquer outra tela. Não criar imagens, ilustrações, avatares ou elementos decorativos.
Mantenha o formulário compacto, legível e coerente com o aplicativo aprovado, sem cards desnecessários. Labels e texto da interface em português brasileiro.
Entregue EXATAMENTE UMA tela, com a seção Agentes ativa e o formulário do Implementador visível.

## Resultado

- [Tela gerada no Stitch](https://stitch.withgoogle.com/projects/9281162402489678867/screens/a486490d997146329aa2b82c637c98ee).
- Variante única da tela aprovada, mantendo a original. Validação humana pendente.
