# Validação visual das telas mockadas 01a a 01c

Validação realizada no renderer em 31/10/2026, em 1280 × 1024, com Chromium e movimento reduzido. Referências do projeto Stitch `9281162402489678867` e exceções em `component-fidelity.md`.

| Bloco | Referência | Conferência e diferenças deliberadas |
| --- | --- | --- |
| Início sem projeto | `72fc281d25234baea9a06a74ab337a4e` | Sem sidebars nem projeto carregado. Marca em caixa, título abaixo, três ações com ícones e atalhos. Ação Abrir projeto abre o seletor mockado, com Ctrl+O. Usa a marca compartilhada e textos localizados. |
| Topbar | `ca8041d7befc4d069c830cc7fb77d890` | 40 px, busca central, histórico, terminal e configurações. A marca compartilhada substitui o quadrado decorativo da prancha. Botões só de ícone têm tooltip escuro. |
| Lateral do projeto | `ca8041d7befc4d069c830cc7fb77d890` | 240 px. Cabeçalho com pasta, nome, reticências e recolhimento; agentes, specs, planos e skills. Os badges compartilhados aumentam as linhas para 28 px. O mock de projeto recém-aberto possui zero skills, diferente das quatro ilustrativas da prancha. |
| Contexto do projeto e Git | `ca8041d7befc4d069c830cc7fb77d890` | 230 px, cartão de repositório/estado, alterações e branches recolhíveis. Valores fornecidos pelo contrato mockado. |
| Rodapé | `ca8041d7befc4d069c830cc7fb77d890` | 32 px conforme requisito, embora a prancha tenha 24 px. Caminho completo e UTF-8; Sem projeto antes da seleção. |
| Linhas de projetos recentes | `92a017cb51cb48e6b78bb31af079d130` | Ícone, nome, caminho, tempo relativo e marca do projeto atual. As linhas aparecem no diálogo central de 560 px, conforme decisão do produto, em vez do dropdown lateral da prancha. |
| Composer centralizado | `02e65671524b4ea8ade154cb310d66ff` | Conteúdo de 712 px no contêiner de 760 px com padding, superfície compartilhada, raio de 12 px, sombra e borda de foco. Cabeçalho com agente/contexto/destino preservado conforme exceção registrada. Sem aba Conversa. Altura de 192 px inclui esse cabeçalho. |
| Janela estreita | mesmos componentes | Em 900 × 800, o campo de prompt mantém 352 px de largura. Os painéis podem ser recolhidos pelos controles. |

Foram abertas e comparadas capturas lado a lado de topbar, lateral, contexto, rodapé, início, linha de projeto e composer. As capturas e os recortes ficam em diretórios temporários, sem integrar a aplicação. A imagem `docs/images/welcome.png` foi atualizada com uma captura real da tela inicial.

A comparação automática do início registrou `layout_diff=0.4115`, `diff_ratio=0.0049`, extensão horizontal da referência `[442, 920]` e da implementação `[444, 830]`. A diferença no extremo direito vem principalmente do atalho curto Ctrl+O no lugar da sequência Ctrl+K/Ctrl+O e dos textos localizados. Os números são indicadores de comparação; a conferência por bloco e as diferenças acima descrevem o aceite técnico, sem alegar igualdade de pixels.

A validação técnica não substitui o aceite visual do usuário nem a revisão independente do código. Nenhuma integração real de CLI, Git, arquivos ou terminal foi exercitada por esses mocks.

## Fechamento técnico

As correções das duas rodadas anteriores foram reinspecionadas pelo agy. A rodada final retornou sem achados abertos nos três planos. O Electron também foi exercitado em modo headless, com diretório temporário de configuração e janela ajustada para 1280 × 1024: Ctrl+N abriu o composer e focou o prompt. A primeira tentativa usou a dimensão mínima imposta pela tela headless; o teste foi repetido com o tamanho explícito da janela.

Resultado final: 83 testes unitários, 7 testes de navegador, typecheck, lint, formatação, build Electron e build/prerender do site passaram. A revisão independente e a validação visual técnica estão registradas; não houve push, publicação ou empacotamento de release.
