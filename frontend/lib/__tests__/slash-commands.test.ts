import { describe, it, expect } from "vitest";
import {
  SLASH_COMMANDS,
  groupSlashCommands,
  filterSlashCommands,
  type SlashCommandDef,
} from "../slash-commands";

describe("SLASH_COMMANDS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(SLASH_COMMANDS)).toBe(true);
    expect(SLASH_COMMANDS.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.command).toBeDefined();
      expect(cmd.label).toBeDefined();
      expect(cmd.description).toBeDefined();
      expect(cmd.group).toBeDefined();
      expect(typeof cmd.command).toBe("string");
      expect(typeof cmd.label).toBe("string");
      expect(typeof cmd.description).toBe("string");
      expect(typeof cmd.group).toBe("string");
    }
  });

  it("commands with needsArgs have trailing space in command", () => {
    const argsCommands = SLASH_COMMANDS.filter((c) => c.needsArgs);
    expect(argsCommands.length).toBeGreaterThan(0);
    for (const cmd of argsCommands) {
      expect(cmd.command.endsWith(" ")).toBe(true);
    }
  });

  it("commands without needsArgs do not have trailing space", () => {
    const noArgsCommands = SLASH_COMMANDS.filter((c) => !c.needsArgs);
    expect(noArgsCommands.length).toBeGreaterThan(0);
    for (const cmd of noArgsCommands) {
      expect(cmd.command.endsWith(" ")).toBe(false);
    }
  });

  it("all commands start with /", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.command.trimEnd().startsWith("/")).toBe(true);
      expect(cmd.label.startsWith("/")).toBe(true);
    }
  });
});

describe("groupSlashCommands", () => {
  it("groups commands by their group field", () => {
    const groups = groupSlashCommands(SLASH_COMMANDS);
    expect(groups.length).toBeGreaterThan(0);

    for (const [groupName, commands] of groups) {
      expect(typeof groupName).toBe("string");
      expect(commands.length).toBeGreaterThan(0);
      for (const cmd of commands) {
        expect(cmd.group).toBe(groupName);
      }
    }
  });

  it("preserves insertion order of groups", () => {
    const commands: SlashCommandDef[] = [
      { command: "/a", label: "/a", description: "A", group: "First" },
      { command: "/b", label: "/b", description: "B", group: "Second" },
      { command: "/c", label: "/c", description: "C", group: "First" },
    ];
    const groups = groupSlashCommands(commands);
    expect(groups[0][0]).toBe("First");
    expect(groups[1][0]).toBe("Second");
    expect(groups[0][1]).toHaveLength(2);
    expect(groups[1][1]).toHaveLength(1);
  });

  it("returns Context, Skills, and Agents groups from SLASH_COMMANDS", () => {
    const groups = groupSlashCommands(SLASH_COMMANDS);
    const groupNames = groups.map(([name]) => name);
    expect(groupNames).toContain("Context");
    expect(groupNames).toContain("Skills");
    expect(groupNames).toContain("Agents");
  });
});

describe("filterSlashCommands", () => {
  it("returns all commands when query is empty", () => {
    const result = filterSlashCommands(SLASH_COMMANDS, "");
    expect(result).toEqual(SLASH_COMMANDS);
  });

  it("filters by command text (case insensitive)", () => {
    const result = filterSlashCommands(SLASH_COMMANDS, "context");
    expect(result.length).toBe(4);
    expect(result.every((c) => c.command.includes("context"))).toBe(true);
  });

  it("filters by description text", () => {
    const result = filterSlashCommands(SLASH_COMMANDS, "hub");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((c) => c.description.toLowerCase().includes("hub"))).toBe(true);
  });

  it("returns empty array when nothing matches", () => {
    const result = filterSlashCommands(SLASH_COMMANDS, "zzzznothing");
    expect(result).toEqual([]);
  });
});
