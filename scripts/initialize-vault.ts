/**
 * Initialize the treasure vault
 * This should be run once by the admin when setting up the system
 */

import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read command line arguments
const treasureTokenMintAddress = process.argv[2];
const bootyTokenMintAddress = process.argv[3];

if (!treasureTokenMintAddress || !bootyTokenMintAddress) {
  console.error('Error: Both token mint addresses required');
  console.error('Usage: npx ts-node scripts/initialize-vault.ts <TREASURE_MINT> <BOOTY_MINT>');
  process.exit(1);
}

async function initializeVault() {
  try {
    // Connect to local validator
    const connection = new Connection('http://localhost:8899', 'confirmed');

    // Get keypair path from Solana CLI config
    const solanaConfig = execSync('solana config get', { encoding: 'utf-8' });
    const keypairPathMatch = solanaConfig.match(/Keypair Path: (.+)/);
    if (!keypairPathMatch) {
      throw new Error('Could not find keypair path in Solana config');
    }
    const authorityKeypairPath = keypairPathMatch[1].trim();

    // Load authority keypair
    const authorityKeypairData = JSON.parse(fs.readFileSync(authorityKeypairPath, 'utf-8'));
    const authority = Keypair.fromSecretKey(new Uint8Array(authorityKeypairData));

    console.log('Authority:', authority.publicKey.toString());

    // Create provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: authority.publicKey,
        signTransaction: async (tx: any) => { tx.sign(authority); return tx; },
        signAllTransactions: async (txs: any[]) => { txs.forEach((tx: any) => tx.sign(authority)); return txs; }
      } as any,
      { commitment: 'confirmed' }
    );

    // Load program IDL
    const idlPath = path.join(__dirname, '../solana/target/idl/game.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

    // Get program ID from IDL
    const programId = new PublicKey(idl.metadata.address);
    console.log('Program ID:', programId.toString());

    // Create program instance
    const program = new Program(idl, programId, provider);

    // Derive vault PDA
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      program.programId
    );
    console.log('Vault PDA:', vaultPda.toString());

    // Check if vault already initialized
    try {
      const vaultAccount: any = await program.account.treasureVault.fetch(vaultPda);
      console.log('✓ Vault already initialized');
      console.log('  Authority:', vaultAccount.authority.toString());
      console.log('  Total hidden:', vaultAccount.totalHidden.toString());
      console.log('  Total claimed:', vaultAccount.totalClaimed.toString());
    } catch (error) {
      console.log('Vault not initialized, creating...');

      // Initialize vault
      const tx = await program.methods
        .initializeVault()
        .accounts({
          authority: authority.publicKey,
          vault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      console.log('✓ Vault initialized! Transaction:', tx);
    }

    // Create vault's TREASURE token account
    const treasureMint = new PublicKey(treasureTokenMintAddress);
    const vaultTreasureAccount = await getAssociatedTokenAddress(treasureMint, vaultPda, true);

    console.log('\nVault TREASURE token account:', vaultTreasureAccount.toString());

    // Check if vault TREASURE token account exists
    try {
      const accountInfo = await connection.getAccountInfo(vaultTreasureAccount);
      if (accountInfo) {
        console.log('✓ Vault TREASURE token account already exists');
      } else {
        throw new Error('Account not found');
      }
    } catch (error) {
      console.log('Creating vault TREASURE token account...');

      // Create vault's associated token account
      const createAtaIx = createAssociatedTokenAccountInstruction(
        authority.publicKey,    // payer
        vaultTreasureAccount,   // ata
        vaultPda,              // owner (the vault PDA)
        treasureMint           // mint
      );

      const tx = new anchor.web3.Transaction().add(createAtaIx);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = authority.publicKey;
      tx.sign(authority);

      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig);

      console.log('✓ Vault TREASURE token account created! Transaction:', sig);
    }

    // Create vault's BOOTY token account
    const bootyMint = new PublicKey(bootyTokenMintAddress);
    const vaultBootyAccount = await getAssociatedTokenAddress(bootyMint, vaultPda, true);

    console.log('\nVault BOOTY token account:', vaultBootyAccount.toString());

    // Check if vault BOOTY token account exists
    try {
      const accountInfo = await connection.getAccountInfo(vaultBootyAccount);
      if (accountInfo) {
        console.log('✓ Vault BOOTY token account already exists');
      } else {
        throw new Error('Account not found');
      }
    } catch (error) {
      console.log('Creating vault BOOTY token account...');

      // Create vault's associated token account
      const createAtaIx = createAssociatedTokenAccountInstruction(
        authority.publicKey, // payer
        vaultBootyAccount,   // ata
        vaultPda,           // owner (the vault PDA)
        bootyMint           // mint
      );

      const tx = new anchor.web3.Transaction().add(createAtaIx);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = authority.publicKey;
      tx.sign(authority);

      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig);

      console.log('✓ Vault BOOTY token account created! Transaction:', sig);
    }

    console.log('\n✓ Vault setup complete!');
    console.log('  Vault PDA:', vaultPda.toString());
    console.log('  Vault TREASURE token account:', vaultTreasureAccount.toString());
    console.log('  Vault BOOTY token account:', vaultBootyAccount.toString());

  } catch (error) {
    console.error('Error initializing vault:', error);
    process.exit(1);
  }
}

initializeVault();
