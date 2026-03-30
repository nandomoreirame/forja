import { ForjaClient } from "@/lib/forja-client";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import ForjaLogo from "@/assets/forja-logo.svg";

const DEFAULT_PORT = 9400;

export default function ConnectScreen() {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width - 48, 400) * 0.6;
  const [host, setHost] = useState("");
  const [token, setToken] = useState("");

  const handleHostChange = (text: string) => {
    // Accept commas (pt-BR decimal separator) and convert to dots
    const cleaned = text.replace(/,/g, ".").replace(/[^0-9.]/g, "").replace(/\.{2,}/g, ".");
    const parts = cleaned.split(".");
    if (parts.length > 4) return;
    // Limit each octet to max 3 digits
    const limited = parts.map((p) => p.slice(0, 3)).join(".");
    if (limited.length > 15) return;
    setHost(limited);
  };
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!host.trim()) {
      setError("Host IP is required");
      return;
    }
    if (!token.trim() || token.trim().length !== 4) {
      setError("Enter the 4-digit token from Forja Desktop");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const testClient = new ForjaClient(host.trim(), DEFAULT_PORT, token.trim());
      await testClient.connect();
      const res = await testClient.ping();
      testClient.disconnect();

      if (!res.ok) {
        setError("Authentication failed. Check the token.");
        return;
      }

      router.push({
        pathname: "/sessions",
        params: { host: host.trim(), port: String(DEFAULT_PORT), token: token.trim() },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed. Check the IP address.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <ForjaLogo width={logoWidth} height={logoWidth * (327 / 1172)} />
          </View>
          <Text style={styles.title}>Remote Control</Text>
          <Text style={styles.subtitle}>Connect to your Forja Desktop instance</Text>

          <TextInput
            style={styles.input}
            value={host}
            onChangeText={handleHostChange}
            maxLength={15}
            placeholder="Host IP (e.g. 192.168.1.100)"
            placeholderTextColor="#585b70"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="decimal-pad"
            returnKeyType="done"
            editable={!connecting}
          />
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="4-digit token"
            placeholderTextColor="#585b70"
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={4}
            editable={!connecting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, connecting && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color="#1e1e2e" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#1e1e2e" },
  container: { flexGrow: 1, padding: 24, justifyContent: "center", backgroundColor: "#1e1e2e" },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#cdd6f4", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#a6adc8", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#313244",
    color: "#cdd6f4",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: "#f38ba8", fontSize: 14, marginBottom: 8, textAlign: "center" },
  button: { backgroundColor: "#cba6f7", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#1e1e2e", fontSize: 16, fontWeight: "600" },
});
