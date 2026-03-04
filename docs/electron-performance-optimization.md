# Otimização de Performance em Electron.js

## Consumo de Memória e Aceleração por Hardware

---

## 1. Diagnóstico — Meça Antes de Otimizar

A estratégia mais eficaz para construir um app Electron performático é fazer **profiling** do código em execução, encontrar a parte que mais consome recursos e otimizá-la. A experiência com apps como VS Code e Slack mostrou que essa prática é de longe a mais confiável para melhorar performance.

### Ferramentas de Diagnóstico

- **Chrome DevTools** (integrado ao Electron): aba Performance para flame graphs, aba Memory para heap snapshots.
- **Chrome Tracing** (`chrome://tracing`): análise avançada de múltiplos processos simultaneamente.
- **`process.memoryUsage()`** no main process: retorna `heapUsed`, `heapTotal`, `external` e `rss`.
- **`performance.memory.usedJSHeapSize`** no renderer process: uso de heap V8 em bytes.
- **`--trace_gc` e `--trace_gc_verbose`**: flags V8 para logar atividade do garbage collector.
- **webpack-bundle-analyzer**: identifica dependências pesadas e duplicadas no bundle.

> **Regra de ouro:** sempre faça profiling em builds de **produção**. O modo de desenvolvimento é significativamente mais lento por causa de checks extras do React, hot reload e código não minificado.

---

## 2. Consumo de Memória — Estratégias de Otimização

### 2.1. Audite e Reduza Dependências

Antes de adicionar um módulo Node.js à aplicação, examine-o. Módulos projetados para servidores Node.js podem carregar informações desnecessárias em memória. Por exemplo, substituir o módulo `request` por `node-fetch` resultou em muito menos consumo de memória e tempo de carregamento abaixo de 50ms.

**Como avaliar um módulo:**

```bash
# Gerar CPU profile e heap memory profile de um módulo
node --cpu-prof --heap-prof -e "require('nome-do-modulo')"
```

### 2.2. Lazy Loading de Módulos

O carregamento de módulos via `require()` é uma operação surpreendentemente custosa, especialmente no Windows. Em vez de colocar todos os imports no topo do arquivo, adie o carregamento para quando realmente for necessário.

```javascript
// ❌ Ruim: carrega tudo na inicialização
const heavyModule = require('heavy-module');

// ✅ Bom: carrega sob demanda
function doHeavyWork() {
  const heavyModule = require('heavy-module');
  return heavyModule.process();
}
```

### 2.3. Pointer Compression do V8

A compressão de ponteiros (habilitada por padrão desde o Electron 14) reduz o tamanho do heap do V8 em até **40%** e melhora o desempenho de CPU e garbage collection em **5–10%**. A contrapartida é que o heap V8 fica limitado a no máximo **4GB**.

Para apps que precisam de mais memória, é possível:

- Mover trabalho intensivo para um child process com Node.js compilado sem pointer compression.
- Compilar uma versão customizada do Electron com pointer compression desabilitada.

### 2.4. Use SQLite para Dados Pesados

Para apps com muitos dados, usar SQLite é a melhor abordagem — ele já é altamente otimizado, carregando apenas os dados necessários em memória conforme demanda. Isso evita manter datasets inteiros na RAM.

**Resultado prático:** um app de finanças pessoais usando essa abordagem ficou com ~239MB em repouso, contra 400–600MB de apps como Notion e Airtable.

### 2.5. Tuning do Garbage Collector (V8)

Você pode ajustar flags V8 no Electron para controlar o comportamento do GC:

```javascript
// No main.js
app.commandLine.appendSwitch('js-flags', '--max-semi-space-size=64');
```

**Flags úteis:**

| Flag | Descrição |
|------|-----------|
| `--max-semi-space-size=N` | Tamanho do New Space em MB (padrão ~16MB). Aumentar reduz frequência de minor GC. |
| `--max-old-space-size=N` | Tamanho máximo do Old Space em MB. Útil para apps que precisam de mais memória. |
| `--expose-gc` | Permite chamar `global.gc()` manualmente no código. |
| `--gc-interval=N` | Força tentativa de GC a cada N ms (usar com cautela). |
| `--trace_gc` | Loga atividade do GC no console (diagnóstico). |

```javascript
// Disparar GC manualmente após processamento pesado
// (requer --expose-gc)
if (global.gc) {
  global.gc();
}
```

### 2.6. Gerenciamento de Processos e Janelas

- **Window Pooling:** reutilize janelas em vez de criar novas — cada janela consome recursos significativos.
- **BrowserViews:** são mais leves que BrowserWindows separadas.
- **Reduza renderer processes:** cada um consome memória própria. Minimize o número de janelas ativas.

### 2.7. Limpeza de Recursos

