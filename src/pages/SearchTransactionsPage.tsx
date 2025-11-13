import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, QueryConstraint } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Navigation } from '../components/Navigation';

interface MapSearch {
  txSignature: string;
  walletAddress: string;
  x: number;
  y: number;
  found: boolean;
  treasureId?: string;
  searchedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    blockTime: number | null;
    slot: number | null;
    fee: number | null;
    programId: string | null;
    searchRecordPda: string;
  };
}

const SearchTransactionsPage: React.FC = () => {
  const [searches, setSearches] = useState<MapSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFound, setFilterFound] = useState<'all' | 'found' | 'not_found'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    try {
      setLoading(true);
      setError(null);

      const searchesRef = collection(db, 'map_searches');
      const constraints: QueryConstraint[] = [
        orderBy('searchedAt', 'desc'),
        limit(500)
      ];

      const q = query(searchesRef, ...constraints);
      const snapshot = await getDocs(q);

      const searchData: MapSearch[] = snapshot.docs.map(doc => ({
        txSignature: doc.id,
        ...doc.data()
      } as MapSearch));

      setSearches(searchData);
    } catch (err) {
      console.error('Error fetching searches:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch search transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSearches = React.useMemo(() => {
    let filtered = [...searches];

    // Filter by search query (wallet address or transaction signature)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.walletAddress.toLowerCase().includes(query) ||
        s.txSignature.toLowerCase().includes(query)
      );
    }

    // Filter by found status
    if (filterFound === 'found') {
      filtered = filtered.filter(s => s.found);
    } else if (filterFound === 'not_found') {
      filtered = filtered.filter(s => !s.found);
    }

    // Sort
    filtered.sort((a, b) => {
      const aTime = new Date(a.searchedAt).getTime();
      const bTime = new Date(b.searchedAt).getTime();
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return filtered;
  }, [searches, searchQuery, filterFound, sortBy]);

  const stats = React.useMemo(() => {
    const total = searches.length;
    const foundCount = searches.filter(s => s.found).length;
    const notFoundCount = total - foundCount;
    const uniqueWallets = new Set(searches.map(s => s.walletAddress)).size;

    return { total, foundCount, notFoundCount, uniqueWallets };
  }, [searches]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Search Transactions</h1>
          <p className="text-gray-600">View all recent map searches from the blockchain</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Total Searches</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Found Treasure</div>
            <div className="text-2xl font-bold text-green-600">{stats.foundCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">No Treasure</div>
            <div className="text-2xl font-bold text-gray-600">{stats.notFoundCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Unique Wallets</div>
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueWallets}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Wallet or Transaction
              </label>
              <input
                type="text"
                placeholder="Enter wallet address or tx signature..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>

            {/* Filter by Found */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Result
              </label>
              <select
                value={filterFound}
                onChange={(e) => setFilterFound(e.target.value as 'all' | 'found' | 'not_found')}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              >
                <option value="all">All Searches</option>
                <option value="found">Found Treasure</option>
                <option value="not_found">No Treasure</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by Date
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading search transactions...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Searches</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchSearches}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && (
          <div className="mb-4 text-gray-600">
            Showing {filteredAndSortedSearches.length} of {searches.length} searches
          </div>
        )}

        {/* Search Cards */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredAndSortedSearches.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border">
                <p className="text-gray-600 text-lg">No search transactions found</p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchQuery || filterFound !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Searches will appear here once players start exploring the map'}
                </p>
              </div>
            ) : (
              filteredAndSortedSearches.map((search) => (
                <div
                  key={search.txSignature}
                  className="bg-white rounded-lg p-6 border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left Column - Main Info */}
                    <div className="flex-1 space-y-3">
                      {/* Status Badge and Coordinates */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            search.found
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {search.found ? 'Treasure Found' : 'No Treasure'}
                        </span>
                        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                          ({search.x}, {search.y})
                        </div>
                      </div>

                      {/* Wallet Address */}
                      <div>
                        <span className="text-sm text-gray-600">Wallet: </span>
                        <span className="font-mono text-sm text-gray-900" title={search.walletAddress}>
                          {truncateAddress(search.walletAddress)}
                        </span>
                      </div>

                      {/* Transaction Signature */}
                      <div>
                        <span className="text-sm text-gray-600">Transaction: </span>
                        <a
                          href={`https://solscan.io/tx/${search.txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          title={search.txSignature}
                        >
                          {truncateAddress(search.txSignature)}
                        </a>
                      </div>

                      {/* Treasure ID if found */}
                      {search.found && search.treasureId && (
                        <div>
                          <span className="text-sm text-gray-600">Treasure ID: </span>
                          <span className="font-mono text-sm text-green-700">
                            {truncateAddress(search.treasureId)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Metadata */}
                    <div className="md:text-right space-y-2">
                      <div className="text-sm text-gray-600">
                        {formatDate(search.searchedAt)}
                      </div>
                      {search.metadata.slot && (
                        <div className="text-xs text-gray-500">
                          Slot: {search.metadata.slot.toLocaleString()}
                        </div>
                      )}
                      {search.metadata.fee !== null && (
                        <div className="text-xs text-gray-500">
                          Fee: {(search.metadata.fee / 1_000_000_000).toFixed(6)} SOL
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchTransactionsPage;
