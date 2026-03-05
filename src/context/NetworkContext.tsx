import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

interface NetworkContextValue {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isConnected: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnection = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected ?? true);
    } catch {
      // Assume connected if check fails
    }
  };

  useEffect(() => {
    checkConnection();

    // Poll every 5 seconds
    intervalRef.current = setInterval(checkConnection, 5000);

    // Also check when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkConnection();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
