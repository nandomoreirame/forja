import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ForjaClient } from "@/lib/forja-client";

interface CliType {
  id: string;
  label: string;
  description: string;
  color: string;
}

const CLI_TYPES: CliType[] = [
  { id: "claude", label: "Claude", description: "Anthropic's Claude CLI", color: "#cba6f7" },
  { id: "gemini", label: "Gemini", description: "Google Gemini CLI", color: "#89b4fa" },
  { id: "codex", label: "Codex", description: "OpenAI Codex CLI", color: "#a6e3a1" },
  { id: "gh-copilot", label: "GitHub Copilot", description: "GitHub Copilot Agent", color: "#f9e2af" },
  { id: "terminal", label: "Terminal", description: "Plain terminal session", color: "#a6adc8" },
];

export default function NewSessionScreen() {
  const { host, port, token } = useLocalSearchParams<{ host: string; port: string; token: string }>();
  const clientRef = useRef<ForjaClient | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!host || !port) return;

    const client = new ForjaClient(host, parseInt(port, 10), token ?? "");
    clientRef.current = client;

    client.connect().then(() => setConnected(true)).catch(() => setError("Connection failed"));

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [host, port, token]);

  const handleCreate = async (cliType: CliType) => {
    const client = clientRef.current;
    if (!client || !connected) {
      setError("Not connected");
      return;
    }
    setLoading(cliType.id);
    setError(null);
    try {
      const res = await client.newSession(cliType.id);
      if (!res.ok) {
        setError(res.error ?? "Failed to create session");
        setLoading(null);
        return;
      }

      // Wait for the session to be created on the desktop side, then find it
      let tabId: string | null = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 500));
        const sessions = await client.listSessions();
        if (sessions.ok && sessions.data) {
          const match = sessions.data.find((s) => s.sessionType === cliType.id);
          if (match) {
            tabId = match.tabId;
            break;
          }
        }
      }

      if (tabId) {
        router.replace({
          pathname: "/session/[tabId]",
          params: { tabId, host, port, token },
        });
      } else {
        // Session created but couldn't find it, go back to sessions list
        router.back();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>New Session</Text>
      <Text style={styles.subheading}>Choose a CLI type to start</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={CLI_TYPES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isLoading = loading === item.id;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handleCreate(item)}
              disabled={loading !== null}
            >
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <View style={styles.cardContent}>
                <Text style={styles.cliLabel}>{item.label}</Text>
                <Text style={styles.cliDesc}>{item.description}</Text>
              </View>
              {isLoading ? (
                <ActivityIndicator color={item.color} size="small" />
              ) : (
                <Text style={[styles.arrow, { color: item.color }]}>›</Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1e2e", padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: "#cdd6f4", marginBottom: 4 },
  subheading: { fontSize: 13, color: "#a6adc8", marginBottom: 20 },
  error: { color: "#f38ba8", fontSize: 14, marginBottom: 12 },
  list: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#313244",
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  cardPressed: { opacity: 0.7 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  cardContent: { flex: 1 },
  cliLabel: { color: "#cdd6f4", fontSize: 16, fontWeight: "600" },
  cliDesc: { color: "#a6adc8", fontSize: 12, marginTop: 2 },
  arrow: { fontSize: 22, fontWeight: "300" },
});
