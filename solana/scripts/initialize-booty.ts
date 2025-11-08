/**
 * Initialize BOOTY Token
 *
 * This script initializes the BOOTY token after deployment.
 * It creates the token mint and sets up the program configuration.
 *
 * Usage:
 *   ts-node scripts/initialize-booty.ts <network>
 *
 * Examples:
 *   ts-node scripts/initialize-booty.ts devnet
 *   ts-node scripts/initialize-booty.ts mainnet
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Booty } from "../target/types/booty";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";

// Token configuration
const TOKEN_DECIMALS = 9; // Standard for Solana tokens
const MAX_SUPPLY = null; // null = unlimited, or set a number like 1_000_000_000_000_000_000n (1B tokens with decimals)

async function initializeBooty() {
  // Get network from command line argument
  const network = process.argv[2] || "devnet";

  console.log("========================================");
  console.log(`Initializing BOOTY Token on ${network}`);
  console.log("========================================\n");

  // Set up provider based on network
  let url: string;
  switch (network) {
    case "mainnet":
      url = "https://api.mainnet-beta.solana.com";
      break;
    case "devnet":
      url = "https://api.devnet.solana.com";
      break;
    case "localnet":
    case "localhost":
      url = "http://localhost:8899";
      break;
    default:
      console.error(`Unknown network: ${network}`);
      console.error("Valid options: devnet, mainnet, localnet");
      process.exit(1);
  }

  const connection = new anchor.web3.Connection(url, "confirmed");

  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  if (!fs.existsSync(walletPath)) {
    console.error(`Wallet not found at ${walletPath}`);
    console.error("Set ANCHOR_WALLET environment variable or ensure default wallet exists");
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.Booty as Program<Booty>;

  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", wallet.publicKey.toString());
  console.log("Network:", network);
  console.log("");

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
    console.error("Error: Insufficient balance. Need at least 0.1 SOL");
    process.exit(1);
  }
  console.log("");

  // Generate or load mint keypair
  const mintKeypairPath = `./target/deploy/booty-mint-${network}.json`;
  let mintKeypair: Keypair;

  if (fs.existsSync(mintKeypairPath)) {
    console.log("Loading existing mint keypair...");
    mintKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(mintKeypairPath, "utf-8")))
    );
    console.log("Loaded mint:", mintKeypair.publicKey.toString());
  } else {
    console.log("Generating new mint keypair...");
    mintKeypair = Keypair.generate();

    // Save the mint keypair
    fs.writeFileSync(
      mintKeypairPath,
      JSON.stringify(Array.from(mintKeypair.secretKey))
    );
    console.log("Generated mint:", mintKeypair.publicKey.toString());
    console.log(`Saved to: ${mintKeypairPath}`);
  }
  console.log("");

  // Derive config PDA
  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("Config PDA:", configPda.toString());
  console.log("");

  // Check if already initialized
  try {
    const config = await program.account.bootyConfig.fetch(configPda);
    console.log("⚠️  Token already initialized!");
    console.log("Existing configuration:");
    console.log("  Mint:", config.mint.toString());
    console.log("  Authority:", config.mintAuthority.toString());
    console.log("  Total Mined:", config.totalMined.toString());
    console.log("  Total Burned:", config.totalBurned.toString());
    console.log("  Max Supply:", config.maxSupply ? config.maxSupply.toString() : "Unlimited");
    console.log("");
    console.log("If you want to re-initialize, you need to:");
    console.log("1. Close the existing accounts");
    console.log("2. Use a different program ID");
    console.log("3. Or use a different network");
    process.exit(0);
  } catch (error) {
    // Config doesn't exist, continue with initialization
    console.log("Config not found, proceeding with initialization...\n");
  }

  // Confirm before proceeding
  if (network === "mainnet") {
    console.log("⚠️  WARNING: You are about to initialize on MAINNET!");
    console.log("This will use REAL SOL and cannot be easily undone.");
    console.log("");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("");
  }

  // Initialize the token
  console.log("Initializing BOOTY token...");
  console.log("  Decimals:", TOKEN_DECIMALS);
  console.log("  Max Supply:", MAX_SUPPLY ? MAX_SUPPLY.toString() : "Unlimited");
  console.log("");

  try {
    const tx = await program.methods
      .initialize(TOKEN_DECIMALS, MAX_SUPPLY)
      .accounts({
        mint: mintKeypair.publicKey,
        config: configPda,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("✅ Initialization successful!");
    console.log("Transaction signature:", tx);
    console.log("");

    // Fetch and display the config
    const config = await program.account.bootyConfig.fetch(configPda);

    console.log("========================================");
    console.log("BOOTY Token Configuration");
    console.log("========================================");
    console.log("Network:", network);
    console.log("Program ID:", program.programId.toString());
    console.log("Mint Address:", config.mint.toString());
    console.log("Config PDA:", configPda.toString());
    console.log("Authority:", config.mintAuthority.toString());
    console.log("Decimals:", TOKEN_DECIMALS);
    console.log("Max Supply:", config.maxSupply ? config.maxSupply.toString() : "Unlimited");
    console.log("");
    console.log("Explorer Link:");
    if (network === "mainnet") {
      console.log(`  Mint: https://explorer.solana.com/address/${config.mint.toString()}`);
      console.log(`  Program: https://explorer.solana.com/address/${program.programId.toString()}`);
    } else {
      console.log(`  Mint: https://explorer.solana.com/address/${config.mint.toString()}?cluster=${network}`);
      console.log(`  Program: https://explorer.solana.com/address/${program.programId.toString()}?cluster=${network}`);
    }
    console.log("");
    console.log("⚠️  IMPORTANT: Save these addresses!");
    console.log("========================================");

    // Save initialization info
    const initInfo = {
      network,
      programId: program.programId.toString(),
      mint: config.mint.toString(),
      config: configPda.toString(),
      authority: config.mintAuthority.toString(),
      decimals: TOKEN_DECIMALS,
      maxSupply: config.maxSupply ? config.maxSupply.toString() : null,
      txSignature: tx,
      timestamp: new Date().toISOString(),
    };

    const initInfoPath = `./target/deploy/booty-init-${network}.json`;
    fs.writeFileSync(initInfoPath, JSON.stringify(initInfo, null, 2));
    console.log(`Initialization info saved to: ${initInfoPath}`);

  } catch (error) {
    console.error("❌ Initialization failed!");
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
initializeBooty()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
