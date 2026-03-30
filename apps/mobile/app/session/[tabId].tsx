import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { ForjaClient } from "@/lib/forja-client";
import { stripAnsi } from "@/lib/ansi-strip";

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

interface PtyEvent {
  type: "pty-event";
  event: "data" | "session-start" | "session-exit";
  tabId: string;
  data?: string;
  exitCode?: number;
}

export default function SessionChatScreen() {
  const { tabId, host, port, token, displayName } = useLocalSearchParams<{
    tabId: string;
    host: string;
    port: string;
    token: string;
    displayName?: string;
  }>();
  const navigation = useNavigation();
  const clientRef = useRef<ForjaClient | null>(null);

  const [output, setOutput] = useState("");
  const [loadingOutput, setLoadingOutput] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionExited, setSessionExited] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Set screen title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: displayName ?? "Session",
      headerBackTitle: "Sessions",
    });
  }, [navigation, displayName]);

  // Connect and load session
  useEffect(() => {
    if (!host || !port || !tabId) {
      setLoadingOutput(false);
      return;
    }

    const client = new ForjaClient(host, parseInt(port, 10), token ?? "");
    clientRef.current = client;

    let cleanup: (() => void) | null = null;

    client
      .connect()
      .then(async () => {
        // Load existing output buffer
        try {
          const res = await client.getSessionOutput(tabId);
          if (res.ok && res.data) {
            setOutput(stripAnsi(res.data.content));
          }
        } catch {
          // Non-fatal
        }
        setLoadingOutput(false);

        // Subscribe to real-time PTY events
        try {
          await client.subscribe(tabId);
        } catch {
          // Non-fatal
        }

        // Register PTY event listener
        cleanup = client.on("pty-event", (raw: unknown) => {
          const event = raw as PtyEvent;
          if (event.tabId !== tabId) return;

          if (event.event === "data" && event.data) {
            setOutput((prev) => prev + stripAnsi(event.data!));
            requestAnimationFrame(() => {
              scrollRef.current?.scrollToEnd({ animated: false });
            });
          } else if (event.event === "session-exit") {
            setSessionExited(true);
          }
        });
      })
      .catch(() => {
        setLoadingOutput(false);
      });

    return () => {
      cleanup?.();
      client.disconnect();
      clientRef.current = null;
    };
  }, [host, port, token, tabId]);

  const handleSend = async () => {
    const client = clientRef.current;
    if (!client || !tabId || !inputText.trim() || sending) return;

    const text = inputText;
    setInputText("");
    setSending(true);

    try {
      await client.sendInput(tabId, text + "\r");
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Output area */}
      <View style={styles.outputContainer}>
        {loadingOutput ? (
          <View style={styles.center}>
            <ActivityIndicator color="#cba6f7" />
            <Text style={styles.loadingText}>Loading output...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
          >
            {output.length > 0 ? (
              <Text style={styles.outputText} selectable>
                {output}
              </Text>
            ) : (
              <Text style={styles.emptyOutput}>No output yet. Send a prompt below.</Text>
            )}
            {sessionExited ? (
              <Text style={styles.exitedBadge}>— session exited —</Text>
            ) : null}
          </ScrollView>
        )}
      </View>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={sessionExited ? "Session has ended" : "Send a prompt..."}
          placeholderTextColor="#585b70"
          multiline
          maxLength={4000}
          editable={!sessionExited && !sending}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!inputText.trim() || sending || sessionExited) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending || sessionExited}
        >
          {sending ? (
            <ActivityIndicator color="#1e1e2e" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1e2e" },
  outputContainer: { flex: 1, backgroundColor: "#11111b" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { color: "#a6adc8", fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 8 },
  outputText: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    lineHeight: 18,
    color: "#cdd6f4",
  },
  emptyOutput: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    color: "#585b70",
    fontStyle: "italic",
  },
  exitedBadge: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    color: "#f38ba8",
    marginTop: 8,
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#1e1e2e",
    borderTopWidth: 1,
    borderTopColor: "#313244",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#313244",
    color: "#cdd6f4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    fontFamily: MONO_FONT,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#cba6f7",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#45475a" },
  sendBtnText: { color: "#1e1e2e", fontSize: 20, fontWeight: "700", lineHeight: 22 },
});
