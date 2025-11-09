import { firebaseAdmin } from './firebase-admin-config';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Treasure Transaction Service
 *
 * Handles storage and retrieval of treasure deposits triggered by Helius webhooks.
 * Stores treasure transactions in Firestore with complete transaction metadata.
 */

export interface TreasureDepositData {
  signature: string;
  walletAddress: string;
  amount: number;
  tokenType?: string;
  metadata?: Record<string, any>;
  coordinates?: { x: number; y: number };
  blockTime?: number;
  slot?: number;
  fee?: number;
  programId?: string;
}

export interface TreasureDeposit {
  // Transaction identifiers
  txSignature: string;
  depositedBy: string;
  walletAddress: string;

  // Deposit details
  amount: number;
  tokenType: string;

  // Status tracking
  status: 'active' | 'claimed' | 'expired';

  // Timestamps
  depositDate: string;
  createdAt: string;
  updatedAt: string;
  claimDate?: string;
  claimedBy?: string;

  // Game coordinates
  coordinates: { x: number; y: number };

  // Monster type based on amount
  monsterType: string;

  // Additional metadata from Helius
  metadata?: {
    blockTime?: number | null;
    slot?: number | null;
    fee?: number | null;
    programId?: string | null;
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
  private readonly collectionName = 'treasure-deposits';

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
   * Save a treasure deposit transaction from Helius webhook
   *
   * @param transactionData - Transaction data from Helius webhook
   * @returns Saved document reference
   */
  async saveTreasureDeposit(transactionData: TreasureDepositData): Promise<{
    success: boolean;
    id: string;
    treasureDeposit: TreasureDeposit;
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

      // Prepare treasure deposit document
      const treasureDeposit: TreasureDeposit = {
        // Transaction identifiers
        txSignature: transactionData.signature,
        depositedBy: transactionData.walletAddress,
        walletAddress: transactionData.walletAddress,

        // Deposit details
        amount: transactionData.amount,
        tokenType: transactionData.tokenType || 'SOL',

        // Status tracking
        status: 'active',

        // Timestamps
        depositDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Game coordinates (will be assigned by game logic)
        coordinates: transactionData.coordinates || { x: 0, y: 0 },

        // Monster type based on amount (game logic can override)
        monsterType: this._determineMonsterType(transactionData.amount),

        // Additional metadata from Helius
        metadata: {
          blockTime: transactionData.blockTime || null,
          slot: transactionData.slot || null,
          fee: transactionData.fee || null,
          programId: transactionData.programId || null,
          ...transactionData.metadata
        }
      };

      // Save to Firestore
      await db
        .collection(this.collectionName)
        .doc(transactionData.signature) // Use signature as document ID for idempotency
        .set(treasureDeposit, { merge: true }); // Merge to handle duplicate webhooks

      console.log(`✅ Treasure deposit saved: ${transactionData.signature}`);

      return {
        success: true,
        id: transactionData.signature,
        treasureDeposit
      };

    } catch (error) {
      console.error('❌ Error saving treasure deposit:', error);
      throw error;
    }
  }

  /**
   * Update treasure deposit status
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
        updates.claimDate = new Date().toISOString();
        if (updateData.claimedBy) {
          updates.claimedBy = updateData.claimedBy;
        }
      }

      await db
        .collection(this.collectionName)
        .doc(signature)
        .update(updates);

      console.log(`✅ Treasure deposit updated: ${signature} -> ${status}`);

      return {
        success: true,
        signature,
        status
      };

    } catch (error) {
      console.error('❌ Error updating treasure deposit:', error);
      throw error;
    }
  }

  /**
   * Get treasure deposit by transaction signature
   *
   * @param signature - Transaction signature
   * @returns Treasure deposit or null
   */
  async getTreasureDeposit(signature: string): Promise<(TreasureDeposit & { id: string }) | null> {
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
        ...doc.data() as TreasureDeposit
      };

    } catch (error) {
      console.error('❌ Error getting treasure deposit:', error);
      throw error;
    }
  }

  /**
   * Get all active treasure deposits
   *
   * @param filters - Optional filters
   * @returns Array of treasure deposits
   */
  async getActiveTreasures(filters: TreasureFilters = {}): Promise<Array<TreasureDeposit & { id: string }>> {
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
        .orderBy('depositDate', 'desc')
        .limit(limit);

      // Add token type filter if specified
      if (tokenType) {
        query = query.where('tokenType', '==', tokenType);
      }

      const snapshot = await query.get();

      const treasures: Array<TreasureDeposit & { id: string }> = [];
      snapshot.forEach(doc => {
        treasures.push({
          id: doc.id,
          ...doc.data() as TreasureDeposit
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
   * @returns Array of treasure deposits
   */
  async getTreasuresByWallet(
    walletAddress: string,
    filters: Omit<TreasureFilters, 'status'> = {}
  ): Promise<Array<TreasureDeposit & { id: string }>> {
    try {
      const db = this._getDb();
      const { limit = 100 } = filters;

      const snapshot = await db
        .collection(this.collectionName)
        .where('walletAddress', '==', walletAddress)
        .orderBy('depositDate', 'desc')
        .limit(limit)
        .get();

      const treasures: Array<TreasureDeposit & { id: string }> = [];
      snapshot.forEach(doc => {
        treasures.push({
          id: doc.id,
          ...doc.data() as TreasureDeposit
        });
      });

      return treasures;

    } catch (error) {
      console.error('❌ Error getting treasures by wallet:', error);
      throw error;
    }
  }

  /**
   * Determine monster type based on deposit amount
   * @private
   * @param amount - Deposit amount
   * @returns Monster type string
   */
  private _determineMonsterType(amount: number): string {
    if (amount >= 10) return 'dragon';
    if (amount >= 5) return 'ogre';
    if (amount >= 1) return 'goblin';
    return 'slime';
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
