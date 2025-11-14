import { Request, Response } from 'express';
import { clueService } from './clue-service';

/**
 * Clue Webhook Handler
 *
 * Handles clue purchase transaction webhooks from the local transaction monitor
 * (Helius simulator). Parses clue transaction data and stores in Firestore.
 * Triggers AI clue generation cloud function via Firestore onCreate trigger.
 */

interface ClueEvent {
  type: string;
  programId: string;
  data: {
    wallet: string;
    treasureId: string;
  };
}

interface ClueTransaction {
  signature: string;
  timestamp?: number;
  slot?: number;
  fee?: number;
  feePayer?: string;
  events?: ClueEvent[];
}

/**
 * Parse clue transaction from webhook payload
 */
export function parseClueTransaction(payload: ClueTransaction[]): any | null {
  try {
    for (const transaction of payload) {
      const { signature, timestamp, slot, fee, events } = transaction;

      if (!signature) {
        console.warn('⚠️  Transaction missing signature');
        continue;
      }

      // Find clue event
      const clueEvent = events?.find(e => e.type === 'GET_CLUE');

      if (!clueEvent) {
        console.warn('⚠️  No GET_CLUE event found in transaction');
        continue;
      }

      const { wallet, treasureId } = clueEvent.data;

      // Validate we have required data
      if (!wallet || !treasureId) {
        console.warn('⚠️  Could not extract wallet address or treasure ID from transaction');
        continue;
      }

      console.log(`✅ Parsed get_clue transaction:`);
      console.log(`   Signature: ${signature}`);
      console.log(`   Wallet: ${wallet}`);
      console.log(`   Treasure ID: ${treasureId}`);

      // Return parsed transaction data
      return {
        signature,
        walletAddress: wallet,
        treasureId,
        metadata: {
          blockTime: timestamp,
          slot: slot || null,
          fee: fee || null,
          programId: clueEvent.programId,
        }
      };
    }

    console.log('⏭️  No get_clue transactions found in payload');
    return null;

  } catch (error) {
    console.error('❌ Error parsing clue transaction:', error);
    return null;
  }
}

/**
 * Handle clue webhook
 */
export async function handleClueWebhook(req: Request, res: Response): Promise<void> {
  try {
    console.log('📥 Received clue webhook');

    // Webhook sends an array of transactions
    const transactions: ClueTransaction[] = Array.isArray(req.body) ? req.body : [req.body];

    const results: any[] = [];

    for (const transaction of transactions) {
      // Parse transaction data
      const parsedTx = parseClueTransaction([transaction]);

      if (!parsedTx) {
        console.log('⏭️  Skipping transaction (not a get_clue transaction)');
        continue;
      }

      // Check if Firebase is ready
      if (!clueService.isReady()) {
        console.error('❌ Firebase Admin not initialized');
        res.status(503).json({
          success: false,
          error: 'Database not ready'
        });
        return;
      }

      // Save clue purchase (this will trigger the AI generation cloud function)
      const result = await clueService.saveClue(parsedTx);
      results.push(result);

      console.log(`✅ Processed clue purchase: ${parsedTx.signature} for treasure ${parsedTx.treasureId}`);
    }

    // Respond to webhook
    res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ Error handling clue webhook:', error);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

/**
 * Clue webhook health check
 */
export function clueWebhookHealthCheck(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'clue-webhook',
    ready: clueService.isReady()
  });
}
