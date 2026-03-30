import { describe, it, expect } from "vitest";
import {
  parseSessionUsage,
  calculateCost,
  formatTokens,
  getContextWindowSize,
  type SessionTelemetry,
} from "../session-telemetry.js";

describe("session-telemetry", () => {
  describe("parseSessionUsage", () => {
    it("extracts cumulative usage from JSONL lines", () => {
      const lines = [
        '{"type":"user","message":{"role":"user"}}',
        '{"type":"assistant","message":{"model":"claude-opus-4-6","usage":{"input_tokens":1000,"output_tokens":200,"cache_creation_input_tokens":500,"cache_read_input_tokens":100},"content":[{"type":"text","text":"hello"}]}}',
        '{"type":"user","message":{"role":"user"}}',
        '{"type":"assistant","message":{"model":"claude-opus-4-6","usage":{"input_tokens":2000,"output_tokens":400,"cache_creation_input_tokens":0,"cache_read_input_tokens":800},"content":[{"type":"tool_use","name":"Read"},{"type":"text","text":"done"}]}}',
      ];
      const result = parseSessionUsage(lines);

      expect(result.totalInputTokens).toBe(3000);
      expect(result.totalOutputTokens).toBe(600);
      expect(result.totalCacheWriteTokens).toBe(500);
      expect(result.totalCacheReadTokens).toBe(900);
      expect(result.model).toBe("claude-opus-4-6");
      expect(result.lastTool).toBe("Read");
      expect(result.messageCount).toBe(2);
    });

    it("returns zeroes for empty input", () => {
      const result = parseSessionUsage([]);
      expect(result.totalInputTokens).toBe(0);
      expect(result.totalOutputTokens).toBe(0);
      expect(result.model).toBeNull();
      expect(result.lastTool).toBeNull();
    });

    it("skips malformed lines gracefully", () => {
      const lines = [
        "not json",
        '{"type":"assistant","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":500,"output_tokens":100},"content":[]}}',
      ];
      const result = parseSessionUsage(lines);
      expect(result.totalInputTokens).toBe(500);
      expect(result.model).toBe("claude-sonnet-4-6");
    });
  });

  describe("getContextWindowSize", () => {
    it("returns 1M for opus models", () => {
      expect(getContextWindowSize("claude-opus-4-6")).toBe(1_048_576);
    });

    it("returns 200k for sonnet models", () => {
      expect(getContextWindowSize("claude-sonnet-4-6")).toBe(200_000);
    });

    it("returns 200k for haiku models", () => {
      expect(getContextWindowSize("claude-haiku-4-5-20251001")).toBe(200_000);
    });

    it("returns 200k for unknown models", () => {
      expect(getContextWindowSize("unknown-model")).toBe(200_000);
    });

    it("returns 200k for null model", () => {
      expect(getContextWindowSize(null)).toBe(200_000);
    });
  });

  describe("parseSessionUsage contextPct", () => {
    it("calculates context percentage using 1M window for opus", () => {
      const lines = [
        '{"type":"assistant","message":{"model":"claude-opus-4-6","usage":{"input_tokens":1000,"output_tokens":200,"cache_creation_input_tokens":500,"cache_read_input_tokens":60000},"content":[]}}',
      ];
      const result = parseSessionUsage(lines);
      // 61500 tokens / 1_048_576 = ~5.9% → rounds to 6%
      expect(result.contextPct).toBe(6);
    });

    it("calculates context percentage using 200k window for sonnet", () => {
      const lines = [
        '{"type":"assistant","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":1000,"output_tokens":200,"cache_creation_input_tokens":500,"cache_read_input_tokens":60000},"content":[]}}',
      ];
      const result = parseSessionUsage(lines);
      // 61500 tokens / 200_000 = 30.75% → rounds to 31%
      expect(result.contextPct).toBe(31);
    });
  });

  describe("calculateCost", () => {
    it("calculates cost for opus model", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 1_000_000,
        totalOutputTokens: 100_000,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: "claude-opus-4-6",
        lastTool: null,
        messageCount: 1,
      };
      expect(calculateCost(telemetry)).toBeCloseTo(22.5, 1);
    });

    it("calculates cost with cache tokens", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 100_000,
        totalOutputTokens: 50_000,
        totalCacheWriteTokens: 200_000,
        totalCacheReadTokens: 500_000,
        model: "claude-sonnet-4-6",
        lastTool: null,
        messageCount: 1,
      };
      expect(calculateCost(telemetry)).toBeCloseTo(1.95, 2);
    });

    it("returns 0 for unknown model", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: "unknown-model",
        lastTool: null,
        messageCount: 1,
      };
      expect(calculateCost(telemetry)).toBe(0);
    });

    it("returns 0 for null model", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: null,
        lastTool: null,
        messageCount: 1,
      };
      expect(calculateCost(telemetry)).toBe(0);
    });
  });

  describe("formatTokens", () => {
    it("formats thousands as k", () => {
      expect(formatTokens(1500)).toBe("1.5k");
      expect(formatTokens(15000)).toBe("15.0k");
    });

    it("formats millions as M", () => {
      expect(formatTokens(1_500_000)).toBe("1.5M");
    });

    it("formats small numbers as-is", () => {
      expect(formatTokens(500)).toBe("500");
    });

    it("formats zero", () => {
      expect(formatTokens(0)).toBe("0");
    });
  });
});
