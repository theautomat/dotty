import { firebaseAdmin } from './firebase-admin-config';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Map Search Service
 *
 * Handles storage and retrieval of treasure search transactions triggered by
 * the local transaction monitor (Helius simulator).
 * Stores search transactions in Firestore with coordinates and metadata.
 */

export interface SearchData {
  signature: string;
  walletAddress: string;
  x: number;
  y: number;
  metadata?: {
    blockTime?: number;
    slot?: number;
    fee?: number;
    programId?: string;
    searchRecordPda?: string;
    [key: string]: any;
  };
}

export interface MapSearch {
  // Transaction identifiers
  txSignature: string;
  walletAddress: string;

  // Search coordinates
  x: number;
  y: number;

  // Search result (will be updated when treasure finding is implemented)
  found: boolean;
  treasureId?: string; // Reference to treasure if found

  // Timestamps
  searchedAt: string;
  createdAt: string;
  updatedAt: string;

  // Blockchain metadata
  metadata: {
    blockTime: number | null;
    slot: number | null;
    fee: number | null;
    programId: string | null;
    searchRecordPda: string;
    [key: string]: any;
  };
}

export interface SearchFilters {
  limit?: number;
  walletAddress?: string;
  found?: boolean;
}

class SearchService {
  private readonly collectionName = 'map_searches';

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
   * Check if Firebase Admin is initialized
   */
  isReady(): boolean {
    try {
      this._getDb();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save a treasure search from transaction monitor webhook
   *
   * @param searchData - Search data from webhook
   * @returns Saved document reference
   */
  async saveSearch(searchData: SearchData): Promise<{
    success: boolean;
    id: string;
    search: MapSearch;
  }> {
    try {
      const db = this._getDb();

      // Validate required fields
      if (!searchData.signature) {
        throw new Error('Transaction signature is required');
      }
      if (!searchData.walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (searchData.x === undefined || searchData.x === null) {
        throw new Error('X coordinate is required');
      }
      if (searchData.y === undefined || searchData.y === null) {
        throw new Error('Y coordinate is required');
      }

      // Prepare search document
      const search: MapSearch = {
        // Transaction identifiers
        txSignature: searchData.signature,
        walletAddress: searchData.walletAddress,

        // Search coordinates
        x: searchData.x,
        y: searchData.y,

        // Search result (default to not found)
        found: false,

        // Timestamps
        searchedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Blockchain metadata
        metadata: {
          blockTime: searchData.metadata?.blockTime || null,
          slot: searchData.metadata?.slot || null,
          fee: searchData.metadata?.fee || null,
          programId: searchData.metadata?.programId || null,
          searchRecordPda: searchData.metadata?.searchRecordPda || '',
          ...searchData.metadata
        }
      };

      // Save to Firestore
      await db
        .collection(this.collectionName)
        .doc(searchData.signature) // Use signature as document ID for idempotency
        .set(search, { merge: true }); // Merge to handle duplicate webhooks

      console.log(`✅ Map search saved: ${searchData.signature} at (${searchData.x}, ${searchData.y})`);

      return {
        success: true,
        id: searchData.signature,
        search
      };

    } catch (error) {
      console.error('❌ Error saving search:', error);
      throw error;
    }
  }

  /**
   * Get a specific search by transaction signature
   *
   * @param signature - Transaction signature
   * @returns Search document or null if not found
   */
  async getSearch(signature: string): Promise<(MapSearch & { id: string }) | null> {
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
        ...doc.data() as MapSearch
      };

    } catch (error) {
      console.error('❌ Error getting search:', error);
      throw error;
    }
  }

  /**
   * Get searches with optional filters
   *
   * @param filters - Query filters
   * @returns Array of search documents
   */
  async getSearches(filters: SearchFilters = {}): Promise<Array<MapSearch & { id: string }>> {
    try {
      const db = this._getDb();
      const {
        limit = 100,
        walletAddress = null,
        found = null
      } = filters;

      let query: FirebaseFirestore.Query = db
        .collection(this.collectionName)
        .orderBy('searchedAt', 'desc')
        .limit(limit);

      // Add wallet filter if specified
      if (walletAddress) {
        query = query.where('walletAddress', '==', walletAddress);
      }

      // Add found filter if specified
      if (found !== null) {
        query = query.where('found', '==', found);
      }

      const snapshot = await query.get();

      const searches: Array<MapSearch & { id: string }> = [];
      snapshot.forEach(doc => {
        searches.push({
          id: doc.id,
          ...doc.data() as MapSearch
        });
      });

      return searches;

    } catch (error) {
      console.error('❌ Error getting searches:', error);
      throw error;
    }
  }

  /**
   * Get searches by wallet address
   *
   * @param walletAddress - Wallet address to query
   * @param filters - Additional query filters
   * @returns Array of search documents
   */
  async getSearchesByWallet(
    walletAddress: string,
    filters: Omit<SearchFilters, 'walletAddress'> = {}
  ): Promise<Array<MapSearch & { id: string }>> {
    return this.getSearches({
      ...filters,
      walletAddress
    });
  }

  /**
   * Get searches at specific coordinates
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param limit - Maximum number of results
   * @returns Array of search documents at those coordinates
   */
  async getSearchesAtCoordinates(
    x: number,
    y: number,
    limit: number = 100
  ): Promise<Array<MapSearch & { id: string }>> {
    try {
      const db = this._getDb();

      const snapshot = await db
        .collection(this.collectionName)
        .where('x', '==', x)
        .where('y', '==', y)
        .orderBy('searchedAt', 'desc')
        .limit(limit)
        .get();

      const searches: Array<MapSearch & { id: string }> = [];
      snapshot.forEach(doc => {
        searches.push({
          id: doc.id,
          ...doc.data() as MapSearch
        });
      });

      return searches;

    } catch (error) {
      console.error('❌ Error getting searches at coordinates:', error);
      throw error;
    }
  }

  /**
   * Update search result (mark as found with treasure reference)
   *
   * @param signature - Transaction signature
   * @param found - Whether treasure was found
   * @param treasureId - Reference to treasure if found
   * @returns Update result
   */
  async updateSearchResult(
    signature: string,
    found: boolean,
    treasureId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const db = this._getDb();

      const updateData: Partial<MapSearch> = {
        found,
        updatedAt: new Date().toISOString()
      };

      if (treasureId) {
        updateData.treasureId = treasureId;
      }

      await db
        .collection(this.collectionName)
        .doc(signature)
        .update(updateData);

      console.log(`✅ Search result updated: ${signature} - found: ${found}`);

      return {
        success: true,
        message: `Search result updated successfully`
      };

    } catch (error) {
      console.error('❌ Error updating search result:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
