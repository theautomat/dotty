import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { HideTreasure } from './src/components/solana/HideTreasure';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Use localhost for testing
const network = WalletAdapterNetwork.Devnet;
const endpoint = 'http://localhost:8899'; // Local validator

const wallets = [new PhantomWalletAdapter()];

function App() {
  // TODO: Replace with actual token mint address
  // For now, you'll need to create a test token
  const TEST_TOKEN_MINT = '26sqF2oNfqngd5gXSeKQ4v29Qvdojfc5LVwd2arTaw4d'; // Set this after creating a test token

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
