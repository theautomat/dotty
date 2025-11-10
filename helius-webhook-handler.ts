import type { Request, Response, NextFunction } from 'express';
import { treasureService } from './treasure-service';
import type { HiddenTreasureData } from './treasure-service';

/**
 * Helius Webhook Handler
 *
 * Handles incoming webhooks from Helius for Solana transaction monitoring.
 * Verifies webhook authenticity and processes treasure hiding transactions.
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
 * Helius sends the authorization header you configured when creating the webhook.
 * This middleware checks if the incoming request has the correct auth header.
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
 * @returns Parsed transaction data or null if not a treasure hiding transaction
 */
export function parseHeliusTransaction(heliusPayload: HeliusTransaction[]): HiddenTreasureData | null {
  try {
    // Helius webhook payload structure varies by webhook type
    // Common fields: signature, type, timestamp, events, nativeTransfers, tokenTransfers

    const { signature, type, timestamp, description, events } = heliusPayload[0] || heliusPayload;

    // Check if this is a transaction we care about
    // You may need to adjust this logic based on your program structure
    if (!signature) {
      console.warn('⚠️  Webhook payload missing signature');
      return null;
    }

    // Extract transaction details
    // This is a simplified parser - adjust based on your actual program instructions
    const transactionData: HiddenTreasureData = {
      signature,
      walletAddress: '',
      amount: 0,
      tokenType: 'SOL',

      // Metadata
      blockTime: heliusPayload[0]?.timestamp,
      slot: heliusPayload[0]?.slot,
      fee: heliusPayload[0]?.fee,
      programId: undefined
    };

    // Parse native SOL transfers
    if (heliusPayload[0]?.nativeTransfers && heliusPayload[0].nativeTransfers.length > 0) {
      const transfer = heliusPayload[0].nativeTransfers[0];
      transactionData.walletAddress = transfer.fromUserAccount || transfer.toUserAccount;
      transactionData.amount = transfer.amount / 1e9; // Convert lamports to SOL
      transactionData.tokenType = 'SOL';
    }

    // Parse SPL token transfers
    if (heliusPayload[0]?.tokenTransfers && heliusPayload[0].tokenTransfers.length > 0) {
      const transfer = heliusPayload[0].tokenTransfers[0];
      transactionData.walletAddress = transfer.fromUserAccount || transfer.toUserAccount;
      transactionData.amount = transfer.tokenAmount;
      transactionData.tokenType = transfer.mint || transfer.tokenSymbol || 'UNKNOWN';
    }

    // Parse program-specific events if available
    if (events && events.length > 0) {
      // Look for your game program's hide treasure events
      const hideTreasureEvent = events.find(e =>
        e.type === 'HIDE_TREASURE' || e.type === 'hide_treasure'
      );

      if (hideTreasureEvent) {
        transactionData.programId = hideTreasureEvent.programId;
        // Extract event-specific data
        if (hideTreasureEvent.data) {
          transactionData.amount = hideTreasureEvent.data.amount || transactionData.amount;
          transactionData.walletAddress = hideTreasureEvent.data.wallet || transactionData.walletAddress;
        }
      }
    }

    // Validate that we have the minimum required data
    if (!transactionData.walletAddress || !transactionData.amount) {
      console.warn('⚠️  Could not extract wallet address or amount from webhook');
      return null;
    }

    return transactionData;

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
        console.log('⏭️  Skipping transaction (not a treasure hiding transaction)');
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
      const result = await treasureService.saveHiddenTreasure(parsedTx);
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
