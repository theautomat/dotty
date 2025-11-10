import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { HideTreasure } from './src/components/solana/HideTreasure';
import { SOLANA_CONFIG } from './src/config/solana';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Use localhost for testing
const network = WalletAdapterNetwork.Devnet;
const endpoint = 'http://localhost:8899'; // Local validator

console.log('=== APP CONFIG ===');
console.log('Network:', network);
console.log('Endpoint:', endpoint);

const wallets = [new PhantomWalletAdapter()];

function App() {
  // Token mint from config (auto-updated by dev:local script)
  const TEST_TOKEN_MINT = SOLANA_CONFIG.TEST_TOKEN_MINT;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>🏴‍☠️ Hide Treasure Test</h1>

      {!TEST_TOKEN_MINT && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3>⚠️ Setup Required</h3>
          <p>Before you can hide treasure, you need to:</p>
          <ol>
            <li>Start the local Solana validator: <code>npm run solana:validator</code></li>
            <li>Deploy the program: <code>npm run solana:setup</code></li>
            <li>Create a test token mint (see console for instructions)</li>
            <li>Update <code>TEST_TOKEN_MINT</code> in this file</li>
          </ol>
        </div>
      )}

      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {/* Connect Wallet Button */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <WalletMultiButton />
            </div>

            {/* Hide Treasure Component */}
            <HideTreasure tokenMint={TEST_TOKEN_MINT} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('hide-treasure-app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
