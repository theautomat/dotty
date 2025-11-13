/**
 * Wallet Provider Component
 * Wraps the app with Solana wallet adapter context
 * Supports multiple wallets: Phantom, Solflare, etc.
 */

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Determine network from environment or default to localhost for local development
  const endpoint = useMemo(() => {
    // Check if we're in local development mode
    if (import.meta.env.DEV || window.location.hostname === 'localhost') {
      return 'http://localhost:8899';
    }
    // Otherwise use configured network or devnet
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';
    return clusterApiUrl(network);
  }, []);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Add more wallets here as needed
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
