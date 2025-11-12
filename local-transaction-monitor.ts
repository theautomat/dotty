#!/usr/bin/env ts-node

/**
 * Local Transaction Monitor (Development Only)
 *
 * Also known as "Helius Simulator" - simulates Helius webhook behavior locally
 *
 * This service monitors the local Solana validator for game program transactions
 * (hide_treasure and search_treasure) and forwards them to the webhook handler
 * in Helius format.
 *
 * ⚠️  LOCAL DEVELOPMENT ONLY ⚠️
 * In production, Helius handles transaction monitoring and webhook delivery.
 * This script is only for local development to test the full webhook flow.
 *
 * How it works:
 * 1. Polls localhost:8899 every 2 seconds for new transactions
 * 2. Filters for game program instruction calls (hide_treasure, search_treasure)
 * 3. Fetches full transaction details
 * 4. Formats as Helius-style webhook payload
 * 5. POSTs to appropriate webhook endpoint
 *    - Hide transactions → http://localhost:3000/api/webhooks/helius
 *    - Search transactions → http://localhost:3000/api/webhooks/search
 *
 * Usage:
 *   npm run dev:monitor
 *
 * Prerequisites:
 * - Local validator running: npm run solana:validator
 * - Server running: FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev
 * - Firebase emulator: npm run firebase:emulator
 */

import { Connection, PublicKey } from "@solana/web3.js";
import http from "http";

// Type for parsed transaction (inlined to avoid import issues)
type ParsedTransactionWithMeta = any;

// Configuration
const VALIDATOR_URL = "http://localhost:8899";
const HIDE_WEBHOOK_URL = "http://localhost:3000/api/webhooks/helius";
const SEARCH_WEBHOOK_URL = "http://localhost:3000/api/webhooks/search";
const PROGRAM_ID = new PublicKey("7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh");
const POLL_INTERVAL = 2000; // 2 seconds
const AUTH_HEADER = process.env.HELIUS_WEBHOOK_AUTH_HEADER || "test-auth-secret";

const TransactionType = {
  HIDE_TREASURE: "HIDE_TREASURE",
  SEARCH_TREASURE: "SEARCH_TREASURE",
} as const;

