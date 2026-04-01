import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import type { SvgProps } from "react-native-svg";
import Svg, { Path } from "react-native-svg";
import { ForjaClient } from "@/lib/forja-client";
import type { ActiveSession } from "@forja/shared";

import ClaudeIcon from "@/assets/claude.svg";
import GeminiIcon from "@/assets/gemini.svg";
import CodexIcon from "@/assets/openai.svg";
import CursorIcon from "@/assets/cursor.svg";
import CopilotIcon from "@/assets/github-copilot.svg";
import TerminalIcon from "@/assets/terminal.svg";

const SESSION_TYPE_COLORS: Record<string, string> = {
  claude: "#cba6f7",
  gemini: "#89b4fa",
  codex: "#a6e3a1",
  "cursor-agent": "#fab387",
  "gh-copilot": "#f9e2af",
  terminal: "#a6adc8",
};

const SESSION_TYPE_ICONS: Record<string, React.FC<SvgProps>> = {
  claude: ClaudeIcon,
  gemini: GeminiIcon,
  codex: CodexIcon,
  "cursor-agent": CursorIcon,
  "gh-copilot": CopilotIcon,
  terminal: TerminalIcon,
};

/** Icons that use currentColor and need an explicit color prop (no hardcoded fill). */
const ICONS_NEEDING_COLOR = new Set(["codex", "cursor-agent", "gh-copilot", "terminal"]);

function getSessionColor(sessionType: string): string {
  return SESSION_TYPE_COLORS[sessionType] ?? "#585b70";
}

const ACTIONS_WIDTH = 100; // two icon buttons side by side

