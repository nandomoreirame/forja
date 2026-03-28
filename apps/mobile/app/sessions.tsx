import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ForjaClient } from "@/lib/forja-client";
import type { ActiveSession } from "@forja/shared";

export default function SessionsScreen() {
  const { host, port, token } = useLocalSearchParams<{ host: string; port: string; token: string }>();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const forja = new ForjaClient(host, parseInt(port), token);
    forja.connect()
      .then(async () => {
        const res = await forja.listSessions();
        if (res.ok && res.data) setSessions(res.data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });

    return () => forja.disconnect();
  }, [host, port, token]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#cba6f7" size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.tabId}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.sessionType}>{item.sessionType}</Text>
            <Text style={styles.tabId}>{item.tabId}</Text>
            <Text style={styles.path}>{item.projectPath}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No active sessions</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#1e1e2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e2e" },
  error: { color: "#f38ba8", fontSize: 16 },
  empty: { color: "#a6adc8", textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#313244", padding: 16, borderRadius: 8, marginBottom: 8 },
  sessionType: { color: "#cba6f7", fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  tabId: { color: "#cdd6f4", fontSize: 12, fontFamily: "monospace", marginTop: 4 },
  path: { color: "#a6adc8", fontSize: 12, marginTop: 2 },
});
