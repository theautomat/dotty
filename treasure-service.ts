import { firebaseAdmin } from './firebase-admin-config';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Treasure Transaction Service
 *
 * Handles storage and retrieval of hidden treasure transactions triggered by Helius webhooks.
 * Stores treasure transactions in Firestore with complete transaction metadata.
 */

export interface TreasureData {
  signature: string;
  walletAddress: string;
  amount: number;
  tokenType?: string;
  metadata?: {
    blockTime?: number;
    slot?: number;
    fee?: number;
    programId?: string;
    treasureRecordPda?: string;
    [key: string]: any;
  };
}

export interface Treasure {
  // Transaction identifiers
  txSignature: string;
  walletAddress: string;

  // Treasure details
  amount: number;
  tokenType: string;

  // Status tracking
  status: 'active' | 'claimed' | 'expired';

  // Timestamps
  hiddenAt: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  claimedBy?: string;

  // Blockchain metadata
  metadata: {
    blockTime: number | null;
    slot: number | null;
    fee: number | null;
    programId: string | null;
    treasureRecordPda: string;
    [key: string]: any;
  };
}

export interface TreasureFilters {
  limit?: number;
  tokenType?: string;
  status?: 'active' | 'claimed' | 'expired';
}

export interface TreasureUpdateData {
  claimedBy?: string;
  [key: string]: any;
}

class TreasureService {
  private readonly collectionName = 'treasures';

  /**
   * Get Firestore instance
   * @private
   */
  private _getDb(): Firestore {
    const db = firebaseAdmin.getFirestore();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }
    return db;
  }

  /**
   * Save a hidden treasure from Helius webhook
   *
   * @param transactionData - Transaction data from Helius webhook
   * @returns Saved document reference
   */
  async saveTreasure(transactionData: TreasureData): Promise<{
    success: boolean;
    id: string;
    treasure: Treasure;
  }> {
    try {
      const db = this._getDb();

      // Validate required fields
      if (!transactionData.signature) {
        throw new Error('Transaction signature is required');
      }
      if (!transactionData.walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (transactionData.amount === undefined || transactionData.amount === null) {
        throw new Error('Amount is required');
      }

      // Prepare treasure document
      const treasure: Treasure = {
        // Transaction identifiers
        txSignature: transactionData.signature,
        walletAddress: transactionData.walletAddress,

        // Treasure details
        amount: transactionData.amount,
        tokenType: transactionData.tokenType || 'SOL',

        // Status tracking
        status: 'active',

        // Timestamps
        hiddenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Blockchain metadata
        metadata: {
          blockTime: transactionData.metadata?.blockTime || null,
          slot: transactionData.metadata?.slot || null,
          fee: transactionData.metadata?.fee || null,
          programId: transactionData.metadata?.programId || null,
          treasureRecordPda: transactionData.metadata?.treasureRecordPda || '',
          ...transactionData.metadata
        }
      };

      // Save to Firestore
      await db
        .collection(this.collectionName)
        .doc(transactionData.signature) // Use signature as document ID for idempotency
        .set(treasure, { merge: true }); // Merge to handle duplicate webhooks

      console.log(`✅ Hidden treasure saved: ${transactionData.signature}`);

      return {
        success: true,
        id: transactionData.signature,
        treasure
      };

    } catch (error) {
      console.error('❌ Error saving treasure:', error);
      throw error;
    }
  }

  /**
   * Update treasure status
   *
   * @param signature - Transaction signature
   * @param status - New status (active, claimed, expired)
   * @param updateData - Additional data to update
   * @returns Update result
   */
  async updateTreasureStatus(
    signature: string,
    status: 'active' | 'claimed' | 'expired',
    updateData: TreasureUpdateData = {}
  ): Promise<{
    success: boolean;
    signature: string;
    status: string;
  }> {
    try {
      const db = this._getDb();

      const updates: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString(),
        ...updateData
      };

      // If claimed, add claim timestamp and claimer
      if (status === 'claimed') {
        updates.claimedAt = new Date().toISOString();
        if (updateData.claimedBy) {
          updates.claimedBy = updateData.claimedBy;
        }
      }

      await db
        .collection(this.collectionName)
        .doc(signature)
        .update(updates);

      console.log(`✅ Treasure updated: ${signature} -> ${status}`);

      return {
        success: true,
        signature,
        status
      };

    } catch (error) {
      console.error('❌ Error updating treasure:', error);
      throw error;
    }
  }

  /**
   * Get treasure by transaction signature
   *
   * @param signature - Transaction signature
   * @returns Treasure or null
   */
  async getTreasure(signature: string): Promise<(Treasure & { id: string }) | null> {
    try {
      const db = this._getDb();

      const doc = await db
        .collection(this.collectionName)
        .doc(signature)
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data() as Treasure
      };

    } catch (error) {
      console.error('❌ Error getting treasure:', error);
      throw error;
    }
  }

  /**
   * Get all active treasures
   *
   * @param filters - Optional filters
   * @returns Array of treasures
   */
  async getActiveTreasures(filters: TreasureFilters = {}): Promise<Array<Treasure & { id: string }>> {
    try {
      const db = this._getDb();
      const {
        limit = 100,
        tokenType = null,
        status = 'active'
      } = filters;

      let query: FirebaseFirestore.Query = db
        .collection(this.collectionName)
        .where('status', '==', status)
        .orderBy('hiddenAt', 'desc')
        .limit(limit);

      // Add token type filter if specified
      if (tokenType) {
        query = query.where('tokenType', '==', tokenType);
      }

      const snapshot = await query.get();

      const treasures: Array<Treasure & { id: string }> = [];
      snapshot.forEach(doc => {
        treasures.push({
          id: doc.id,
          ...doc.data() as Treasure
        });
      });

      return treasures;

    } catch (error) {
      console.error('❌ Error getting active treasures:', error);
      throw error;
    }
  }

  /**
   * Get treasures by wallet address
   *
   * @param walletAddress - Wallet address
   * @param filters - Optional filters
   * @returns Array of treasures
   */
  async getTreasuresByWallet(
    walletAddress: string,
    filters: Omit<TreasureFilters, 'status'> = {}
  ): Promise<Array<Treasure & { id: string }>> {
    try {
      const db = this._getDb();
      const { limit = 100 } = filters;

      const snapshot = await db
        .collection(this.collectionName)
        .where('walletAddress', '==', walletAddress)
        .orderBy('hiddenAt', 'desc')
        .limit(limit)
        .get();

      const treasures: Array<Treasure & { id: string }> = [];
      snapshot.forEach(doc => {
        treasures.push({
          id: doc.id,
          ...doc.data() as Treasure
        });
      });

      return treasures;

    } catch (error) {
      console.error('❌ Error getting treasures by wallet:', error);
      throw error;
    }
  }

  /**
   * Check if treasure service is ready
   * @returns True if Firebase Admin is initialized
   */
  isReady(): boolean {
    return firebaseAdmin.isReady();
  }
}

// Export singleton instance
export const treasureService = new TreasureService();