function SwipeableRow({ onDelete, onRename, cardWidth, children }: { onDelete: () => void; onRename: () => void; cardWidth: number; children: React.ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: ACTIONS_WIDTH, animated: false });
    });
  }, []);

  return (
    <View style={styles.swipeContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={[0, ACTIONS_WIDTH]}
        decelerationRate="fast"
      >
        <View style={styles.swipeActions}>
          <Pressable style={styles.swipeActionBtn} onPress={onRename}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#89b4fa" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#89b4fa" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Pressable style={styles.swipeActionBtn} onPress={onDelete}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="#f38ba8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
        <View style={{ width: cardWidth }}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export default function SessionsScreen() {
  const { host, port, token } = useLocalSearchParams<{ host: string; port: string; token: string }>();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32; // container padding 16*2
  const clientRef = useRef<ForjaClient | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [renameTarget, setRenameTarget] = useState<{ tabId: string; currentName: string } | null>(null);
  const [renameText, setRenameText] = useState("");

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
    async () => {
      const client = clientRef.current;
      if (!client) {
        setError("Not connected");
        return;
      }
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
            onPress={() => loadSessions()}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M21 12a9 9 0 1 1-2.636-6.364" stroke="#cdd6f4" strokeWidth={1.8} strokeLinecap="round" />
              <Path d="M21 3v6h-6" stroke="#cdd6f4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/new-session",
                params: { host, port, token },
              })
            }
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke="#cdd6f4" strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
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

  const showToast = useCallback((message: string) => {
    setToast(message);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastOpacity]);

  const handleCloseSession = async (tabId: string) => {
    const client = clientRef.current;
    if (!client) return;
    const session = sessions.find((s) => s.tabId === tabId);
    const name = session?.displayName ?? session?.sessionType ?? "Session";
    try {
      await client.closeSession(tabId);
      setSessions((prev) => prev.filter((s) => s.tabId !== tabId));
      showToast(`${name} closed`);
    } catch {
      showToast("Failed to close session");
    }
  };

  const openRenameDialog = (session: ActiveSession) => {
    const name = session.displayName ?? session.sessionType;
    setRenameTarget({ tabId: session.tabId, currentName: name });
    setRenameText(name);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameText.trim()) return;
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.renameSession(renameTarget.tabId, renameText.trim());
      setSessions((prev) =>
        prev.map((s) =>
          s.tabId === renameTarget.tabId ? { ...s, displayName: renameText.trim() } : s
        )
      );
      showToast(`Renamed to ${renameText.trim()}`);
    } catch {
      showToast("Failed to rename session");
    }
    setRenameTarget(null);
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
        contentContainerStyle={sessions.length === 0 ? styles.listEmpty : undefined}
        renderItem={({ item }) => {
          const color = getSessionColor(item.sessionType);
          const Icon = SESSION_TYPE_ICONS[item.sessionType];
          return (
            <SwipeableRow onDelete={() => handleCloseSession(item.tabId)} onRename={() => openRenameDialog(item)} cardWidth={cardWidth}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => handleSessionPress(item)}
              >
                {Icon ? (
                  <Icon width={20} height={20} color={ICONS_NEEDING_COLOR.has(item.sessionType) ? color : undefined} />
                ) : (
                  <View style={[styles.iconFallback, { backgroundColor: color + "22" }]}>
                    <Text style={[styles.iconFallbackText, { color }]}>?</Text>
                  </View>
                )}
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName} numberOfLines={1}>{item.displayName ?? item.sessionType}</Text>
                  {item.projectPath ? (
                    <Text style={styles.path} numberOfLines={1}>
                      {item.projectPath.split("/").pop()}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.chevron, { color }]}>›</Text>
              </Pressable>
            </SwipeableRow>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Svg width={56} height={56} viewBox="0 0 24 24" fill="none" style={styles.emptyIcon}>
              <Path d="M2 4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" stroke="#585b70" strokeWidth={1.2} />
              <Path d="M6 9l3 3-3 3" stroke="#585b70" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M12 17h6" stroke="#585b70" strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
            <Text style={styles.emptyTitle}>No active sessions</Text>
            <Text style={styles.emptyHint}>Tap + to start a new session</Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBtn, pressed && styles.emptyBtnPressed]}
              onPress={() => router.push({ pathname: "/new-session", params: { host, port, token } })}
            >
              <Text style={styles.emptyBtnText}>+ New Session</Text>
            </Pressable>
          </View>
        }
      />
      <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRenameTarget(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Rename Session</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Tab name"
              placeholderTextColor="#585b70"
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleRename}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalBtn} onPress={() => setRenameTarget(null)}>
                <Text style={styles.modalBtnCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleRename}>
                <Text style={styles.modalBtnSave}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {toast ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#1e1e2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e2e" },
  error: { color: "#f38ba8", fontSize: 16, textAlign: "center" },
  retryBtn: { marginTop: 16, backgroundColor: "#313244", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#cba6f7", fontWeight: "600" },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerBtnPressed: { opacity: 0.4 },
  swipeContainer: { marginBottom: 8 },
  swipeActions: { width: ACTIONS_WIDTH, flexDirection: "row", alignItems: "stretch" },
  swipeActionBtn: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#313244",
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardPressed: { opacity: 0.7 },
  iconFallback: { width: 20, height: 20, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  iconFallbackText: { fontSize: 12, fontWeight: "700" },
  sessionInfo: { flex: 1 },
  sessionName: { color: "#cdd6f4", fontSize: 14, fontWeight: "500" },
  path: { color: "#a6adc8", fontSize: 11, marginTop: 2 },
  chevron: { fontSize: 20, fontWeight: "300" },
  listEmpty: { flex: 1, justifyContent: "center" },
  emptyContainer: { alignItems: "center", gap: 12 },
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { color: "#a6adc8", fontSize: 18, fontWeight: "600" },
  emptyHint: { color: "#6c7086", fontSize: 14 },
  emptyBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#45475a",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnPressed: { opacity: 0.5, backgroundColor: "#45475a22" },
  emptyBtnText: { color: "#cdd6f4", fontSize: 15, fontWeight: "500" },
  toast: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: "#45475a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  toastText: { color: "#cdd6f4", fontSize: 14, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalContent: {
    backgroundColor: "#313244",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: { color: "#cdd6f4", fontSize: 17, fontWeight: "600", marginBottom: 16 },
  modalInput: {
    backgroundColor: "#1e1e2e",
    color: "#cdd6f4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  modalBtnPrimary: { backgroundColor: "#cba6f7" },
  modalBtnCancel: { color: "#a6adc8", fontSize: 15, fontWeight: "500" },
  modalBtnSave: { color: "#1e1e2e", fontSize: 15, fontWeight: "600" },
});
