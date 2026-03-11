# Electron Performance Scalability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Escalar o Forja para múltiplos projetos e múltiplos terminais em paralelo com menor consumo de RAM/CPU, sem mudar o design funcional atual.

**Architecture:** O plano preserva a arquitetura atual baseada em Electron main process + renderer React + PTYs por sessão, mas reduz custo por aba/projeto e adia carregamento de componentes pesados. A estratégia é atuar em três frentes: reduzir trabalho no renderer, reduzir trabalho recorrente no main process e tornar observabilidade/refresh mais seletivos.

**Tech Stack:** Electron 32, React 19, TypeScript, Zustand, xterm.js, Monaco Editor, chokidar, node-pty, Vitest.

## Contexto Técnico

- O maior custo estrutural atual está em Monaco e seus workers, usados em preview, edição e diff.
- O segundo maior custo está em múltiplos terminais com `xterm` + `WebglAddon`.
- O terceiro maior custo está em watchers e refresh de Git/filesystem por projeto.
- O objetivo não é remover paralelismo, e sim torná-lo mais barato.

## Critérios de Sucesso

- Abrir múltiplos projetos não deve disparar refresh amplo desnecessário.
- Abas de terminal ocultas devem consumir menos RAM/GPU do que hoje.
- Monaco deve ser carregado apenas quando necessário.
- O custo de atualizar Git/filesystem deve ser proporcional ao projeto afetado.
- A telemetria interna de métricas deve continuar funcionando, mas com menor overhead.

### Task 1: Baseline de performance e testes de proteção

**Files:**
- Modify: `electron/__tests__/app-metrics.test.ts`
- Modify: `electron/__tests__/file-watcher.test.ts`
- Modify: `electron/__tests__/pty-spawn.test.ts`
- Create: `frontend/components/__tests__/terminal-session.performance.test.tsx`
- Create: `frontend/components/__tests__/file-preview-pane.performance.test.tsx`

**Step 1: Escrever testes de proteção para comportamento atual**

- Cobrir que o loop de métricas não cria múltiplos intervals.
- Cobrir que watchers fazem debounce e não duplicam sessão para a mesma chave.
- Cobrir que `TerminalSession` descarta recursos ao desmontar.
- Cobrir que `FilePreviewPane` não instancia editor pesado em modo markdown/image.

**Step 2: Rodar testes pontuais para validar baseline**

Run:
```bash
pnpm test electron/__tests__/app-metrics.test.ts electron/__tests__/file-watcher.test.ts electron/__tests__/pty-spawn.test.ts frontend/components/__tests__/terminal-session.performance.test.tsx frontend/components/__tests__/file-preview-pane.performance.test.tsx
```

Expected:
- Testes passando
- Sem mudança funcional ainda

**Step 3: Commit**

```bash
git add electron/__tests__/app-metrics.test.ts electron/__tests__/file-watcher.test.ts electron/__tests__/pty-spawn.test.ts frontend/components/__tests__/terminal-session.performance.test.tsx frontend/components/__tests__/file-preview-pane.performance.test.tsx
git commit -m "test: add performance guardrail coverage"
```

### Task 2: Lazy-load real de Monaco no renderer

**Files:**
- Modify: `frontend/components/code-viewer.tsx`
- Modify: `frontend/components/file-preview-pane.tsx`
- Modify: `frontend/components/git-diff-viewer.tsx`
- Modify: `frontend/components/monaco-editor.tsx`
- Modify: `frontend/components/monaco-diff-editor.tsx`
- Modify: `frontend/App.tsx`
- Test: `frontend/components/__tests__/file-preview-pane.test.tsx`
- Test: `frontend/components/__tests__/git-diff-viewer.test.tsx`
- Test: `frontend/components/__tests__/code-viewer.test.tsx`

**Step 1: Escrever testes que expressem o carregamento tardio**

- Verificar que preview markdown não importa editor pesado.
- Verificar que imagem não importa editor pesado.
- Verificar que diff editor só aparece quando `selectedDiff` existe.
- Verificar fallback visual com `Suspense`.

**Step 2: Extrair wrappers lazy para Monaco**

- Criar boundary de `lazy(() => import("./monaco-editor"))` para edição/read-only.
- Criar boundary equivalente para diff editor.
- Garantir que `CodeViewer` use o wrapper lazy em vez de importar Monaco diretamente.

