/**
 * Treasure Deposit Component
 * UI for depositing memecoins to receive monster NFTs
 */

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// Import IDL (will be generated after building)
// import treasureDepositIdl from '../../../solana/target/idl/treasure_deposit.json';

interface TreasureDepositProps {
  tokenMint?: string; // Token mint address (PEPE, BONK, etc.)
}

export function TreasureDeposit({ tokenMint }: TreasureDepositProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet } = useWallet();

  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositRecords, setDepositRecords] = useState<any[]>([]);

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

  // Fetch user's deposit records
  useEffect(() => {
    if (!publicKey) return;

    async function fetchDeposits() {
      // TODO: Fetch deposit records from program
      // For now, just placeholder
      setDepositRecords([]);
    }

    fetchDeposits();
  }, [publicKey]);

  const handleDeposit = async () => {
    if (!publicKey || !wallet || !tokenMint) {
      alert('Please connect your wallet first!');
      return;
    }

    if (depositAmount < 100) {
      alert('Minimum deposit is 100 tokens');
      return;
    }

    setIsDepositing(true);

    try {
      // TODO: Replace with actual program interaction
      // This is a stub showing the structure

      const programId = new PublicKey(process.env.TREASURE_DEPOSIT_PROGRAM_ID!);

      // Create provider
      const provider = new AnchorProvider(
        connection,
        wallet.adapter as any,
        { commitment: 'confirmed' }
      );

      // Load program (uncomment when IDL is available)
      // const program = new Program(treasureDepositIdl as any, programId, provider);

      // Derive PDAs
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault')],
        programId
      );

      const timestamp = Math.floor(Date.now() / 1000);
      const [depositRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('deposit'),
          publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray('le', 8))
        ],
        programId
      );

      // Get token accounts
      const mint = new PublicKey(tokenMint);
      const playerTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
      const vaultTokenAccount = await getAssociatedTokenAddress(mint, vaultPda, true);

      // Call deposit_for_monster instruction
      // const tx = await program.methods
      //   .depositForMonster(new anchor.BN(depositAmount * 1_000_000))
      //   .accounts({
      //     player: publicKey,
      //     playerTokenAccount,
      //     vaultTokenAccount,
      //     vault: vaultPda,
      //     depositRecord: depositRecordPda,
      //     tokenProgram: TOKEN_PROGRAM_ID,
      //     systemProgram: anchor.web3.SystemProgram.programId,
      //   })
      //   .rpc();

      // For now, just simulate
      console.log('Would deposit:', depositAmount, 'tokens');
      alert('Deposit successful! (Simulated - contract not deployed yet)');

      // Refresh balances
      setDepositAmount(100);
    } catch (error: any) {
      console.error('Deposit failed:', error);
      alert(`Deposit failed: ${error.message}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleClaim = async (depositRecordAddress: string) => {
    if (!publicKey || !wallet) return;

    try {
      // TODO: Implement claim monster instruction
      console.log('Would claim monster for deposit:', depositRecordAddress);
      alert('Claim successful! (Simulated)');
    } catch (error: any) {
      console.error('Claim failed:', error);
      alert(`Claim failed: ${error.message}`);
    }
  };

  if (!publicKey) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>🏴‍☠️ Treasure Deposit</h2>
        <p style={styles.subtitle}>Connect your wallet to deposit memecoins and receive monster NFTs!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏴‍☠️ Treasure Deposit</h2>
      <p style={styles.subtitle}>Deposit memecoins to receive random monster NFTs</p>

      {/* Balance Display */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceLabel}>Your Balance</div>
        <div style={styles.balanceAmount}>{tokenBalance.toLocaleString()} Tokens</div>
      </div>

      {/* Deposit Form */}
      <div style={styles.depositCard}>
        <label style={styles.label}>
          Deposit Amount (min. 100 tokens)
          <input
            type="number"
            min="100"
            step="10"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            style={styles.input}
          />
        </label>

        <div style={styles.monsterPreview}>
          <div style={styles.monsterLabel}>Monster Type:</div>
          <div style={styles.monsterType}>
            {getMonsterType(depositAmount)}
            <span style={styles.monsterEmoji}>{getMonsterEmoji(depositAmount)}</span>
          </div>
          <div style={styles.monsterHint}>
            (Changes based on deposit amount)
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={isDepositing || depositAmount < 100}
          style={{
            ...styles.depositButton,
            opacity: (isDepositing || depositAmount < 100) ? 0.6 : 1,
            cursor: (isDepositing || depositAmount < 100) ? 'not-allowed' : 'pointer',
          }}
        >
          {isDepositing ? 'Depositing...' : `Deposit ${depositAmount} Tokens`}
        </button>
      </div>

      {/* Deposit History */}
      <div style={styles.historyCard}>
        <h3 style={styles.historyTitle}>Your Deposits</h3>
        {depositRecords.length === 0 ? (
          <p style={styles.emptyState}>No deposits yet. Make your first deposit above!</p>
        ) : (
          depositRecords.map((record, index) => (
            <div key={index} style={styles.depositRecord}>
              <div>
                <div style={styles.recordAmount}>{record.amount} tokens</div>
                <div style={styles.recordDate}>{new Date(record.timestamp * 1000).toLocaleDateString()}</div>
              </div>
              <div>
                {record.claimed ? (
                  <span style={styles.claimedBadge}>✓ Claimed</span>
                ) : (
                  <button
                    onClick={() => handleClaim(record.address)}
                    style={styles.claimButton}
                  >
                    Claim Monster
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper functions
function getMonsterType(amount: number): string {
  const type = (amount % 5);
  const types = ['Dragon', 'Goblin', 'Phoenix', 'Kraken', 'Unicorn'];
  return types[type];
}

function getMonsterEmoji(amount: number): string {
  const type = (amount % 5);
  const emojis = ['🐉', '👺', '🔥', '🦑', '🦄'];
  return emojis[type];
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
