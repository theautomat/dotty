import type { Request, Response, NextFunction } from 'express';
import { treasureService } from './treasure-service';
import type { TreasureData } from './treasure-service';

/**
 * Helius Webhook Handler
 *
 * Handles incoming webhooks from Helius for Solana transaction monitoring.
 * Verifies webhook authenticity and processes hidden treasure transactions.
 *
 * Helius Webhook Documentation:
 * https://docs.helius.dev/webhooks-and-websockets/webhooks
 */

// Helius webhook payload types
export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint?: string;
  tokenSymbol?: string;
}

export interface HeliusEvent {
  type: string;
  programId?: string;
  data?: Record<string, any>;
}

export interface HeliusTransaction {
  signature: string;
  type?: string;
  timestamp: number;
  slot?: number;
  fee?: number;
  feePayer?: string;
  description?: string;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
  accountData?: any[];
  events?: HeliusEvent[];
}

/**
 * Middleware to verify Helius webhook authorization header
 *
 * Helius webhooks support authentication via an authorization header.
 * When creating a webhook in the Helius dashboard or via API, you can set an `authHeader`.
 * Helius will send this value in the `Authorization` header with each webhook request.
 *
 * Setup:
 * 1. Create webhook in Helius dashboard or via API
 * 2. Set an authHeader value (e.g., "Bearer your-secret-key")
 * 3. Store this value in HELIUS_WEBHOOK_AUTH_HEADER environment variable
 * 4. This middleware will verify incoming requests match your configured auth header
 *
 * @param expectedAuthHeader - The auth header you set when creating the webhook
 * @returns Express middleware function
 */
export function verifyHeliusAuth(expectedAuthHeader: string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    // If no auth header is configured, skip verification (dev mode)
    if (!expectedAuthHeader) {
      console.warn('⚠️  Helius webhook auth header not configured - accepting all requests');
      next();
      return;
    }

    // Verify authorization header matches
    if (authHeader !== expectedAuthHeader) {
      console.error('❌ Invalid Helius webhook authorization header');
      console.error(`Expected: ${expectedAuthHeader}`);
      console.error(`Received: ${authHeader}`);
      res.status(401).json({
        success: false,
        error: 'Unauthorized - invalid authorization header'
      });
      return;
    }

    next();
  };
}

/**
 * Parse Helius webhook payload and extract hidden treasure information
 *
 * @param heliusPayload - Raw payload from Helius webhook
 * @returns Parsed transaction data or null if not a hideTreasure transaction
 */
export function parseHeliusTransaction(heliusPayload: HeliusTransaction[]): TreasureData | null {
  try {
    const GAME_PROGRAM_ID = '7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh';

    for (const transaction of heliusPayload) {
      const { signature, timestamp, slot, fee, accountData, tokenTransfers } = transaction;

      if (!signature) {
        console.warn('⚠️  Transaction missing signature');
        continue;
      }

      // Check if this transaction involves our game program
      const isGameProgram = accountData?.some(
        account => account.account === GAME_PROGRAM_ID || account.nativeBalanceChange !== undefined
      ) || transaction.type?.includes('UNKNOWN'); // Helius might not recognize our custom program

      if (!isGameProgram && accountData) {
        // Double check token transfers for our program involvement
        const hasGameProgramTransfer = tokenTransfers?.some(transfer =>
          transfer.fromUserAccount || transfer.toUserAccount
        );

        if (!hasGameProgramTransfer) {
          console.log(`⏭️  Transaction ${signature} does not involve game program`);
          continue;
        }
      }

      // Extract token transfer information (hideTreasure always involves a token transfer)
      let walletAddress = '';
      let amount = 0;
      let tokenMint = 'SOL';

      if (tokenTransfers && tokenTransfers.length > 0) {
        // Find the transfer FROM the player TO the vault
        const treasureTransfer = tokenTransfers[0];
        walletAddress = treasureTransfer.fromUserAccount;
        amount = treasureTransfer.tokenAmount;
        tokenMint = treasureTransfer.mint || treasureTransfer.tokenSymbol || 'UNKNOWN';

        console.log(`📦 Found token transfer: ${amount} ${tokenMint} from ${walletAddress}`);
      } else {
        console.warn('⚠️  No token transfers found in transaction');
        continue;
      }

      // Try to find the TreasureRecord PDA in account data
      let treasureRecordPda = '';

      if (accountData && Array.isArray(accountData)) {
        // Look for accounts that were created/modified (TreasureRecord PDA)
        // The TreasureRecord will be one of the accounts in the transaction
        for (const account of accountData) {
          // Check if this looks like a TreasureRecord account
          // We can identify it by looking for newly created accounts or checking account structure
          if (account.account && account.account !== GAME_PROGRAM_ID) {
            // This could be the TreasureRecord PDA or other accounts
            // For now, we'll try to extract it from the instruction accounts
            treasureRecordPda = account.account;
          }
        }
      }

      // Validate we have minimum required data
      if (!walletAddress || !amount) {
        console.warn('⚠️  Could not extract wallet address or amount from transaction');
        continue;
      }

      console.log(`✅ Parsed hideTreasure transaction:`);
      console.log(`   Signature: ${signature}`);
      console.log(`   Player: ${walletAddress}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Token: ${tokenMint}`);

      // Return parsed transaction data
      return {
        signature,
        walletAddress,
        amount,
        tokenType: tokenMint,
        metadata: {
          blockTime: timestamp,
          slot: slot || null,
          fee: fee || null,
          programId: GAME_PROGRAM_ID,
          treasureRecordPda: treasureRecordPda || 'unknown',
        }
      };
    }

    console.log('⏭️  No hideTreasure transactions found in payload');
    return null;

  } catch (error) {
    console.error('❌ Error parsing Helius transaction:', error);
    return null;
  }
}

/**
 * Main webhook handler for Helius transactions
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function handleHeliusWebhook(req: Request, res: Response): Promise<void> {
  try {
    console.log('📥 Received Helius webhook');

    // Log raw payload for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Webhook payload:', JSON.stringify(req.body, null, 2));
    }

    // Helius sends an array of transactions
    const transactions: HeliusTransaction[] = Array.isArray(req.body) ? req.body : [req.body];

    const results: any[] = [];

    for (const transaction of transactions) {
      // Parse transaction data
      const parsedTx = parseHeliusTransaction([transaction]);

      if (!parsedTx) {
        console.log('⏭️  Skipping transaction (not a hideTreasure transaction)');
        continue;
      }

      // Check if Firebase is ready
      if (!treasureService.isReady()) {
        console.error('❌ Firebase Admin not initialized');
        res.status(503).json({
          success: false,
          error: 'Database not ready'
        });
        return;
      }

      // Save hidden treasure
      const result = await treasureService.saveTreasure(parsedTx);
      results.push(result);

      console.log(`✅ Processed hidden treasure: ${parsedTx.signature}`);
    }

    // Respond to Helius
    res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ Error handling Helius webhook:', error);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

/**
 * Health check endpoint for webhook
 */
export function webhookHealthCheck(req: Request, res: Response): void {
  res.json({
    success: true,
    service: 'Helius Webhook Handler',
    status: 'online',
    timestamp: new Date().toISOString(),
    firebaseReady: treasureService.isReady()
  });
}