type TransactionType = typeof TransactionType[keyof typeof TransactionType];

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
    console.log("🔍 Local Transaction Monitor (Helius Simulator)");
    console.log("================================================");
    console.log(`   Validator: ${VALIDATOR_URL}`);
    console.log(`   Hide Webhook: ${HIDE_WEBHOOK_URL}`);
    console.log(`   Search Webhook: ${SEARCH_WEBHOOK_URL}`);
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
    console.log("👀 Monitoring for game program transactions (hide_treasure, search_treasure)...\n");

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
   * Process a transaction and send to webhook if it's a game program transaction
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

      // Determine transaction type
      const txType = this.getTransactionType(tx);

      if (!txType) {
        return; // Not a game program transaction
      }

      if (txType === TransactionType.HIDE_TREASURE) {
        console.log(`💎 Found hide_treasure transaction: ${signature}`);

        // Extract token transfers
        const tokenTransfers = this.extractTokenTransfers(tx);

        if (tokenTransfers.length === 0) {
          console.log(`   ⚠️  No token transfers found`);
          return;
        }

        // Create Helius-style webhook payload
        const payload = this.createHideWebhookPayload(tx, signature, tokenTransfers);

        // Send to hide webhook
        await this.sendToWebhook(payload, HIDE_WEBHOOK_URL);

        console.log(`   ✅ Forwarded to hide webhook handler`);

      } else if (txType === TransactionType.SEARCH_TREASURE) {
        console.log(`🔍 Found search_treasure transaction: ${signature}`);

        // Extract coordinates from logs
        const coordinates = this.extractSearchCoordinates(tx);

        if (!coordinates) {
          console.log(`   ⚠️  Could not extract coordinates`);
          return;
        }

        console.log(`   📍 Coordinates: (${coordinates.x}, ${coordinates.y})`);

        // Create search webhook payload
        const payload = this.createSearchWebhookPayload(tx, signature, coordinates);

        // Send to search webhook
        await this.sendToWebhook(payload, SEARCH_WEBHOOK_URL);

        console.log(`   ✅ Forwarded to search webhook handler`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing transaction ${signature}:`, error);
    }
  }

  /**
   * Determine transaction type (hide or search)
   */
  private getTransactionType(tx: ParsedTransactionWithMeta): TransactionType | null {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      // Check if instruction is from our program
      if ("programId" in ix && ix.programId.equals(PROGRAM_ID)) {
        // Check logs to determine instruction type
        const logs = tx.meta?.logMessages || [];

        for (const log of logs) {
          if (log.includes("Player hiding") || log.includes("Treasure hidden")) {
            return TransactionType.HIDE_TREASURE;
          }
          if (log.includes("Player searching") || log.includes("Search recorded")) {
            return TransactionType.SEARCH_TREASURE;
          }
        }

        // If we can't determine from logs, check if there are token transfers
        // (hide transactions always have token transfers, search transactions don't)
        if (tx.meta?.preTokenBalances && tx.meta?.postTokenBalances) {
          const hasTokenTransfers = tx.meta.preTokenBalances.length > 0 ||
                                   tx.meta.postTokenBalances.length > 0;
          if (hasTokenTransfers) {
            return TransactionType.HIDE_TREASURE;
          } else {
            return TransactionType.SEARCH_TREASURE;
          }
        }

        // Default to hide if we can't determine
        return TransactionType.HIDE_TREASURE;
      }
    }

    return null;
  }

  /**
   * Extract search coordinates from transaction logs
   */
  private extractSearchCoordinates(tx: ParsedTransactionWithMeta): { x: number; y: number } | null {
    const logs = tx.meta?.logMessages || [];

    for (const log of logs) {
      // Look for log message like: "Player searching for treasure at coordinates (10, 20)"
      const match = log.match(/coordinates \((-?\d+),\s*(-?\d+)\)/);
      if (match) {
        return {
          x: parseInt(match[1], 10),
          y: parseInt(match[2], 10),
        };
      }
    }

    return null;
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
        (p: any) =>
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
        const sender = postBalances.find((p: any) => {
          const senderPre = preBalances.find(
            (sp: any) => sp.accountIndex === p.accountIndex && sp.mint === p.mint
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
   * Create Helius-style webhook payload for hide transactions
   */
  private createHideWebhookPayload(
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
   * Create Helius-style webhook payload for search transactions
   */
  private createSearchWebhookPayload(
    tx: ParsedTransactionWithMeta,
    signature: string,
    coordinates: { x: number; y: number }
  ) {
    const feePayer = tx.transaction.message.accountKeys[0].pubkey.toString();

    return [
      {
        signature,
        type: "UNKNOWN",
        timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
        slot: tx.slot,
        fee: tx.meta?.fee || 5000,
        feePayer,

        // Native transfers (empty for search)
        nativeTransfers: [],

        // Token transfers (none for search)
        tokenTransfers: [],

        // Account data
        accountData: [
          {
            account: feePayer,
            nativeBalanceChange: -(tx.meta?.fee || 5000),
            tokenBalanceChanges: [],
          },
        ],

        // Description
        description: `Treasure search at (${coordinates.x}, ${coordinates.y})`,

        // Events (program-specific)
        events: [
          {
            type: "SEARCH_TREASURE",
            programId: PROGRAM_ID.toString(),
            data: {
              wallet: feePayer,
              x: coordinates.x,
              y: coordinates.y,
            },
          },
        ],
      },
    ];
  }

  /**
   * Send payload to webhook endpoint
   */
  private async sendToWebhook(payload: any, webhookUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const payloadStr = JSON.stringify(payload);

      // Parse the webhook URL to get path
      const url = new URL(webhookUrl);

      const options = {
        hostname: url.hostname,
        port: parseInt(url.port) || 3000,
        path: url.pathname,
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
