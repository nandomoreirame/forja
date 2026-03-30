import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import { ForjaClient } from "@/lib/forja-client";
import type { ActiveSession } from "@forja/shared";

const SESSION_TYPE_COLORS: Record<string, string> = {
  claude: "#cba6f7",
  gemini: "#89b4fa",
  codex: "#a6e3a1",
  "gh-copilot": "#f9e2af",
  terminal: "#a6adc8",
};

function getSessionColor(sessionType: string): string {
  return SESSION_TYPE_COLORS[sessionType] ?? "#585b70";
}

export default function SessionsScreen() {
  const { host, port, token } = useLocalSearchParams<{ host: string; port: string; token: string }>();
  const navigation = useNavigation();
  const clientRef = useRef<ForjaClient | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect on mount
  useEffect(() => {
    if (!host || !port) {
      setError("Missing connection parameters");
      setLoading(false);
      return;
    }

    const client = new ForjaClient(host, parseInt(port, 10), token ?? "");
    clientRef.current = client;

    client
      .connect()
      .then(() => client.listSessions())
      .then((res) => {
        if (res.ok && res.data) {
          setSessions(res.data);
        } else if (!res.ok) {
          setError(res.error ?? "Failed to list sessions");
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [host, port, token]);

  const loadSessions = useCallback(
    async (showRefreshing = false) => {
      const client = clientRef.current;
      if (!client) {
        setError("Not connected");
        return;
      }
      if (showRefreshing) setRefreshing(true);
      try {
        const res = await client.listSessions();
        if (res.ok && res.data) {
          setSessions(res.data);
          setError(null);
        } else if (!res.ok) {
          setError(res.error ?? "Failed to list sessions");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setRefreshing(false);
      }
    },
    []
  );

  // Set navigation header buttons
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Sessions",
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            onPress={() => loadSessions(true)}
            hitSlop={8}
          >
            <Text style={styles.headerBtnText}>↺</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            onPress={() =>
              router.push({
                pathname: "/new-session",
                params: { host, port, token },
              })
            }
            hitSlop={8}
          >
            <Text style={styles.headerBtnTextLarge}>+</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, loadSessions, host, port, token]);

  const handleSessionPress = (session: ActiveSession) => {
    router.push({
      pathname: "/session/[tabId]",
      params: {
        tabId: session.tabId,
        host,
        port,
        token,
        displayName: session.displayName ?? session.sessionType,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#cba6f7" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); setError(null); }}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.tabId}
        refreshing={refreshing}
        onRefresh={() => loadSessions(true)}
        renderItem={({ item }) => {
          const color = getSessionColor(item.sessionType);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handleSessionPress(item)}
            >
              <View style={[styles.typeBadge, { backgroundColor: color + "22" }]}>
                <Text style={[styles.sessionType, { color }]}>{item.sessionType}</Text>
              </View>
              <Text style={styles.tabId} numberOfLines={1}>{item.displayName ?? item.sessionType}</Text>
              {item.projectPath ? (
                <Text style={styles.path} numberOfLines={1}>
                  {item.projectPath}
                </Text>
              ) : null}
              <Text style={[styles.chevron, { color }]}>›</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.empty}>No active sessions</Text>
            <Text style={styles.emptyHint}>Tap + to start a new session</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#1e1e2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e2e" },
  error: { color: "#f38ba8", fontSize: 16, textAlign: "center" },
  retryBtn: { marginTop: 16, backgroundColor: "#313244", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#cba6f7", fontWeight: "600" },
  headerButtons: { flexDirection: "row", gap: 8, marginRight: 4 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#313244",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtnPressed: { opacity: 0.6 },
  headerBtnText: { color: "#cdd6f4", fontSize: 18, lineHeight: 20 },
  headerBtnTextLarge: { color: "#cba6f7", fontSize: 22, lineHeight: 24, fontWeight: "300" },
  card: {
    backgroundColor: "#313244",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardPressed: { opacity: 0.7 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sessionType: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  tabId: { flex: 1, color: "#cdd6f4", fontSize: 12, fontFamily: "monospace" },
  path: { color: "#a6adc8", fontSize: 11, maxWidth: 100 },
  chevron: { fontSize: 20, fontWeight: "300" },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40, color: "#45475a" },
  empty: { color: "#a6adc8", fontSize: 16, fontWeight: "600" },
  emptyHint: { color: "#585b70", fontSize: 13 },
});