**Step 3: Aplicar carregamento sob demanda em preview e diff**

- Manter markdown e image preview sem custo de Monaco.
- Carregar Monaco apenas em:
  - modo edição
  - preview de código textual
  - diff view

**Step 4: Rodar testes frontend**

Run:
```bash
pnpm test frontend/components/__tests__/file-preview-pane.test.tsx frontend/components/__tests__/git-diff-viewer.test.tsx frontend/components/__tests__/code-viewer.test.tsx
```

Expected:
- Testes passando
- Nenhuma regressão visual básica

**Step 5: Validar bundle**

Run:
```bash
pnpm build
```

Expected:
- Build ok
- Monaco fora do caminho crítico do shell inicial

**Step 6: Commit**

```bash
git add frontend/components/code-viewer.tsx frontend/components/file-preview-pane.tsx frontend/components/git-diff-viewer.tsx frontend/components/monaco-editor.tsx frontend/components/monaco-diff-editor.tsx frontend/App.tsx frontend/components/__tests__/file-preview-pane.test.tsx frontend/components/__tests__/git-diff-viewer.test.tsx frontend/components/__tests__/code-viewer.test.tsx
git commit -m "perf: lazy load monaco editors"
```

### Task 3: Reduzir custo de terminais ocultos

**Files:**
- Modify: `frontend/components/terminal-session.tsx`
- Modify: `frontend/components/terminal-pane.tsx`
- Modify: `frontend/hooks/use-pty.ts`
- Test: `frontend/components/__tests__/terminal-session.test.tsx`
- Test: `frontend/components/__tests__/terminal-session.performance.test.tsx`

**Step 1: Escrever testes para sessões ocultas**

- Verificar descarte antecipado de `WebglAddon`.
- Verificar que terminal oculto não faz `fit()` indevido.
- Verificar que aba reexibida reconecta layout corretamente.

**Step 2: Ajustar política de renderização oculta**

- Trocar descarte de WebGL após 30s por política mais agressiva:
  - imediato ao ocultar, ou
  - curto delay configurável
- Preservar sessão PTY viva no backend.
- Garantir fallback canvas/text sem quebrar terminal.

**Step 3: Revisar resize e focus**

- Evitar `focus()` automático em situações não ativas.
- Garantir que `resize()` só seja enviado quando dimensões realmente mudarem.

**Step 4: Rodar testes**

Run:
```bash
pnpm test frontend/components/__tests__/terminal-session.test.tsx frontend/components/__tests__/terminal-session.performance.test.tsx
```

Expected:
- Testes passando
- Sem regressão de input/output

**Step 5: Commit**

```bash
git add frontend/components/terminal-session.tsx frontend/components/terminal-pane.tsx frontend/hooks/use-pty.ts frontend/components/__tests__/terminal-session.test.tsx frontend/components/__tests__/terminal-session.performance.test.tsx
git commit -m "perf: reduce hidden terminal rendering cost"
```

### Task 4: Tornar refresh de filesystem e preview mais seletivo

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/stores/file-tree.ts`
- Modify: `frontend/stores/file-preview.ts`
- Modify: `electron/file-watcher.ts`
- Modify: `electron/file-cache.ts`
- Test: `electron/__tests__/file-watcher.test.ts`
- Test: `frontend/stores/__tests__/file-preview.test.ts`

**Step 1: Escrever testes para refresh seletivo**

- Validar que `files:changed` invalida apenas projeto afetado.
- Validar que preview recarrega só quando o arquivo atual pertence ao projeto alterado.
- Validar que cache de arquivos é invalidado por projeto corretamente.

**Step 2: Enriquecer payload do watcher**

- Enviar tipo de evento e caminho relativo quando possível.
- Se chokidar disparar vários eventos, continuar com debounce e coalescing.

**Step 3: Refinar o consumo no renderer**

- Em vez de sempre chamar `refreshTree(projectPath)` e `reloadCurrentFile()`, condicionar por:
  - projeto afetado
  - arquivo atualmente aberto
  - necessidade real de recarregar a árvore visível

**Step 4: Rodar testes**

Run:
```bash
pnpm test electron/__tests__/file-watcher.test.ts frontend/stores/__tests__/file-preview.test.ts
```

Expected:
- Testes passando
- Menor volume de trabalho por evento

**Step 5: Commit**

```bash
git add frontend/App.tsx frontend/stores/file-tree.ts frontend/stores/file-preview.ts electron/file-watcher.ts electron/file-cache.ts electron/__tests__/file-watcher.test.ts frontend/stores/__tests__/file-preview.test.ts
git commit -m "perf: make file refresh more selective"
```

### Task 5: Reduzir custo de Git por projeto

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/stores/git-status.ts`
- Modify: `frontend/stores/git-diff.ts`
- Modify: `electron/watcher.ts`
- Modify: `electron/git-info.ts`
- Test: `electron/__tests__/git-info.test.ts`
- Test: `frontend/stores/__tests__/git-status.test.ts`
- Test: `frontend/stores/__tests__/git-diff.test.ts`

