import { Request, Response } from 'express';
import { searchService } from './search-service';

/**
 * Search Webhook Handler
 *
 * Handles search transaction webhooks from the local transaction monitor
 * (Helius simulator). Parses search transaction data and stores in Firestore.
 */

interface SearchEvent {
  type: string;
  programId: string;
  data: {
    wallet: string;
    x: number;
    y: number;
  };
}

interface SearchTransaction {
  signature: string;
  timestamp?: number;
  slot?: number;
  fee?: number;
  feePayer?: string;
  events?: SearchEvent[];
}

/**
 * Parse search transaction from webhook payload
 */
export function parseSearchTransaction(payload: SearchTransaction[]): any | null {
  try {
    for (const transaction of payload) {
      const { signature, timestamp, slot, fee, events } = transaction;

      if (!signature) {
        console.warn('⚠️  Transaction missing signature');
        continue;
      }

      // Find search event
      const searchEvent = events?.find(e => e.type === 'SEARCH_TREASURE');

      if (!searchEvent) {
        console.warn('⚠️  No SEARCH_TREASURE event found in transaction');
        continue;
      }

      const { wallet, x, y } = searchEvent.data;

      // Validate we have required data
      if (!wallet || x === undefined || y === undefined) {
        console.warn('⚠️  Could not extract wallet address or coordinates from transaction');
        continue;
      }

      console.log(`✅ Parsed search_treasure transaction:`);
      console.log(`   Signature: ${signature}`);
      console.log(`   Wallet: ${wallet}`);
      console.log(`   Coordinates: (${x}, ${y})`);

      // Return parsed transaction data
      return {
        signature,
        walletAddress: wallet,
        x,
        y,
        metadata: {
          blockTime: timestamp,
          slot: slot || null,
          fee: fee || null,
          programId: searchEvent.programId,
        }
      };
    }

    console.log('⏭️  No search_treasure transactions found in payload');
    return null;

  } catch (error) {
    console.error('❌ Error parsing search transaction:', error);
    return null;
  }
}

/**
 * Handle search webhook
 */
export async function handleSearchWebhook(req: Request, res: Response): Promise<void> {
  try {
    console.log('📥 Received search webhook');

    // Webhook sends an array of transactions
    const transactions: SearchTransaction[] = Array.isArray(req.body) ? req.body : [req.body];

    const results: any[] = [];

    for (const transaction of transactions) {
      // Parse transaction data
      const parsedTx = parseSearchTransaction([transaction]);

      if (!parsedTx) {
        console.log('⏭️  Skipping transaction (not a search_treasure transaction)');
        continue;
      }

      // Check if Firebase is ready
      if (!searchService.isReady()) {
        console.error('❌ Firebase Admin not initialized');
        res.status(503).json({
          success: false,
          error: 'Database not ready'
        });
        return;
      }

      // Save map search
      const result = await searchService.saveSearch(parsedTx);
      results.push(result);

      console.log(`✅ Processed search: ${parsedTx.signature} at (${parsedTx.x}, ${parsedTx.y})`);
    }

    // Respond to webhook
    res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ Error handling search webhook:', error);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

/**
 * Search webhook health check
 */
export function searchWebhookHealthCheck(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'search-webhook',
    ready: searchService.isReady()
  });
}
