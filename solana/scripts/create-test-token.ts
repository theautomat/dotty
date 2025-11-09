/**
 * Create Test SPL Token for Treasure Hiding
 *
 * This script creates a simple SPL token and mints initial supply to a wallet.
 * Used for local testing of the treasure hiding feature.
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, createAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Get wallet address from command line
  const walletAddress = process.argv[2];
  if (!walletAddress) {
    console.error("Error: Wallet address required");
    console.error("Usage: ts-node create-test-token.ts <WALLET_ADDRESS>");
    process.exit(1);
  }

  const wallet = new PublicKey(walletAddress);
  console.log("");

  // Connect to local validator
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Generate a keypair for paying fees
  const payer = Keypair.generate();

  // Airdrop SOL to payer for fees
  console.log("  → Funding transaction fee account with SOL (for gas fees)...");
  const airdropSig = await connection.requestAirdrop(
    payer.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSig);
  console.log("  ✓ Transaction fee account funded with 2 SOL");
  console.log("");

  // Create token mint (6 decimals, standard for most tokens)
  console.log("  → Creating TREASURE token mint (allows creation of tokens)...");
  const tokenMint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    null,            // freeze authority
    6                // decimals
  );
  console.log("  ✓ Token mint created at address:", tokenMint.toString());
  console.log("");

  // Create token account for the wallet
  console.log("  → Creating token account for wallet", wallet.toString() + "...");
  const walletTokenAccount = await createAccount(
    connection,
    payer,
    tokenMint,
    wallet
  );
  console.log("  ✓ Token account created at address:", walletTokenAccount.toString());
  console.log("");

  // Mint 10,000 tokens to the wallet
  console.log("  → Minting 10,000 TREASURE tokens to wallet", wallet.toString() + "...");
  await mintTo(
    connection,
    payer,
    tokenMint,
    walletTokenAccount,
    payer.publicKey,
    10_000_000_000 // 10,000 tokens with 6 decimals
  );
  console.log("  ✓ 10,000 tokens minted successfully");
  console.log("");

  // Save mint address to file for later use
  const mintFilePath = path.join(__dirname, "..", ".test-token-mint");
  fs.writeFileSync(mintFilePath, tokenMint.toString());
  console.log("  ✓ Token mint address saved to solana/.test-token-mint (for config update)");
  console.log("");
}

main().catch((error) => {
  console.error("Error creating test token:", error);
  process.exit(1);
});
