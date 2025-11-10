import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  mockHiddenTreasures,
  getTreasureStats,
  type HiddenTreasure,
  type TreasureStatus,
  type TokenType,
} from '@/data/mockTreasureData';
import { Button } from '@/components/ui/button';

export function TreasureGalleryPage() {
  const [selectedStatus, setSelectedStatus] = useState<TreasureStatus | 'all'>('all');
  const [selectedToken, setSelectedToken] = useState<TokenType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = getTreasureStats();

  // Filter and sort treasures
  const filteredTreasures = useMemo(() => {
    let filtered = [...mockHiddenTreasures];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    // Filter by token
    if (selectedToken !== 'all') {
      filtered = filtered.filter(t => t.tokenType === selectedToken);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.hiddenBy.toLowerCase().includes(term) ||
          t.walletAddress.toLowerCase().includes(term) ||
          t.monsterType.toLowerCase().includes(term)
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
  }, [selectedStatus, selectedToken, sortBy, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
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
                placeholder="Search by name, wallet, or monster..."
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
        <div className="mb-4 text-gray-400">
          Showing {filteredTreasures.length} of {stats.total} treasures
        </div>

        {filteredTreasures.length === 0 ? (
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-12 border border-purple-500/20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No treasures found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTreasures.map(treasure => (
              <TreasureCard key={treasure.id} treasure={treasure} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Treasure Card Component
function TreasureCard({ treasure }: { treasure: HiddenTreasure }) {
  const statusConfig = {
    active: {
      color: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-500/40',
      badgeColor: 'bg-green-500/20 text-green-300 border-green-500/40',
      label: 'Active',
    },
    claimed: {
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/40',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      label: 'Claimed',
    },
    expired: {
      color: 'from-gray-500/20 to-gray-600/20',
      borderColor: 'border-gray-500/40',
      badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
      label: 'Expired',
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
            <span className="text-4xl">{treasure.monsterEmoji}</span>
            <div>
              <div className="text-sm text-gray-400">Monster</div>
              <div className="font-semibold text-white">{treasure.monsterType}</div>
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
          <div className="text-white font-medium">{treasure.hiddenBy}</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">
            {treasure.walletAddress.slice(0, 8)}...{treasure.walletAddress.slice(-6)}
          </div>
        </div>

        {/* Coordinates */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Location</div>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono">
              ({treasure.hiddenLocation.x}, {treasure.hiddenLocation.y})
            </span>
            <span className="text-gray-500">📍</span>
          </div>
        </div>

        {/* Dates */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hidden At</div>
          <div className="text-white text-sm">{new Date(treasure.hiddenAt).toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">{new Date(treasure.hiddenAt).toLocaleTimeString()}</div>
        </div>

        {treasure.claimDate && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Claimed Date</div>
            <div className="text-white text-sm">{new Date(treasure.claimDate).toLocaleDateString()}</div>
            {treasure.claimedBy && (
              <div className="text-xs text-blue-400 mt-1">by {treasure.claimedBy}</div>
            )}
          </div>
        )}

        {/* Transaction */}
        {treasure.txSignature && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Transaction</div>
            <div className="text-xs text-purple-400 font-mono">{treasure.txSignature}</div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      {treasure.status === 'active' && (
        <div className="p-6 pt-0">
          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            onClick={() => alert(`Navigate to treasure at (${treasure.hiddenLocation.x}, ${treasure.hiddenLocation.y})`)}
          >
            🗺️ Find This Treasure
          </Button>
        </div>
      )}
    </div>
  );
}
