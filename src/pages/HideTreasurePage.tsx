/**
 * Hide Treasure Page
 * Example page showing how to use the Solana components
 *
 * To use this page in your app:
 * 1. Import it in your main app file
 * 2. Wrap your app with <WalletProvider>
 * 3. Render this page when user navigates to hide treasure
 */

import React from 'react';
import { WalletProvider } from '../components/solana/WalletProvider';
import { WalletButton } from '../components/solana/WalletButton';
import { HideTreasure } from '../components/solana/HideTreasure';

export function HideTreasurePage() {
  // Example token mint address (replace with actual PEPE, BONK, etc.)
  const EXAMPLE_TOKEN_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC devnet

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-50">
        <WalletButton />

        <header className="text-center py-10 bg-white border-b">
          <h1 className="text-4xl font-bold text-gray-900">⚔️ Dotty's Treasure Hunt</h1>
          <p className="text-lg text-gray-600 mt-2">Explore • Collect • Mint</p>
        </header>

        <HideTreasure tokenMint={EXAMPLE_TOKEN_MINT} />

        <footer className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Connect your Solana wallet (Phantom, Solflare, etc.)</li>
                <li>Hide treasure with memecoins (PEPE, BONK, or whitelisted tokens)</li>
                <li>Other players can find your hidden treasure on the game board</li>
                <li>Earn premium NFTs and $BOOTY tokens!</li>
              </ol>
            </div>

            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monster Types</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <span className="text-3xl">🐉</span>
                  <span className="text-sm text-gray-700">Dragon</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <span className="text-3xl">👺</span>
                  <span className="text-sm text-gray-700">Goblin</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <span className="text-3xl">🔥</span>
                  <span className="text-sm text-gray-700">Phoenix</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <span className="text-3xl">🦑</span>
                  <span className="text-sm text-gray-700">Kraken</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <span className="text-3xl">🦄</span>
                  <span className="text-sm text-gray-700">Unicorn</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </WalletProvider>
  );
}
