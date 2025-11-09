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
  console.log("Creating test token for wallet:", wallet.toString());
  console.log("");

  // Connect to local validator
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Generate a keypair for paying fees
  const payer = Keypair.generate();

  // Airdrop SOL to payer for fees
  console.log("Funding payer account...");
  const airdropSig = await connection.requestAirdrop(
    payer.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSig);
  console.log("✓ Payer funded");
  console.log("");

  // Create token mint (6 decimals, standard for most tokens)
  console.log("Creating token mint...");
  const tokenMint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    null,            // freeze authority
    6                // decimals
  );
  console.log("✓ Token mint created:", tokenMint.toString());
  console.log("");

  // Create token account for the wallet
  console.log("Creating token account for your wallet...");
  const walletTokenAccount = await createAccount(
    connection,
    payer,
    tokenMint,
    wallet
  );
  console.log("✓ Token account created");
  console.log("");

  // Mint 10,000 tokens to the wallet
  console.log("Minting 10,000 tokens to your wallet...");
  await mintTo(
    connection,
    payer,
    tokenMint,
    walletTokenAccount,
    payer.publicKey,
    10_000_000_000 // 10,000 tokens with 6 decimals
  );
  console.log("✓ Tokens minted");
  console.log("");

  // Save mint address to file for later use
  const mintFilePath = path.join(__dirname, "..", ".test-token-mint");
  fs.writeFileSync(mintFilePath, tokenMint.toString());
  console.log("✓ Mint address saved to:", mintFilePath);
  console.log("");

  // Output summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Test token ready!");
  console.log("");
  console.log("Token Mint:     ", tokenMint.toString());
  console.log("Your Balance:    10,000 tokens");
  console.log("Token Account:  ", walletTokenAccount.toString());
  console.log("");
  console.log("Next: The frontend will automatically use this token");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((error) => {
  console.error("Error creating test token:", error);
  process.exit(1);
});
