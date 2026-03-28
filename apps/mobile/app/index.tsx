import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function ConnectScreen() {
  const [host, setHost] = useState("192.168.1.100");
  const [port, setPort] = useState("9400");
  const [token, setToken] = useState("");

  const connect = () => {
    router.push({
      pathname: "/sessions",
      params: { host, port, token },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forja Remote Control</Text>
      <Text style={styles.subtitle}>Connect to your Forja instance</Text>

      <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="Host IP" placeholderTextColor="#585b70" />
      <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="Port" placeholderTextColor="#585b70" keyboardType="numeric" />
      <TextInput style={styles.input} value={token} onChangeText={setToken} placeholder="Auth Token" placeholderTextColor="#585b70" secureTextEntry />

      <Pressable style={styles.button} onPress={connect}>
        <Text style={styles.buttonText}>Connect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#1e1e2e" },
  title: { fontSize: 28, fontWeight: "bold", color: "#cdd6f4", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#a6adc8", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#313244", color: "#cdd6f4", padding: 14, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#cba6f7", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#1e1e2e", fontSize: 16, fontWeight: "600" },
});
