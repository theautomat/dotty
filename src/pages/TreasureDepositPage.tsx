/**
 * Treasure Deposit Page
 * Example page showing how to use the Solana components
 *
 * To use this page in your app:
 * 1. Import it in your main app file
 * 2. Wrap your app with <WalletProvider>
 * 3. Render this page when user navigates to treasure deposit
 */

import React from 'react';
import { WalletProvider } from '../components/solana/WalletProvider';
import { WalletButton } from '../components/solana/WalletButton';
import { TreasureDeposit } from '../components/solana/TreasureDeposit';

export function TreasureDepositPage() {
  // Example token mint address (replace with actual PEPE, BONK, etc.)
  const EXAMPLE_TOKEN_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC devnet

  return (
    <WalletProvider>
      <div style={styles.page}>
        <WalletButton />

        <header style={styles.header}>
          <h1 style={styles.gameTitle}>⚔️ Dotty's Treasure Hunt</h1>
          <p style={styles.tagline}>Explore • Collect • Mint</p>
        </header>

        <TreasureDeposit tokenMint={EXAMPLE_TOKEN_MINT} />

        <footer style={styles.footer}>
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>How It Works</h3>
            <ol style={styles.infoList}>
              <li>Connect your Solana wallet (Phantom, Solflare, etc.)</li>
              <li>Deposit memecoins (PEPE, BONK, or whitelisted tokens)</li>
              <li>Receive a random monster NFT based on deposit amount</li>
              <li>Claim your monster and use it in the game!</li>
            </ol>
          </div>

          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Monster Types</h3>
            <div style={styles.monsterGrid}>
              <div style={styles.monsterItem}>
                <span style={styles.monsterIcon}>🐉</span>
                <span>Dragon</span>
              </div>
              <div style={styles.monsterItem}>
                <span style={styles.monsterIcon}>👺</span>
                <span>Goblin</span>
              </div>
              <div style={styles.monsterItem}>
                <span style={styles.monsterIcon}>🔥</span>
                <span>Phoenix</span>
              </div>
              <div style={styles.monsterItem}>
                <span style={styles.monsterIcon}>🦑</span>
                <span>Kraken</span>
              </div>
              <div style={styles.monsterItem}>
                <span style={styles.monsterIcon}>🦄</span>
                <span>Unicorn</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </WalletProvider>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    color: 'white',
    padding: '20px',
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    padding: '40px 20px',
  } as React.CSSProperties,

  gameTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    background: 'linear-gradient(90deg, #9945FF, #14F195)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as React.CSSProperties,

  tagline: {
    fontSize: '18px',
    color: '#ccc',
    margin: 0,
  } as React.CSSProperties,

  footer: {
    maxWidth: '800px',
    margin: '40px auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  } as React.CSSProperties,

  infoCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '24px',
  } as React.CSSProperties,

  infoTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#14F195',
  } as React.CSSProperties,

  infoList: {
    paddingLeft: '20px',
    lineHeight: '1.8',
    color: '#ddd',
  } as React.CSSProperties,

  monsterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,

  monsterItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
  } as React.CSSProperties,

  monsterIcon: {
    fontSize: '32px',
  } as React.CSSProperties,
};
