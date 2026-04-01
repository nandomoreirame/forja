import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { ForjaClient } from "./forja-client";

interface ForjaConnection {
  host: string;
  port: number;
  token: string;
}

interface ForjaContextValue {
  client: ForjaClient | null;
  connection: ForjaConnection | null;
  isConnected: boolean;
  connect: (host: string, port: number, token: string) => Promise<void>;
  disconnect: () => void;
}

const ForjaContext = createContext<ForjaContextValue | null>(null);

export function ForjaProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<ForjaClient | null>(null);
  const [client, setClient] = useState<ForjaClient | null>(null);
  const [connection, setConnection] = useState<ForjaConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async (host: string, port: number, token: string) => {
    // Disconnect existing client if any
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setClient(null);
    setIsConnected(false);

    const newClient = new ForjaClient(host, port, token);

    // Listen for close events to update state
    newClient.on("close", () => {
      setIsConnected(false);
    });

    await newClient.connect();

    // Store in ref for immediate access + state for re-renders
    clientRef.current = newClient;
    setClient(newClient);
    setConnection({ host, port, token });
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setClient(null);
    setConnection(null);
    setIsConnected(false);
  }, []);

  return (
    <ForjaContext.Provider
      value={{
        client: client ?? clientRef.current,
        connection,
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </ForjaContext.Provider>
  );
}

export function useForja(): ForjaContextValue {
  const ctx = useContext(ForjaContext);
  if (!ctx) {
    throw new Error("useForja must be used within a ForjaProvider");
  }
  return ctx;
}
