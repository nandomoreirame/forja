import { describe, it, expect, vi, beforeAll } from "vitest";

// Track which worker type was instantiated
const workerInstances: { type: string }[] = [];

// Mock worker class factory - uses actual class syntax so `new` works
function createWorkerClass(type: string) {
  return vi.fn(function (this: { type: string }) {
    this.type = type;
    workerInstances.push({ type });
  });
}

const MockEditorWorker = createWorkerClass("editor");
const MockJsonWorker = createWorkerClass("json");
const MockCssWorker = createWorkerClass("css");
const MockHtmlWorker = createWorkerClass("html");
const MockTsWorker = createWorkerClass("ts");

vi.mock("monaco-editor/esm/vs/editor/editor.worker?worker", () => ({ default: MockEditorWorker }));
vi.mock("monaco-editor/esm/vs/language/json/json.worker?worker", () => ({ default: MockJsonWorker }));
vi.mock("monaco-editor/esm/vs/language/css/css.worker?worker", () => ({ default: MockCssWorker }));
vi.mock("monaco-editor/esm/vs/language/html/html.worker?worker", () => ({ default: MockHtmlWorker }));
vi.mock("monaco-editor/esm/vs/language/typescript/ts.worker?worker", () => ({ default: MockTsWorker }));

type MonacoEnv = {
  getWorker: (workerId: string, label: string) => unknown;
};

type SelfWithMonaco = typeof globalThis & {
  MonacoEnvironment: MonacoEnv;
};

// Monaco workers module sets self.MonacoEnvironment on import
// ES modules are cached, so we import once and reuse the environment
let monacoEnv: MonacoEnv;

beforeAll(async () => {
  await import("../monaco-workers");
  monacoEnv = (self as unknown as SelfWithMonaco).MonacoEnvironment;
});

describe("monaco-workers", () => {
  it("should set MonacoEnvironment on self after import", () => {
    expect((self as unknown as SelfWithMonaco).MonacoEnvironment).toBeDefined();
  });

  it("should define getWorker function in MonacoEnvironment", () => {
    expect(typeof monacoEnv.getWorker).toBe("function");
  });

  it("should return json worker for json label", () => {
    MockJsonWorker.mockClear();
    const worker = monacoEnv.getWorker("", "json");
    expect(worker).toBeDefined();
    expect(MockJsonWorker).toHaveBeenCalled();
  });

  it("should return css worker for css label", () => {
    MockCssWorker.mockClear();
    monacoEnv.getWorker("", "css");
    expect(MockCssWorker).toHaveBeenCalled();
  });

  it("should return css worker for scss label", () => {
    MockCssWorker.mockClear();
    monacoEnv.getWorker("", "scss");
    expect(MockCssWorker).toHaveBeenCalled();
  });

  it("should return css worker for less label", () => {
    MockCssWorker.mockClear();
    monacoEnv.getWorker("", "less");
    expect(MockCssWorker).toHaveBeenCalled();
  });

  it("should return html worker for html label", () => {
    MockHtmlWorker.mockClear();
    monacoEnv.getWorker("", "html");
    expect(MockHtmlWorker).toHaveBeenCalled();
  });

  it("should return html worker for handlebars label", () => {
    MockHtmlWorker.mockClear();
    monacoEnv.getWorker("", "handlebars");
    expect(MockHtmlWorker).toHaveBeenCalled();
  });

  it("should return typescript worker for typescript label", () => {
    MockTsWorker.mockClear();
    monacoEnv.getWorker("", "typescript");
    expect(MockTsWorker).toHaveBeenCalled();
  });

  it("should return typescript worker for javascript label", () => {
    MockTsWorker.mockClear();
    monacoEnv.getWorker("", "javascript");
    expect(MockTsWorker).toHaveBeenCalled();
  });

  it("should return editor worker for unknown label", () => {
    MockEditorWorker.mockClear();
    monacoEnv.getWorker("", "unknown");
    expect(MockEditorWorker).toHaveBeenCalled();
  });
});
