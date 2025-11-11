import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, limit, getDocs, type QueryConstraint } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';

// Type definitions
type TreasureStatus = 'active' | 'claimed' | 'expired';
type TokenType = string;

interface Treasure {
  id: string;
  txSignature: string;
  walletAddress: string;
  amount: number;
  tokenType: string;
  status: TreasureStatus;
  hiddenAt: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  claimedBy?: string;
  metadata?: {
    blockTime?: number | null;
    slot?: number | null;
    fee?: number | null;
    programId?: string | null;
    treasureRecordPda?: string;
  };
}

interface TreasureStats {
  total: number;
  active: number;
  claimed: number;
  expired: number;
}

export function TreasureGalleryPage() {
  const [selectedStatus, setSelectedStatus] = useState<TreasureStatus | 'all'>('all');
  const [selectedToken, setSelectedToken] = useState<TokenType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch treasures from Firebase
  useEffect(() => {
    async function fetchTreasures() {
      try {
        setLoading(true);
        setError(null);

        // Check if Firebase is properly initialized
        if (!db) {
          throw new Error('Firebase is not initialized. Please check your .env file and ensure all VITE_FIREBASE_* variables are set.');
        }

        console.log('📡 Fetching treasures from Firebase...');

        const treasuresRef = collection(db, 'treasures');
        const constraints: QueryConstraint[] = [
          orderBy('hiddenAt', 'desc'),
          limit(1000)
        ];

        const q = query(treasuresRef, ...constraints);
        const snapshot = await getDocs(q);

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Treasure[];

        setTreasures(data);
        console.log(`✅ Fetched ${data.length} treasures from Firebase`);

        if (data.length === 0) {
          console.log('ℹ️ No treasures found in Firebase. Try hiding some treasures first!');
        }
      } catch (err) {
        console.error('❌ Error fetching treasures:', err);

        // Provide more helpful error messages
        let errorMessage = 'Failed to fetch treasures';

        if (err instanceof Error) {
          errorMessage = err.message;

          // Check for common Firebase errors
          if (err.message.includes('Missing or insufficient permissions')) {
            errorMessage = 'Firebase permission error. Please check your Firestore security rules.';
          } else if (err.message.includes('PERMISSION_DENIED')) {
            errorMessage = 'Permission denied. Please check your Firebase configuration and security rules.';
          } else if (err.message.includes('not initialized')) {
            errorMessage = 'Firebase not configured. Please set up your .env file with Firebase credentials.';
          }
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchTreasures();
  }, [retryCount]);

  // Calculate stats from fetched treasures
  const stats: TreasureStats = useMemo(() => {
    return {
      total: treasures.length,
      active: treasures.filter(t => t.status === 'active').length,
      claimed: treasures.filter(t => t.status === 'claimed').length,
      expired: treasures.filter(t => t.status === 'expired').length,
    };
  }, [treasures]);

  // Filter and sort treasures
  const filteredTreasures = useMemo(() => {
    let filtered = [...treasures];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    // Filter by token
    if (selectedToken !== 'all') {
      filtered = filtered.filter(t => t.tokenType === selectedToken);
    }

    // Filter by search term (wallet address only)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        t => t.walletAddress.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.hiddenAt).getTime() - new Date(a.hiddenAt).getTime();
      } else {
        return b.amount - a.amount;
      }
    });

    return filtered;
  }, [treasures, selectedStatus, selectedToken, sortBy, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-14">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                💎 Hidden Treasure Gallery
              </h1>
              <p className="text-gray-400 mt-2">Discover treasures hidden across the land</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/')}
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            >
              ← Back to Game
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
            <div className="text-purple-300 text-sm font-semibold uppercase tracking-wide mb-1">
              Total Treasures
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
            <div className="text-green-300 text-sm font-semibold uppercase tracking-wide mb-1">
              Active
            </div>
            <div className="text-3xl font-bold text-white">{stats.active}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30">
            <div className="text-blue-300 text-sm font-semibold uppercase tracking-wide mb-1">
              Claimed
            </div>
            <div className="text-3xl font-bold text-white">{stats.claimed}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30">
            <div className="text-orange-300 text-sm font-semibold uppercase tracking-wide mb-1">
              Expired
            </div>
            <div className="text-3xl font-bold text-white">{stats.expired}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-black/30 backdrop-blur-md rounded-lg p-6 border border-purple-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as TreasureStatus | 'all')}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="claimed">Claimed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Token Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Token Type</label>
              <select
                value={selectedToken}
                onChange={e => setSelectedToken(e.target.value as TokenType | 'all')}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Tokens</option>
                <option value="PEPE">PEPE</option>
                <option value="BONK">BONK</option>
                <option value="WIF">WIF</option>
                <option value="USDC">USDC</option>
                <option value="SOL">SOL</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'date' | 'amount')}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="date">Latest First</option>
                <option value="amount">Highest Amount</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(selectedStatus !== 'all' || selectedToken !== 'all' || searchTerm) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Active filters:</span>
                {selectedStatus !== 'all' && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                    Status: {selectedStatus}
                  </span>
                )}
                {selectedToken !== 'all' && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                    Token: {selectedToken}
                  </span>
                )}
                {searchTerm && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                    Search: "{searchTerm}"
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedToken('all');
                    setSearchTerm('');
                  }}
                  className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Treasure Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Loading State */}
        {loading && (
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-12 border border-purple-500/20 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Loading treasures...</h3>
            <p className="text-gray-500">Fetching data from Firebase</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 backdrop-blur-md rounded-lg p-12 border border-red-500/30">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-semibold text-red-300 mb-2">Error loading treasures</h3>
              <p className="text-gray-400 mb-4">{error}</p>
            </div>

            {/* Show helpful instructions for common errors */}
            {error.includes('not initialized') || error.includes('not configured') ? (
              <div className="bg-black/30 rounded-lg p-6 text-left max-w-2xl mx-auto">
                <h4 className="text-lg font-semibold text-purple-300 mb-3">
                  🛠️ Setup Instructions
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                  <li>
                    Copy <code className="bg-gray-800 px-2 py-1 rounded">.env.example</code> to{' '}
                    <code className="bg-gray-800 px-2 py-1 rounded">.env</code>
                  </li>
                  <li>Fill in your Firebase credentials from the Firebase Console</li>
                  <li>Make sure all VITE_FIREBASE_* variables are set</li>
                  <li>Restart the development server</li>
                </ol>
                <div className="mt-4 p-3 bg-purple-500/10 rounded border border-purple-500/30">
                  <p className="text-xs text-purple-200">
                    💡 Tip: Get your Firebase credentials from{' '}
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      Firebase Console
                    </a>{' '}
                    → Project Settings → General
                  </p>
                </div>
              </div>
            ) : error.includes('permission') || error.includes('PERMISSION_DENIED') ? (
              <div className="bg-black/30 rounded-lg p-6 text-left max-w-2xl mx-auto">
                <h4 className="text-lg font-semibold text-purple-300 mb-3">
                  🔒 Firestore Security Rules
                </h4>
                <p className="text-gray-300 text-sm mb-3">
                  Your Firestore security rules may be blocking read access. Update your rules to allow reading
                  the treasures collection:
                </p>
                <pre className="bg-gray-900 p-4 rounded text-xs text-green-400 overflow-x-auto">
                  {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /treasures/{treasure} {
      allow read: if true;  // Allow public read access
      allow write: if false; // Restrict writes
    }
  }
}`}
                </pre>
              </div>
            ) : null}

            {/* Retry Button */}
            <div className="text-center mt-6">
              <Button
                onClick={() => setRetryCount(c => c + 1)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                🔄 Retry
              </Button>
            </div>
          </div>
        )}

        {/* Treasure Data */}
        {!loading && !error && (
          <>
            <div className="mb-4 text-gray-400">
              Showing {filteredTreasures.length} of {stats.total} treasures
            </div>

            {filteredTreasures.length === 0 ? (
              <div className="bg-black/30 backdrop-blur-md rounded-lg p-12 border border-purple-500/20 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No treasures found</h3>
                <p className="text-gray-500">
                  {stats.total === 0
                    ? 'No treasures have been hidden yet. Be the first to hide some treasure!'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTreasures.map(treasure => (
                  <TreasureCard key={treasure.id} treasure={treasure} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Treasure Card Component
function TreasureCard({ treasure }: { treasure: Treasure }) {
  const statusConfig = {
    active: {
      color: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-500/40',
      badgeColor: 'bg-green-500/20 text-green-300 border-green-500/40',
      label: 'Active',
      emoji: '💎',
    },
    claimed: {
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/40',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      label: 'Claimed',
      emoji: '✅',
    },
    expired: {
      color: 'from-gray-500/20 to-gray-600/20',
      borderColor: 'border-gray-500/40',
      badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
      label: 'Expired',
      emoji: '⏰',
    },
  };

  const config = statusConfig[treasure.status];

  return (
    <div
      className={cn(
        'bg-gradient-to-br backdrop-blur-sm rounded-lg overflow-hidden border hover:scale-105 transition-transform duration-200',
        config.color,
        config.borderColor
      )}
    >
      {/* Card Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <div className="text-sm text-gray-400">Status</div>
              <div className="font-semibold text-white">{config.label}</div>
            </div>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-sm font-semibold border', config.badgeColor)}>
            {config.label}
          </span>
        </div>

        {/* Amount */}
        <div className="bg-black/30 rounded-lg p-4 mt-4">
          <div className="text-sm text-gray-400 mb-1">Treasure Value</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{treasure.amount.toLocaleString()}</span>
            <span className="text-lg font-semibold text-purple-400">{treasure.tokenType}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-3">
        {/* Hidden By */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hidden By</div>
          <div className="text-xs text-gray-500 font-mono">
            {treasure.walletAddress.slice(0, 8)}...{treasure.walletAddress.slice(-6)}
          </div>
        </div>

        {/* Dates */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hidden At</div>
          <div className="text-white text-sm">{new Date(treasure.hiddenAt).toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">{new Date(treasure.hiddenAt).toLocaleTimeString()}</div>
        </div>

        {treasure.claimedAt && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Claimed At</div>
            <div className="text-white text-sm">{new Date(treasure.claimedAt).toLocaleDateString()}</div>
            {treasure.claimedBy && (
              <div className="text-xs text-blue-400 mt-1">
                by {treasure.claimedBy.slice(0, 8)}...{treasure.claimedBy.slice(-6)}
              </div>
            )}
          </div>
        )}

        {/* Transaction */}
        {treasure.txSignature && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Transaction</div>
            <a
              href={`https://solscan.io/tx/${treasure.txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 font-mono break-all"
            >
              {treasure.txSignature.slice(0, 20)}...
            </a>
          </div>
        )}

        {/* Blockchain Info */}
        {treasure.metadata?.slot && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Blockchain</div>
            <div className="text-xs text-gray-500">Slot: {treasure.metadata.slot.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      {treasure.status === 'active' && (
        <div className="p-6 pt-0">
          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            onClick={() => alert('Claiming treasures coming soon!')}
          >
            🎁 Claim This Treasure
          </Button>
        </div>
      )}
    </div>
  );
}
