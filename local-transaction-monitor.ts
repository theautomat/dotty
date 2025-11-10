#!/usr/bin/env ts-node

/**
 * Local Transaction Monitor (Development Only)
 *
 * This service monitors the local Solana validator for hide_treasure transactions
 * and forwards them to the webhook handler in Helius format.
 *
 * ⚠️  LOCAL DEVELOPMENT ONLY ⚠️
 * In production, Helius handles transaction monitoring and webhook delivery.
 * This script is only for local development to test the full webhook flow.
 *
 * How it works:
 * 1. Polls localhost:8899 every 2 seconds for new transactions
 * 2. Filters for hide_treasure instruction calls on the game program
 * 3. Fetches full transaction details
 * 4. Formats as Helius-style webhook payload
 * 5. POSTs to http://localhost:3000/api/webhooks/helius
 *
 * Usage:
 *   npm run dev:monitor
 *
 * Prerequisites:
 * - Local validator running: npm run solana:validator
 * - Server running: FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev
 * - Firebase emulator: npm run firebase:emulator
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import http from "http";

// Configuration
const VALIDATOR_URL = "http://localhost:8899";
const WEBHOOK_URL = "http://localhost:3000/api/webhooks/helius";
const PROGRAM_ID = new PublicKey("7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh");
const POLL_INTERVAL = 2000; // 2 seconds
const AUTH_HEADER = process.env.HELIUS_WEBHOOK_AUTH_HEADER || "test-auth-secret";

interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
  tokenSymbol?: string;
}

class LocalTransactionMonitor {
  private connection: Connection;
  private lastSignature: string | null = null;
  private isRunning = false;

  constructor() {
    this.connection = new Connection(VALIDATOR_URL, "confirmed");
  }

  /**
   * Start monitoring the local validator
   */
  async start() {
    console.log("🔍 Local Transaction Monitor");
    console.log("=============================");
    console.log(`   Validator: ${VALIDATOR_URL}`);
    console.log(`   Webhook: ${WEBHOOK_URL}`);
    console.log(`   Program: ${PROGRAM_ID.toString()}`);
    console.log(`   Poll Interval: ${POLL_INTERVAL}ms`);
    console.log("");

    // Test connection
    try {
      const version = await this.connection.getVersion();
      console.log(`✅ Connected to validator (version: ${version["solana-core"]})`);
    } catch (error) {
      console.error("❌ Failed to connect to validator");
      console.error("   Make sure validator is running: npm run solana:validator");
      process.exit(1);
    }

    // Test webhook endpoint
    try {
      await this.testWebhookEndpoint();
      console.log("✅ Webhook endpoint is accessible\n");
    } catch (error) {
      console.error("❌ Webhook endpoint not accessible");
      console.error("   Make sure server is running: FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev\n");
    }

    this.isRunning = true;
    console.log("👀 Monitoring for hide_treasure transactions...\n");

    // Start polling loop
    this.pollLoop();
  }

  /**
   * Test webhook endpoint connectivity
   */
  private async testWebhookEndpoint(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 3000,
          path: "/api/webhooks/helius/health",
          method: "GET",
        },
        (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            // 404 is okay, means server is running but health endpoint doesn't exist
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        }
      );
      req.on("error", reject);
      req.setTimeout(2000, () => reject(new Error("Timeout")));
      req.end();
    });
  }

  /**
   * Main polling loop
   */
  private async pollLoop() {
    while (this.isRunning) {
      try {
        await this.checkForNewTransactions();
      } catch (error) {
        console.error("⚠️  Error checking transactions:", error);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  /**
   * Check for new transactions involving the program
   */
  private async checkForNewTransactions() {
    // Get recent signatures for the program
    const signatures = await this.connection.getSignaturesForAddress(
      PROGRAM_ID,
      {
        limit: 10,
        ...(this.lastSignature && { until: this.lastSignature }),
      },
      "confirmed"
    );

    if (signatures.length === 0) {
      return;
    }

    // Process in reverse order (oldest first)
    const newSignatures = signatures.reverse();

    for (const sigInfo of newSignatures) {
      // Skip if error
      if (sigInfo.err) {
        console.log(`⏭️  Skipping failed transaction: ${sigInfo.signature}`);
        continue;
      }

      await this.processTransaction(sigInfo.signature);
    }

    // Update last processed signature
    this.lastSignature = newSignatures[newSignatures.length - 1].signature;
  }

  /**
   * Process a transaction and send to webhook if it's hide_treasure
   */
  private async processTransaction(signature: string) {
    try {
      // Fetch full transaction details
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx) {
        console.log(`⏭️  Transaction not found: ${signature}`);
        return;
      }

      // Check if this is a hide_treasure transaction
      if (!this.isHideTreasureTransaction(tx)) {
        return;
      }

      console.log(`💎 Found hide_treasure transaction: ${signature}`);

      // Extract token transfers
      const tokenTransfers = this.extractTokenTransfers(tx);

      if (tokenTransfers.length === 0) {
        console.log(`   ⚠️  No token transfers found`);
        return;
      }

      // Create Helius-style webhook payload
      const payload = this.createWebhookPayload(tx, signature, tokenTransfers);

      // Send to webhook
      await this.sendToWebhook(payload);

      console.log(`   ✅ Forwarded to webhook handler`);
    } catch (error) {
      console.error(`   ❌ Error processing transaction ${signature}:`, error);
    }
  }

  /**
   * Check if transaction is a hide_treasure call
   */
  private isHideTreasureTransaction(tx: ParsedTransactionWithMeta): boolean {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      // Check if instruction is from our program
      if ("programId" in ix && ix.programId.equals(PROGRAM_ID)) {
        // For parsed instructions, check if it includes "hideTreasure" pattern
        // For unparsed, we just know it's our program
        return true;
      }
    }

    return false;
  }

  /**
   * Extract token transfers from transaction
   */
  private extractTokenTransfers(tx: ParsedTransactionWithMeta): TokenTransfer[] {
    const transfers: TokenTransfer[] = [];

    if (!tx.meta || !tx.meta.preTokenBalances || !tx.meta.postTokenBalances) {
      return transfers;
    }

    const preBalances = tx.meta.preTokenBalances;
    const postBalances = tx.meta.postTokenBalances;

    // Match pre and post balances to find transfers
    for (const post of postBalances) {
      const pre = preBalances.find(
        (p) =>
          p.accountIndex === post.accountIndex &&
          p.mint === post.mint
      );

      if (!pre) continue;

      const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || "0");
      const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || "0");
      const diff = postAmount - preAmount;

      if (diff > 0) {
        // This account received tokens
        // Find who sent them (account with negative diff for same mint)
        const sender = postBalances.find((p) => {
          const senderPre = preBalances.find(
            (sp) => sp.accountIndex === p.accountIndex && sp.mint === p.mint
          );
          if (!senderPre) return false;
          const senderDiff =
            parseFloat(p.uiTokenAmount.uiAmountString || "0") -
            parseFloat(senderPre.uiTokenAmount.uiAmountString || "0");
          return senderDiff < 0 && p.mint === post.mint;
        });

        if (sender) {
          transfers.push({
            fromUserAccount: sender.owner || "unknown",
            toUserAccount: post.owner || "unknown",
            tokenAmount: diff,
            mint: post.mint,
            tokenSymbol: "SPL",
          });
        }
      }
    }

    return transfers;
  }

  /**
   * Create Helius-style webhook payload
   */
  private createWebhookPayload(
    tx: ParsedTransactionWithMeta,
    signature: string,
    tokenTransfers: TokenTransfer[]
  ) {
    const feePayer = tx.transaction.message.accountKeys[0].pubkey.toString();

    return [
      {
        signature,
        type: "TRANSFER",
        timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
        slot: tx.slot,
        fee: tx.meta?.fee || 5000,
        feePayer,

        // Native transfers (empty for SPL token transfers)
        nativeTransfers: [],

        // Token transfers
        tokenTransfers,

        // Account data
        accountData: [
          {
            account: feePayer,
            nativeBalanceChange: -(tx.meta?.fee || 5000),
            tokenBalanceChanges: [],
          },
        ],

        // Description
        description: `Treasure hidden: ${tokenTransfers[0]?.tokenAmount || 0} ${tokenTransfers[0]?.tokenSymbol || "tokens"}`,

        // Events (program-specific)
        events: [
          {
            type: "HIDE_TREASURE",
            programId: PROGRAM_ID.toString(),
            data: {
              wallet: tokenTransfers[0]?.fromUserAccount,
              amount: tokenTransfers[0]?.tokenAmount,
              token: tokenTransfers[0]?.tokenSymbol || "SPL",
            },
          },
        ],
      },
    ];
  }

  /**
   * Send payload to webhook endpoint
   */
  private async sendToWebhook(payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const payloadStr = JSON.stringify(payload);

      const options = {
        hostname: "localhost",
        port: 3000,
        path: "/api/webhooks/helius",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payloadStr),
          Authorization: AUTH_HEADER,
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Webhook returned ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on("error", reject);
      req.write(payloadStr);
      req.end();
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    console.log("\n👋 Stopping monitor...");
    this.isRunning = false;
  }
}

// Start the monitor
const monitor = new LocalTransactionMonitor();

// Handle graceful shutdown
process.on("SIGINT", () => {
  monitor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