**Step 1: Escrever testes para refresh Git com coalescing**

- Validar que múltiplos `git:changed` próximos não disparam várias buscas completas.
- Validar TTL e refresh forçado.
- Validar comportamento por projeto.

**Step 2: Implementar scheduler de refresh Git**

- Coalescer eventos `git:changed` por projeto.
- Aplicar janela de supressão curta no renderer ou main.
- Separar:
  - refresh de counters/status list
  - carregamento de diff detalhado apenas sob demanda

**Step 3: Evitar trabalho amplo em bootstrap**

- Revisar aquecimento de Git para todos os projetos carregados.
- Manter aquecimento apenas para projeto ativo e projetos recém-ativados, salvo necessidade explícita.

**Step 4: Rodar testes**

Run:
```bash
pnpm test electron/__tests__/git-info.test.ts frontend/stores/__tests__/git-status.test.ts frontend/stores/__tests__/git-diff.test.ts
```

Expected:
- Menos chamadas IPC repetidas
- Sem regressão de indicadores Git

**Step 5: Commit**

```bash
git add frontend/App.tsx frontend/stores/git-status.ts frontend/stores/git-diff.ts electron/watcher.ts electron/git-info.ts electron/__tests__/git-info.test.ts frontend/stores/__tests__/git-status.test.ts frontend/stores/__tests__/git-diff.test.ts
git commit -m "perf: coalesce git refresh by project"
```

### Task 6: Reduzir overhead de métricas do aplicativo

**Files:**
- Modify: `electron/app-metrics.ts`
- Modify: `frontend/hooks/use-app-metrics.ts`
- Modify: `frontend/components/resource-usage-popover.tsx`
- Test: `electron/__tests__/app-metrics.test.ts`
- Test: `frontend/hooks/__tests__/use-app-metrics.test.ts`

**Step 1: Escrever testes para sampling mais barato**

- Validar pausa quando UI interessada não está aberta.
- Validar retomada quando popover/consumidor volta a existir.
- Validar histórico sem crescimento descontrolado.

**Step 2: Mudar de polling sempre ativo para polling sob demanda**

- Ligar loop de métricas apenas quando houver consumidor ativo.
- Aumentar intervalo ou degradar amostragem em background.

**Step 3: Ajustar hook e UI**

- Registrar/unregistrar interesse do renderer.
- Manter UX equivalente no popover.

**Step 4: Rodar testes**

Run:
```bash
pnpm test electron/__tests__/app-metrics.test.ts frontend/hooks/__tests__/use-app-metrics.test.ts
```

Expected:
- Menor polling em idle
- Sem regressão visual no popover

**Step 5: Commit**

```bash
git add electron/app-metrics.ts frontend/hooks/use-app-metrics.ts frontend/components/resource-usage-popover.tsx electron/__tests__/app-metrics.test.ts frontend/hooks/__tests__/use-app-metrics.test.ts
git commit -m "perf: make app metrics sampling demand-driven"
```

### Task 7: Remover IO síncrono do caminho crítico do main process

**Files:**
- Modify: `electron/project-icon.ts`
- Modify: `frontend/stores/projects.ts`
- Modify: `electron/main.ts`
- Test: `electron/__tests__/project-icon.test.ts`
- Test: `frontend/stores/__tests__/projects.test.ts`

**Step 1: Escrever testes para API assíncrona de ícones**

- Validar detecção de ícone por caminho.
- Validar fallback para projeto sem ícone.
- Validar carregamento sem quebrar a lista de projetos.