- Remova listeners de eventos quando não forem mais necessários.
- Feche arquivos, sockets e conexões de banco de dados.
- Encerre child processes que não estão mais em uso.
- Expire caches de dados e faça pruning periodicamente.
- Use `WeakMap` e `WeakRef` para cache de objetos que podem ser coletados pelo GC.

---

## 3. Código Nativo — Rust, NAPI-RS e WebAssembly

### 3.1. NAPI-RS (Rust + Node.js)

Para operações computacionalmente intensivas, reescrever gargalos em Rust via NAPI-RS pode trazer ganhos dramáticos. Exemplo real: cálculo de CRC32 caiu de **800ms para 75ms** por arquivo.

**Vantagens do NAPI-RS:**

- Performance próxima ao nativo.
- Segurança de memória do Rust (sem memory leaks do lado nativo).
- Suporte a prebuilts — não precisa do ambiente Rust para usar o módulo.
- Suporte a Windows, Linux e macOS (incluindo Apple Silicon).

```bash
# Criar um projeto NAPI-RS
npx @napi-rs/cli new meu-modulo-nativo
```

### 3.2. WebAssembly (WASM)

Se o app realiza operações caras com frequência, executá-las em WebAssembly é uma boa alternativa. WASM funciona como um atalho para o otimizador do motor JavaScript — o código é otimizado antes da execução (AOT), oferecendo performance mais determinística.

**Quando usar WASM:**

- Processamento de imagem/vídeo.
- Cálculos matemáticos pesados.
- Parsing de arquivos grandes.
- Algoritmos de compressão/criptografia.

### 3.3. V8 Snapshots para Startup

Snapshots do V8 permitem capturar um heap já inicializado e reutilizá-lo, evitando reinicialização de objetos a cada startup. A ferramenta **electron-link** facilita o uso dessa técnica.

---

## 4. Aceleração por Hardware (GPU)

### 4.1. Estado Padrão

O Chromium usa a GPU extensivamente para acelerar renderização de páginas, HTML, CSS, elementos gráficos e vídeo. No Electron, a aceleração por hardware vem **habilitada por padrão**.

### 4.2. Verificar Status da GPU

Acesse `chrome://gpu` dentro do app Electron para ver o que está ativado. Os recursos que podem ser acelerados incluem:

- **Canvas** — desenho 2D
- **gpu_compositing** — composição de layers
- **rasterization** — conversão de vetores para pixels
- **video_decode** / **video_encode** — codificação/decodificação de vídeo
- **WebGL** / **WebGL2** — gráficos 3D
- **native_gpu_memory_buffers** — buffers de memória nativos da GPU

**Status possíveis:** `enabled` (verde), `enabled_force` (verde), `disabled_software` (amarelo), `unavailable_off` (vermelho).

### 4.3. Flags para Maximizar Aceleração GPU

Adicione no `main.js` **antes** do `app.whenReady()`:

```javascript
const { app } = require('electron');

// Ignorar lista de bloqueio de GPUs do Chromium
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Habilitar rasterização por GPU
app.commandLine.appendSwitch('enable-gpu-rasterization');

// Habilitar rasterização fora do processo
app.commandLine.appendSwitch('enable-oop-rasterization');

// Habilitar zero-copy (menos cópias CPU ↔ GPU)
app.commandLine.appendSwitch('enable-zero-copy');

// Habilitar buffers de memória nativos da GPU
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');

// Decodificação de vídeo acelerada
app.commandLine.appendSwitch('enable-accelerated-video-decode');

// Decodificação MJPEG acelerada
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
```

### 4.4. Flags Adicionais para Linux

No Linux, drivers de GPU nem sempre são confiáveis, então o Chromium desativa aceleração por padrão. Para forçar:

```javascript
// Usar backend OpenGL desktop
app.commandLine.appendSwitch('use-gl', 'desktop');

// Habilitar VAAPI para decodificação de vídeo por hardware
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');

// Para Wayland
app.commandLine.appendSwitch('ozone-platform', 'wayland');
app.commandLine.appendSwitch('use-gl', 'egl');
app.commandLine.appendSwitch('enable-features',
  'VaapiVideoDecoder,VaapiVideoEncoder,CanvasOopRasterization');
```

### 4.5. Flags para Linux (ARM64 / Jetson)

```javascript
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
```

### 4.6. Forçar GPU Integrada (Economia de Bateria)

Em laptops com GPU discreta + integrada, forçar o uso da integrada economiza bateria sem desativar aceleração:

```javascript
app.commandLine.appendSwitch('force_discrete_gpu', '0');
```

### 4.7. Quando Desativar Aceleração por Hardware

Em alguns cenários (offscreen rendering, GPUs problemáticas, ambientes virtualizados), pode ser necessário desativar:

```javascript
// Deve ser chamado ANTES do evento 'ready'
app.disableHardwareAcceleration();
```

