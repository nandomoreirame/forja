# Fidelidade dos componentes do Forja 2.0

## Objetivo do produto

Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.

As CLIs são o mecanismo de execução, não a definição principal do produto. Usar essa frase na documentação e na copy localizada sem alterar o escopo ou declarar funcionalidades planejadas como prontas.

## Referências

- [Styleguide e componentes](https://stitch.withgoogle.com/projects/9281162402489678867/screens/5cae4de038e748b7a1a0f06f6f332da3), direção visual aprovada para planejamento, com as exceções abaixo.
- [Feature em execução](https://stitch.withgoogle.com/projects/9281162402489678867/screens/b1e7dc73f23d4af5b81d37d978ef4b68), aprovada.
- [Configurações básicas](https://stitch.withgoogle.com/projects/9281162402489678867/screens/a486490d997146329aa2b82c637c98ee), aprovada.
- [Feature com terminais](https://stitch.withgoogle.com/projects/9281162402489678867/screens/2551431dbc994626a9fd20cd8290a8d7), com [ajustes do usuário](references/feature-terminals-user-refinement.png).

## Ordem de precedência

1. Decisões explícitas do usuário e requisitos funcionais aprovados.
2. Exceções registradas neste documento.
3. Tokens e componentes da galeria, validados visualmente durante a implementação.
4. Anatomia e composição das telas aprovadas.
5. HTML exportado pelo Stitch como referência de estrutura, nunca como fonte automática de comportamento ou autorização.

## Stack e organização

Usar React, TypeScript, shadcn/ui e Tailwind CSS no renderer. Os componentes de shadcn devem ser adaptados ao Terminal Noir. Não substituir o visual aprovado pelo tema padrão da biblioteca. Fixar versões do gerador e dependências no plano de implementação.

A galeria deve mostrar os componentes reais que as telas utilizarão, com mocks locais determinísticos. Os exemplos podem demonstrar interação local, teclado e foco, mas não devem executar CLI, Git, MCP ou shells reais. Não duplicar a implementação visual para a galeria.

Os componentes genéricos ficam na camada compartilhada. Composições específicas de agente, artefato ou terminal ficam nas camadas de domínio apropriadas e são importadas pela galeria por sua API pública. Não forçar toda a aplicação para dentro de uma pasta de primitivas.

## Exceções já identificadas

| Item | Regra para implementação |
| --- | --- |
| Horário e avatares nas mensagens | Não copiar iniciais ou avatares inventados. Por decisão do usuário em 01/11/2026, cada mensagem mostra o horário real de envio ao lado do autor (só a hora no mesmo dia; dia, mês e hora em outro dia), com o nome do autor em 13 px. |
| Sidebar em painéis (VS Code) | Por decisão do usuário em 01/11/2026, a sidebar segue o paneview do VS Code: cada seção redimensiona pela divisória e recolhe ao cabeçalho de 22 px (tamanhos e estado salvos por usuário), linhas de 22 px com texto de 13 px e ícones de 16 px, badges e ações das linhas e dos cabeçalhos só no hover ou foco, scrollbar sobreposta que aparece no hover, seções vazias com mensagem. Documentos abrem em largura total. |
| Mascotes nas respostas de agentes | Por decisão do usuário em 31/10/2026, respostas de agentes mostram o mascote em pixel-art do papel com a ferramenta como selo, sobre superfície cinza sem borda; o mascote anima enquanto a resposta é transmitida e fica parado com movimento reduzido. Mensagens do usuário continuam sem avatar e sem horário. Os logos das ferramentas vêm de `@lobehub/icons-static-svg`. |
| Modelos preenchidos | Não transformar exemplos inventados pelo Stitch em modelos fixos, listas oficiais ou configuração padrão. O campo vazio usa o padrão da CLI. |
| Contador de skills | Não exigir o contador inventado na tela de configurações. |
| Texto do exemplo | Não substituir os textos acordados nem acrescentar campos ou funções com base em dados decorativos do Stitch. |
| Diretório de execução | O caminho completo precisa ficar acessível; não aceitar apenas uma versão truncada sem alternativa. |
| Nome do shell | Resolver o shell padrão do usuário. zsh é um mock, não uma configuração fixa. |
| Terminal | Ícone em cada aba e botão + à direita estão aprovados pelo usuário. Recolher preserva os processos e mostra a toolbar no footer. |
| Estado disabled | Usar para indisponibilidade real. O bloqueio temporário de cliques do scaffold não é o comportamento final. |
| Animação | Respeitar movimento reduzido. Loading representa execução real ou estado mockado explícito, sem porcentagens inventadas. |
| Select aberto na galeria | A galeria demonstra o Select fechado e interativo. O menu aberto da prancha não precisa ficar fixo na página, porque a galeria serve para demonstrar os componentes, não para reproduzir cada estado da prancha (decisão do usuário em 31/10/2026). |
| Composer | Mantém as funções da segunda versão (seletor de agente, contexto, destino, atalho e enviar) com o acabamento da primeira versão do Stitch (tela "Projeto aberto"): superfície `#121214`, `rounded-xl`, sombra, borda que acende no foco, divisórias suaves e atalho como chip `kbd` (decisão do usuário em 31/10/2026). |
| Tooltip | Escuro como o do VS Code: fundo `popover`, borda `border`, texto claro, sombra e sem seta. Todo botão só de ícone e toda aba de terminal tem tooltip; a aba mostra rótulo, estado e detalhe (decisão do usuário em 31/10/2026). |
| Seta do Select | Uma única seta, a do próprio `SelectTrigger`, que gira quando o menu abre. Não adicionar outro chevron dentro do trigger (decisão do usuário em 31/10/2026). |
| Status e badges | Estados usam o `StatusBadge` compartilhado, com uma só anatomia para os 8 estados. Badges usam raio de 2px, nunca pílula. |
| Arquivos sugeridos na prancha | Rótulos como primitives.tsx ou base-tokens.json são sugestões visuais do Stitch. Os caminhos reais serão definidos nos planos. |

## Critérios para concluir a galeria

- Tokens semânticos únicos para cores, tipografia, espaçamento, bordas e raios.
- Estados aplicáveis de default, hover, foco por teclado, disabled, loading, selecionado, vazio e erro.
- Primitivas e composições presentes no inventário do [prompt](prompts/styleguide-components.md).
- Testes de interação e acessibilidade dos controles, incluindo seletores, abas e popovers.
- Capturas determinísticas de componentes e estados, comparadas com a anatomia da referência.
- Aprovação da galeria antes de implementar as telas que dependem dela.
- Novas exceções devem ser registradas e justificadas, sem redesign improvisado ou expansão do produto.

## Entrega web e idiomas

A primeira entrega de UI reúne landing page e styleguide no mesmo plano, dentro de `site/`. O inglês é padrão em `/`; o português brasileiro fica em `/pt-br`. A galeria acompanha o idioma, com rotas propostas `/styleguide` e `/pt-br/styleguide`.

Os previews da landing devem acompanhar o idioma da página, incluindo agentes, abas, estados, ações e mensagens ilustrativas. Não usar um screenshot em português como preview da página inglesa. Preferir os componentes reais com mocks localizados; capturas estáticas precisam de uma versão por idioma.

Preservar nomes de ferramentas, comandos, identificadores e caminhos. Traduzir a interface e os textos de exemplo, sem alterar código executável. Usar as mesmas composições e chaves de tradução para evitar duas implementações visuais divergentes. Verificar foco, teclado, metadados de idioma, textos acessíveis e espaçamento nos dois idiomas.
