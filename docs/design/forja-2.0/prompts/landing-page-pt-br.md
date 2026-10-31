Crie EXATAMENTE UMA variante da landing page existente "Forja 2.0 - Landing page - Guided RPI", source screen bf8dfb657a774e26b6205771525461a8. Título da nova tela: "Forja 2.0 - Landing page - pt-BR". Preserve integralmente a versão inglesa. Esta é a versão secundária /pt-br; a original inglesa continua sendo o padrão /.

OBJETIVO ÚNICO:
Localizar a landing APROVADA para português brasileiro. Não redesenhar, não reorganizar seções, não alterar a identidade visual e não adicionar funcionalidades. Preservar Terminal Noir, JetBrains Mono, acento âmbar, dimensões, containers, espaços, imagens/previews e hierarquia da versão original. Ajustar quebras de linha apenas para acomodar o português sem cortar texto.
NÃO criar um novo styleguide ou tela do aplicativo. Entregar UMA landing completa em pt-BR.

REGRA CRÍTICA: TRADUZIR TAMBÉM OS MOCKS
Todo texto visível nos previews do produto deve ficar em pt-BR, incluindo abas de feature, agentes, mensagens, estados, etapas RPI, labels, botões, avisos, metadados, compositor e preview dos terminais no footer.
Não deixar "Research", "Planner", "Implementer", "Tester", "Reviewer", "Running", "Approved", "Follow development", "Feature" ou frases inglesas dentro dos mocks.
Papéis: Pesquisador, Planejador, Implementador, Testador, Revisor.
Estados: Em execução, Aprovada, Aprovado, Rascunho, Concluído, Aguardando aprovação.
Campos: Destino, Diretório, Repositório, Branch, Comando, Agente, Via MCP do Forja.
Tabs: Login com OAuth, Busca no catálogo.
Compositor: "Envie uma instrução, @ para selecionar um agente", botão "Enviar", dica "Ctrl+Enter para enviar".
Terminal: "Implementador · testes", "Implementador · dev", shell manual "zsh", "Parar processo", "Processo iniciado. Aguardando saída...".
Evento: "Testador solicitou correção · Rodada 1 de 3", link "Ver solicitação".
Popover documental: "Revisar com o agente".
Preservar nomes próprios e código: Forja, Claude Code, Codex, OpenCode, agy, Grok, Git, GitHub, MCP, OAuth, Markdown, Mermaid, nomes de shell, comandos npm, atalhos, caminhos, nomes de arquivo e identificadores de branch. Não traduzir sintaxe executável.
Não inventar timestamps, resultados, portas, URLs de servidor, métricas ou nomes de modelos dentro dos mocks.

COPY EXATA POR SEÇÃO:

1. NAVBAR:
Marca Forja 2.0.
Links: "Por que o Forja", "Fluxo", "O que vem no MVP".
CTA: "Acompanhar desenvolvimento" -> https://github.com/nandomoreirame/forja.
Sem download, login, preços ou cadastro.

2. HERO:
Selo: "FORJA 2.0 · EM DESENVOLVIMENTO".
Título: "Avance com seus agentes de IA. Saiba qual é o próximo passo."
Texto:
"Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa."
CTA: "Acompanhar desenvolvimento".
Nota: "O MVP do 2.0 está em desenvolvimento. Veja a proposta abaixo."
Legenda do preview: "Preview do design · MVP planejado".
Mesmo preview e anatomia da versão inglesa, mas com conteúdo localizado conforme as regras acima.

3. POR QUE O FORJA:
Rótulo: "POR QUE O FORJA".
Título: "O trabalho vai além de uma conversa."
Texto:
"A pesquisa produz decisões. O planejamento transforma essas decisões em tarefas. A implementação altera o código. Testes e revisões devolvem o trabalho para correção. Manter essas etapas conectadas entre terminais e documentos disputa sua atenção com a própria feature."
Fecho:
"O Forja 2.0 está sendo construído em torno de um fluxo RPI opinativo, conectando spec, plano, agentes e histórico de execução com sua aprovação explícita antes da próxima etapa."

