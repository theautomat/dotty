/**
 * Treasure Hiding Component
 * UI for hiding treasure (depositing tokens into the vault)
 */

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// Import IDL and config
import gameIdl from '../../../solana/target/idl/game.json';
import { SOLANA_CONFIG } from '../../config/solana';

interface HideTreasureProps {
  tokenMint?: string; // Token mint address (PEPE, BONK, etc.)
}

export function HideTreasure({ tokenMint }: HideTreasureProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet } = useWallet();

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
    if (!publicKey || !wallet || !tokenMint) {
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
    console.log('wallet:', wallet);
    console.log('wallet.adapter:', wallet?.adapter);
    console.log('tokenMint:', tokenMint);

    // DEBUG: Log config values
    console.log('=== DEBUG: Config Values ===');
    console.log('SOLANA_CONFIG:', SOLANA_CONFIG);
    console.log('PROGRAM_ID:', SOLANA_CONFIG.PROGRAM_ID);
    console.log('TEST_TOKEN_MINT:', SOLANA_CONFIG.TEST_TOKEN_MINT);

    // DEBUG: Log IDL import
    console.log('=== DEBUG: IDL Import ===');
    console.log('gameIdl:', gameIdl);
    console.log('gameIdl type:', typeof gameIdl);
    console.log('gameIdl has metadata?:', 'metadata' in gameIdl);

    setIsHiding(true);

    try {
      // Create Anchor provider
      console.log('=== DEBUG: Creating Provider ===');
      const provider = new AnchorProvider(
        connection,
        wallet.adapter as any,
        { commitment: 'confirmed' }
      );
      console.log('Provider created:', provider);

      // Get program ID first
      console.log('=== DEBUG: Creating Program ID ===');
      const programId = new PublicKey(SOLANA_CONFIG.PROGRAM_ID);
      console.log('programId:', programId.toString());
      console.log('programId type:', typeof programId);
      console.log('programId._bn:', programId.toBuffer());

      // Load program with IDL and explicit program ID
      console.log('=== DEBUG: Creating Program ===');
      console.log('About to call: new Program(gameIdl, programId, provider)');
      console.log('  - gameIdl:', typeof gameIdl, gameIdl);
      console.log('  - programId:', programId.toString());
      console.log('  - provider:', provider);

      const program = new Program(gameIdl as Idl, programId, provider);
      console.log('Program created successfully:', program);

      // Derive PDAs
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault')],
        programId
      );

      // Get token accounts
      const mint = new PublicKey(tokenMint);
      const depositorTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
      const vaultTokenAccount = await getAssociatedTokenAddress(mint, vaultPda, true);

      // Call hideTreasure instruction using Anchor
      const tx = await program.methods
        .hideTreasure(new anchor.BN(amount * 1_000_000))
        .accounts({
          depositor: publicKey,
          vault: vaultPda,
          depositorTokenAccount,
          vaultTokenAccount,
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
      <div style={styles.container}>
        <h2 style={styles.title}>🏴‍☠️ Hide Treasure</h2>
        <p style={styles.subtitle}>Connect your wallet to hide treasure!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏴‍☠️ Hide Treasure</h2>
      <p style={styles.subtitle}>Hide treasure by depositing tokens into the vault</p>

      {/* Balance Display */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceLabel}>Your Balance</div>
        <div style={styles.balanceAmount}>{tokenBalance.toLocaleString()} Tokens</div>
      </div>

      {/* Hide Treasure Form */}
      <div style={styles.depositCard}>
        <label style={styles.label}>
          Amount to Hide (min. 100 tokens)
          <input
            type="number"
            min="100"
            step="100"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={styles.input}
          />
        </label>

        <button
          onClick={handleHideTreasure}
          disabled={isHiding || amount < 100}
          style={{
            ...styles.depositButton,
            opacity: (isHiding || amount < 100) ? 0.6 : 1,
            cursor: (isHiding || amount < 100) ? 'not-allowed' : 'pointer',
          }}
        >
          {isHiding ? 'Hiding Treasure...' : `Hide ${amount} Tokens`}
        </button>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,

  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '10px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: '30px',
  } as React.CSSProperties,

  balanceCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    color: 'white',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  balanceLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '5px',
  } as React.CSSProperties,

  balanceAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  depositCard: {
    background: '#fff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    marginTop: '8px',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  monsterPreview: {
    background: '#f5f5f5',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '20px',
    marginBottom: '20px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  monsterLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
  } as React.CSSProperties,

  monsterType: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  } as React.CSSProperties,

  monsterEmoji: {
    marginLeft: '8px',
    fontSize: '32px',
  } as React.CSSProperties,

  monsterHint: {
    fontSize: '11px',
    color: '#999',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,

  depositButton: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    background: 'linear-gradient(90deg, #9945FF, #14F195)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  } as React.CSSProperties,

  historyCard: {
    background: '#fff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '24px',
  } as React.CSSProperties,

  historyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  } as React.CSSProperties,

  emptyState: {
    textAlign: 'center' as const,
    color: '#999',
    padding: '20px',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,

  depositRecord: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,

  recordAmount: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  } as React.CSSProperties,

  recordDate: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  } as React.CSSProperties,

  claimedBadge: {
    padding: '6px 12px',
    background: '#14F195',
    color: 'white',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
  } as React.CSSProperties,

  claimButton: {
    padding: '8px 16px',
    background: '#9945FF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  } as React.CSSProperties,
};