O modo de software rendering no CPU pode ser mais rápido para offscreen rendering, pois evita a cópia de frames da GPU para a CPU.

---

## 5. Otimização de Renderização

### 5.1. Não Bloqueie o Main Thread

- Use **worker threads** para tarefas pesadas de CPU.
- Evite **IPC síncrono** e o módulo `@electron/remote`.
- Prefira sempre versões **assíncronas** dos módulos Node.js (`fs.promises` em vez de `fs.readFileSync`).

```javascript
// ❌ Ruim: bloqueia o main process
const data = fs.readFileSync('/path/to/file');

// ✅ Bom: assíncrono
const data = await fs.promises.readFile('/path/to/file');
```

### 5.2. Otimize o DOM

- **Batch DOM updates:** agrupe atualizações em vez de fazer múltiplas mudanças sequenciais.
- **Minimize repaints:** use `requestAnimationFrame` para animações.
- **Virtualize listas longas:** use bibliotecas como `react-window` ou `react-virtualized`.
- **Reduza elementos live:** simplifique componentes de UI complexos.

### 5.3. Atualizações Otimistas (Performance Percebida)

Usuários preferem apps que **parecem** rápidos. Mostre o resultado na UI antes da operação concluir no backend — se falhar, reverta.

### 5.4. Tarefas em Idle

```javascript
// Adie tarefas não-críticas para momentos ociosos
requestIdleCallback(() => {
  doNonCriticalWork();
});
```

Quando a janela não está em foco, desacelere ou pause tarefas recorrentes.

---

## 6. Bundle e Startup

### 6.1. Tree-shaking e Code Splitting

Use Webpack ou Vite para:

- Eliminar código morto (tree-shaking).
- Dividir o bundle em chunks carregados sob demanda.
- Comprimir assets.

```bash
# Analisar o bundle
npx webpack-bundle-analyzer stats.json
```

### 6.2. V8 Code Caching

O V8 compila e cacheia código JavaScript. Na segunda execução, o código cacheado é carregado mais rápido.

### 6.3. Splash Screen

Mostre uma splash screen enquanto a inicialização pesada ocorre em background. O usuário percebe o app como rápido mesmo que a inicialização completa demore.

---

## 7. Arquitetura Recomendada: Background Server

Para apps com muitos dados, a arquitetura recomendada é separar o app em:

1. **Renderer process** — apenas UI, leve e responsivo.
2. **Background server** (hidden BrowserWindow ou worker) — processa dados, acessa SQLite, faz operações pesadas.

Isso libera a UI para ser responsiva e permite otimizar a memória do servidor em background separadamente.

```
┌─────────────────────────────┐
│     Renderer (UI leve)      │
│   HTML + CSS + JS mínimo    │
└──────────┬──────────────────┘
           │ IPC assíncrono
┌──────────▼──────────────────┐
│   Background Server         │
│   SQLite + Worker Threads   │
│   NAPI-RS / WASM            │
└─────────────────────────────┘
```

---

## 8. Checklist Rápido

- [ ] Fazer profiling antes de otimizar (DevTools, Chrome Tracing)
- [ ] Auditar dependências (`node --cpu-prof --heap-prof`)
- [ ] Implementar lazy loading de módulos
- [ ] Mover operações pesadas para worker threads / NAPI-RS / WASM
- [ ] Usar SQLite em vez de manter dados grandes em memória
- [ ] Configurar flags de aceleração GPU adequadas ao ambiente
- [ ] Verificar `chrome://gpu` para confirmar aceleração ativa
- [ ] Minimizar número de janelas/renderer processes
- [ ] Limpar listeners, conexões e caches não utilizados
- [ ] Usar `requestIdleCallback` para tarefas não-críticas
- [ ] Aplicar tree-shaking e analisar bundle
- [ ] Testar em build de produção (não dev mode)
- [ ] Manter Electron atualizado para aproveitar melhorias

---

## Referências

- [Electron — Performance (Documentação oficial)](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron — V8 Memory Cage](https://www.electronjs.org/blog/v8-memory-cage)
- [Electron — Offscreen Rendering](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering/)
- [Brainhub — Electron App Performance (NAPI-RS)](https://brainhub.eu/library/electron-app-performance)
- [Johnny Le — Building High-Performance Electron Apps](https://www.johnnyle.io/read/electron-performance)
- [Emad Ibrahim — Performance Optimization Guide](https://emadibrahim.com/electron-guide/performance)
- [The Secret of Good Electron Apps](https://archive.jlongster.com/secret-of-good-electron-apps)
- [Node.js — Understanding and Tuning Memory](https://nodejs.org/en/learn/diagnostics/memory/understanding-and-tuning-memory)
- [V8 GC Optimization (Platformatic)](https://blog.platformatic.dev/optimizing-nodejs-performance-v8-memory-management-and-gc-tuning)