4. FLUXO:
Rótulo: "O FLUXO GUIADO".
Título: "Cinco papéis. Passagens explícitas."
Sequência: Pesquisador -> Planejador -> Implementador -> Testador -> Revisor.
Descrições:
Pesquisador: "Entende o problema e escreve a spec."
Planejador: "Transforma a spec aprovada em um plano."
Implementador: "Implementa a partir do plano aprovado."
Testador: "Executa as verificações e relata falhas."
Revisor: "Revisa as mudanças e registra os achados."
Texto abaixo:
"As correções voltam ao Implementador com links para a solicitação e sua execução. As invocações automáticas têm limites; as aprovações continuam explícitas."
Se a base tiver labels técnicos extras como Gate, Done, Atomic TDD steps ou Human approvals, traduzir ou remover se forem invenções decorativas; não criar novas promessas.
Sem aprovação automática de specs, planos ou integração Git.

5. CAPACIDADES PLANEJADAS:
Rótulo: "PLANEJADO PARA O MVP".
Título: "Acompanhe o trabalho de perto."
Mesmas quatro histórias e mesma disposição da original:
A. "Uma aba por feature"
"Reúna conversas, repositório de destino e worktree de cada feature. Trabalhe em várias features sem misturar seus contextos."
B. "Documentos que viram conversa"
"Leia specs, planos e revisões em Markdown formatado com Mermaid. Selecione um trecho para preparar uma solicitação de revisão ao autor."
C. "Execução que você acompanha"
"Veja os comandos e as saídas dos agentes pelo executor MCP do Forja. Use seu próprio shell em outra aba e acompanhe processos em segundo plano pelo footer."
D. "Suas ferramentas, por papel"
"Escolha a CLI, o modelo, as instruções e as skills locais dos cinco agentes. As skills ficam em modo somente leitura; suas ferramentas mantêm a autenticação."
Linha: "Integrações previstas: Claude Code · Codex · OpenCode · agy · Grok".
Nota: "A disponibilidade depende da validação das capacidades de cada adaptador."
Todos os pequenos previews destas quatro histórias devem ser localizados, sem inglês residual. Não acrescentar quinta história.

6. ESCOPO E FAQ:
Título: "Uma primeira entrega com foco."
Texto:
"O primeiro MVP prioriza o fluxo Guiado e a validação em Linux. Aprovações totalmente autônomas, onboarding e empacotamento para outros sistemas ficam fora deste escopo inicial."
FAQ, EXATAMENTE três itens:
P: "Já posso baixar o Forja 2.0?"
R: "O MVP do 2.0 ainda está em desenvolvimento. Acompanhe o repositório para ver o progresso e as informações de lançamento."
P: "O Forja substitui minha CLI de IA?"
R: "O Forja define o fluxo RPI e seus pontos de aprovação. As CLIs de programação instaladas executam o trabalho, com configuração por papel e capacidades de execução controlada validadas."
P: "Quem decide quando o trabalho avança?"
R: "Você aprova a spec, o plano e as transições principais. As invocações entre agentes podem ser habilitadas, mas não dispensam as aprovações obrigatórias nem a autorização para integrar mudanças."

7. CTA FINAL E FOOTER:
Título: "Acompanhe a construção do Forja 2.0."
Texto: "Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa."
CTA: "Acompanhar desenvolvimento" -> mesmo GitHub.
Footer: Forja 2.0, "Desenvolvimento RPI opinativo · Em desenvolvimento".
Links: "Código-fonte" -> https://github.com/nandomoreirame/forja e "Issues" -> https://github.com/nandomoreirame/forja/issues.

RESTRIÇÕES:
Não adicionar seletor de idioma ou outros controles se isso alterar a composição existente; esta solicitação é somente a versão visual pt-BR.
Não adicionar estrelas, clientes, depoimentos, estatísticas, preço, licença, download, gratuidade vitalícia, compatibilidade já comprovada ou data de lançamento.
Não alegar que funcionalidades planejadas já estão implementadas.
Não mudar o produto, criar onboarding, tema novo, variações adicionais ou outra arquitetura.
Não alterar a versão inglesa nem as telas do aplicativo.
Português brasileiro com acentos corretos. Sem travessões, emojis ou copy nova fora dos textos fornecidos.
Entregue EXATAMENTE UMA variante pt-BR da mesma landing, com todos os mocks localizados.

## Resultado

- [Landing pt-BR no Stitch](https://stitch.withgoogle.com/projects/9281162402489678867/screens/5db10cc61f464f96ba751fdac5feaa20).
- Variante única gerada. Versão inglesa e site publicado preservados.
- Validação humana pendente. A implementação deverá compartilhar componentes e dicionários entre os idiomas.