**Step 2: Migrar `project-icon` para `fs/promises`**

- Tornar `detectProjectIcon` e `readIconAsDataUrl` assíncronos.
- Preservar contrato IPC.
- Cachear resultado por projeto enquanto a sessão estiver aberta.

**Step 3: Ajustar store e handlers**

- Consumir API assíncrona sem duplicar requests para o mesmo projeto.

**Step 4: Rodar testes**

Run:
```bash
pnpm test electron/__tests__/project-icon.test.ts frontend/stores/__tests__/projects.test.ts
```

Expected:
- Testes passando
- Menor risco de travar o main em carregamento em lote

**Step 5: Commit**

```bash
git add electron/project-icon.ts frontend/stores/projects.ts electron/main.ts electron/__tests__/project-icon.test.ts frontend/stores/__tests__/projects.test.ts
git commit -m "perf: remove sync icon IO from main process"
```

### Task 8: Revisar Browser Pane e preparar migração do `webview`

**Files:**
- Modify: `frontend/components/browser-pane.tsx`
- Modify: `electron/main.ts`
- Modify: `electron/__tests__/main-security.test.ts`
- Create: `docs/plans/browser-pane-migration-notes.md`

**Step 1: Documentar restrições atuais**

- Registrar o custo e o risco operacional do `webview`.
- Delimitar o uso real do Browser Pane no produto.

**Step 2: Implementar mitigação mínima**

- Garantir montagem lazy e desmontagem agressiva quando pane fechar.
- Verificar se existe algum preload/event listener sobrando.

**Step 3: Planejar migração futura**

- Comparar `webview` vs `WebContentsView` para a necessidade atual.
- Não migrar ainda se isso ampliar muito o escopo.

**Step 4: Rodar testes**

Run:
```bash
pnpm test electron/__tests__/main-security.test.ts
```

Expected:
- Sem regressão de segurança
- Browser Pane continua funcional

**Step 5: Commit**

```bash
git add frontend/components/browser-pane.tsx electron/main.ts electron/__tests__/main-security.test.ts docs/plans/browser-pane-migration-notes.md
git commit -m "perf: tighten browser pane lifecycle"
```

### Task 9: Verificação final de regressão e benchmark básico

**Files:**
- Modify: `README.md`
- Create: `docs/performance/parallel-projects-benchmark.md`

**Step 1: Rodar suíte relevante**

Run:
```bash
pnpm test --project frontend
pnpm test --project electron
pnpm build
```

Expected:
- Tudo passando
- Build estável

**Step 2: Executar benchmark manual padronizado**

- Medir app idle
- Medir 3 projetos abertos
- Medir 6 terminais
- Medir 1 diff Monaco + 1 edição + Browser Pane
- Registrar RSS e CPU observados

**Step 3: Documentar resultado**

- Registrar baseline anterior vs posterior
- Registrar limites conhecidos

**Step 4: Commit**

```bash
git add README.md docs/performance/parallel-projects-benchmark.md
git commit -m "docs: record performance validation workflow"
```

## Ordem Recomendada de Execução

1. Baseline e testes de proteção
2. Lazy-load de Monaco
3. Otimização de terminais ocultos
4. Refresh seletivo de filesystem
5. Coalescing de Git
6. Métricas sob demanda
7. IO assíncrono de ícones
8. Revisão do Browser Pane
9. Benchmark final

## Riscos e Mitigações

- **Risco:** regressão visual no preview/diff.
  **Mitigação:** snapshots/testes de componentes e rollout em fases.

- **Risco:** terminal voltar visível com layout incorreto.
  **Mitigação:** testes específicos de hide/show e resize.

- **Risco:** indicadores Git ficarem desatualizados.
  **Mitigação:** manter refresh forçado em troca de projeto e ação manual.

- **Risco:** lazy loading aumentar complexidade de testes.
  **Mitigação:** usar wrappers pequenos e boundaries explícitos com fallback previsível.

## Resultado Esperado

Ao final deste plano, o Forja deve continuar suportando múltiplos projetos e múltiplos terminais em paralelo, mas com:

- menor custo de memória por aba terminal ociosa,
- menor custo de CPU por evento de arquivo/Git,
- menor peso inicial do renderer,
- menor risco de travamento do main process,
- melhor previsibilidade de escala em workspaces maiores.
