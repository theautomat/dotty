/**
 * Treasure Hiding Component
 * UI for hiding treasure on the game board for other players to find
 */

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// Import IDL and config
import gameIdlJson from '../../../solana/target/idl/game.json';
import { SOLANA_CONFIG } from '../../config/solana';

// Parse IDL to ensure it's a plain object
const gameIdl = JSON.parse(JSON.stringify(gameIdlJson));

interface HideTreasureProps {
  tokenMint?: string; // Token mint address (PEPE, BONK, etc.)
}

export function HideTreasure({ tokenMint }: HideTreasureProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [amount, setAmount] = useState<number>(100);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isHiding, setIsHiding] = useState(false);

  // Fetch user's token balance
  useEffect(() => {
    if (!publicKey || !tokenMint) return;

    async function fetchBalance() {
      try {
        const mint = new PublicKey(tokenMint!);
        const tokenAccount = await getAssociatedTokenAddress(mint, publicKey!);
        const accountInfo = await getAccount(connection, tokenAccount);

        // Convert from smallest unit (assuming 6 decimals)
        setTokenBalance(Number(accountInfo.amount) / 1_000_000);
      } catch (error) {
        console.log('No token account found or error:', error);
        setTokenBalance(0);
      }
    }

    fetchBalance();
  }, [publicKey, tokenMint, connection]);


  const handleHideTreasure = async () => {
    if (!publicKey || !anchorWallet || !tokenMint) {
      alert('Please connect your wallet first!');
      return;
    }

    if (amount < 100) {
      alert('Minimum amount is 100 tokens');
      return;
    }

    // DEBUG: Log wallet connection status
    console.log('=== DEBUG: Wallet Connection ===');
    console.log('publicKey:', publicKey?.toString());
    console.log('anchorWallet:', anchorWallet);
    console.log('tokenMint:', tokenMint);

    // DEBUG: Log config values
    console.log('=== DEBUG: Config Values ===');
    console.log('SOLANA_CONFIG:', SOLANA_CONFIG);
    console.log('PROGRAM_ID:', SOLANA_CONFIG.PROGRAM_ID);
    console.log('TREASURE_TOKEN_MINT:', SOLANA_CONFIG.TREASURE_TOKEN_MINT);
    console.log('BOOTY_TOKEN_MINT:', SOLANA_CONFIG.BOOTY_TOKEN_MINT);

    // DEBUG: Log IDL import
    console.log('=== DEBUG: IDL Import ===');
    console.log('gameIdl:', gameIdl);
    console.log('gameIdl type:', typeof gameIdl);
    console.log('gameIdl has metadata?:', 'metadata' in gameIdl);
    console.log('gameIdl.metadata:', (gameIdl as any).metadata);
    console.log('gameIdl.metadata.address:', (gameIdl as any).metadata?.address);
    console.log('gameIdl.metadata.address type:', typeof (gameIdl as any).metadata?.address);

    setIsHiding(true);

    try {
      // Create Anchor provider with useAnchorWallet hook (proper Anchor interface)
      console.log('=== DEBUG: Creating Provider ===');
      console.log('Connection endpoint:', connection.rpcEndpoint);
      console.log('Anchor wallet publicKey:', anchorWallet.publicKey.toString());

      const provider = new AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed' }
      );
      console.log('Provider created:', provider);
      console.log('Provider.connection.rpcEndpoint:', provider.connection.rpcEndpoint);
      console.log('Provider.wallet.publicKey:', provider.wallet.publicKey.toString());

      // Load program with IDL - extract programId from metadata first
      console.log('=== DEBUG: Creating Program ===');
      console.log('About to extract programId from IDL metadata...');

      // Extract programId explicitly
      const programIdString = (gameIdl as any).metadata?.address;
      console.log('  - programId from IDL:', programIdString);

      if (!programIdString) {
        throw new Error('Program ID not found in IDL metadata');
      }

      const programIdPubkey = new PublicKey(programIdString);
      console.log('  - programId as PublicKey:', programIdPubkey.toString());

      // Create Program with ONLY idl and provider (programId is in IDL metadata)
      let program: Program<Idl>;
      try {
        console.log('  - Attempting to create Program with 2 params (IDL has programId in metadata)...');
        console.log('  - Parameters:');
        console.log('    - IDL name:', (gameIdl as any).name);
        console.log('    - IDL programId from metadata:', programIdString);

        // Create program with explicit programId (Anchor 0.28.0 doesn't read from metadata)
        program = new Program(gameIdl as any, programIdPubkey, provider);

        console.log('  - ✓ Program created successfully!');
        console.log('  - Program.programId:', program.programId.toString());
      } catch (e: any) {
        console.error('  - ✗ Failed to create Program:', e.message);
        console.error('  - Error stack:', e.stack);
        throw e;
      }

      // Derive PDAs
      console.log('=== DEBUG: Deriving PDAs ===');
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault')],
        program.programId
      );
      console.log('  - Vault PDA:', vaultPda.toString());

      // Generate unique treasure ID using timestamp
      const treasureId = new anchor.BN(Date.now());
      console.log('  - Treasure ID:', treasureId.toString());

      // Derive treasure_record PDA
      const [treasureRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('treasure'),
          publicKey.toBuffer(),
          treasureId.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      );
      console.log('  - Treasure Record PDA:', treasureRecordPda.toString());

      // Get token accounts
      const mint = new PublicKey(tokenMint);
      const playerTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
      const vaultTokenAccount = await getAssociatedTokenAddress(mint, vaultPda, true);

      console.log('=== DEBUG: Token Accounts ===');
      console.log('  - Player token account:', playerTokenAccount.toString());
      console.log('  - Vault token account:', vaultTokenAccount.toString());

      // Call hideTreasure instruction using Anchor
      const tx = await program.methods
        .hideTreasure(
          new anchor.BN(amount * 1_000_000),
          treasureId
        )
        .accounts({
          player: publicKey,
          playerTokenAccount,
          vaultTokenAccount,
          vault: vaultPda,
          treasureRecord: treasureRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Treasure hidden! Transaction:', tx);
      alert(`Treasure hidden successfully!\n\nAmount: ${amount} tokens\nTransaction: ${tx}`);

      // Refresh balances
      setAmount(100);
    } catch (error: any) {
      console.error('Failed to hide treasure:', error);
      alert(`Failed to hide treasure: ${error.message}`);
    } finally {
      setIsHiding(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">🏴‍☠️ Hide Treasure</h2>
        <p className="text-gray-600 text-center">Connect your wallet to hide treasure!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">🏴‍☠️ Hide Treasure</h2>
      <p className="text-gray-600 text-center mb-8">Hide treasure on the game board - other players can find it!</p>

      {/* Balance Display */}
      <div className="bg-white rounded-lg p-6 mb-6 border shadow-sm text-center">
        <div className="text-sm text-gray-600 mb-2">Your Balance</div>
        <div className="text-3xl font-bold text-gray-900">{tokenBalance.toLocaleString()} Tokens</div>
      </div>

      {/* Hide Treasure Form */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <label className="block mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Hide (min. 100 tokens)
          </span>
          <input
            type="number"
            min="100"
            step="100"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          />
        </label>

        <button
          onClick={handleHideTreasure}
          disabled={isHiding || amount < 100}
          className="w-full px-6 py-3 text-lg font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isHiding ? 'Hiding Treasure...' : `Hide ${amount} Tokens`}
        </button>
      </div>
    </div>
  );
}
