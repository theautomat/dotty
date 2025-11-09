export type TreasureStatus = 'active' | 'claimed' | 'expired';
export type TokenType = 'PEPE' | 'BONK' | 'WIF' | 'USDC' | 'SOL';

export interface TreasureDeposit {
  id: string;
  depositedBy: string;
  walletAddress: string;
  amount: number;
  tokenType: TokenType;
  depositDate: string;
  claimDate?: string;
  status: TreasureStatus;
  coordinates: { x: number; y: number };
  monsterType: string;
  monsterEmoji: string;
  txSignature?: string;
  claimedBy?: string;
}

// Mock treasure deposit data
export const mockTreasureDeposits: TreasureDeposit[] = [
  {
    id: '1',
    depositedBy: 'CryptoWhale',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    amount: 10000,
    tokenType: 'PEPE',
    depositDate: '2025-01-15T10:30:00Z',
    status: 'active',
    coordinates: { x: 42, y: 128 },
    monsterType: 'Dragon',
    monsterEmoji: '🐉',
    txSignature: '5xKp...Qw7R',
  },
  {
    id: '2',
    depositedBy: 'MemeKing',
    walletAddress: 'BzKx7g3Hv98d97TXJSDpbD5jBkheTqA83TZRuJosgZsT',
    amount: 5000,
    tokenType: 'BONK',
    depositDate: '2025-01-16T14:20:00Z',
    claimDate: '2025-01-18T09:30:00Z',
    status: 'claimed',
    coordinates: { x: 88, y: 64 },
    monsterType: 'Goblin',
    monsterEmoji: '👺',
    txSignature: '8pLm...Zx9K',
    claimedBy: 'LuckyExplorer',
  },
  {
    id: '3',
    depositedBy: 'SolanaFan',
    walletAddress: 'DnPz8h4Jw87d97TXJSDpbD5jBkheTqA83TZRuJosgBvW',
    amount: 25000,
    tokenType: 'WIF',
    depositDate: '2025-01-17T08:15:00Z',
    status: 'active',
    coordinates: { x: 156, y: 92 },
    monsterType: 'Phoenix',
    monsterEmoji: '🔥',
    txSignature: '3mNk...Hv2P',
  },
  {
    id: '4',
    depositedBy: 'DiamondHands',
    walletAddress: 'FrQw9i5Kx87d97TXJSDpbD5jBkheTqA83TZRuJosgCyX',
    amount: 500,
    tokenType: 'USDC',
    depositDate: '2025-01-18T16:45:00Z',
    claimDate: '2025-01-20T11:15:00Z',
    status: 'claimed',
    coordinates: { x: 200, y: 45 },
    monsterType: 'Kraken',
    monsterEmoji: '🦑',
    txSignature: '9qPl...Jw3M',
    claimedBy: 'TreasureHunter',
  },
  {
    id: '5',
    depositedBy: 'ApeNation',
    walletAddress: 'HsRx0j6Ly87d97TXJSDpbD5jBkheTqA83TZRuJosgDzY',
    amount: 15000,
    tokenType: 'PEPE',
    depositDate: '2025-01-19T12:00:00Z',
    status: 'active',
    coordinates: { x: 72, y: 180 },
    monsterType: 'Unicorn',
    monsterEmoji: '🦄',
    txSignature: '2nKm...Pv8Q',
  },
  {
    id: '6',
    depositedBy: 'MoonBoy',
    walletAddress: 'JtSy1k7Mz87d97TXJSDpbD5jBkheTqA83TZRuJosgEaZ',
    amount: 8000,
    tokenType: 'BONK',
    depositDate: '2025-01-20T09:30:00Z',
    status: 'active',
    coordinates: { x: 112, y: 156 },
    monsterType: 'Dragon',
    monsterEmoji: '🐉',
    txSignature: '4oLn...Qw9R',
  },
  {
    id: '7',
    depositedBy: 'DeFiGuru',
    walletAddress: 'KuTz2l8Na87d97TXJSDpbD5jBkheTqA83TZRuJosgFbA',
    amount: 1200,
    tokenType: 'SOL',
    depositDate: '2025-01-21T15:20:00Z',
    claimDate: '2025-01-22T10:45:00Z',
    status: 'claimed',
    coordinates: { x: 56, y: 220 },
    monsterType: 'Goblin',
    monsterEmoji: '👺',
    txSignature: '6pMo...Rx0S',
    claimedBy: 'NinjaMiner',
  },
  {
    id: '8',
    depositedBy: 'NFTCollector',
    walletAddress: 'LvUa3m9Ob87d97TXJSDpbD5jBkheTqA83TZRuJosgGcB',
    amount: 30000,
    tokenType: 'WIF',
    depositDate: '2025-01-22T11:10:00Z',
    status: 'active',
    coordinates: { x: 184, y: 104 },
    monsterType: 'Phoenix',
    monsterEmoji: '🔥',
    txSignature: '7qNo...Sy1T',
  },
  {
    id: '9',
    depositedBy: 'HODLer',
    walletAddress: 'MwVb4n0Pc87d97TXJSDpbD5jBkheTqA83TZRuJosgHdC',
    amount: 2500,
    tokenType: 'USDC',
    depositDate: '2025-01-23T13:40:00Z',
    status: 'active',
    coordinates: { x: 128, y: 88 },
    monsterType: 'Kraken',
    monsterEmoji: '🦑',
    txSignature: '8rOp...Tz2U',
  },
  {
    id: '10',
    depositedBy: 'GemHunter',
    walletAddress: 'NxWc5o1Qd87d97TXJSDpbD5jBkheTqA83TZRuJosgIeD',
    amount: 18000,
    tokenType: 'PEPE',
    depositDate: '2025-01-24T10:25:00Z',
    claimDate: '2025-01-25T14:50:00Z',
    status: 'claimed',
    coordinates: { x: 96, y: 136 },
    monsterType: 'Unicorn',
    monsterEmoji: '🦄',
    txSignature: '9sPq...Ua3V',
    claimedBy: 'FortuneSeeker',
  },
  {
    id: '11',
    depositedBy: 'AlphaTrader',
    walletAddress: 'OyXd6p2Re87d97TXJSDpbD5jBkheTqA83TZRuJosgJfE',
    amount: 50000,
    tokenType: 'BONK',
    depositDate: '2025-01-25T08:55:00Z',
    status: 'active',
    coordinates: { x: 164, y: 72 },
    monsterType: 'Dragon',
    monsterEmoji: '🐉',
    txSignature: '0tRr...Vb4W',
  },
  {
    id: '12',
    depositedBy: 'CryptoNinja',
    walletAddress: 'PzYe7q3Sf87d97TXJSDpbD5jBkheTqA83TZRuJosgKgF',
    amount: 3500,
    tokenType: 'SOL',
    depositDate: '2025-01-26T16:30:00Z',
    status: 'active',
    coordinates: { x: 48, y: 192 },
    monsterType: 'Goblin',
    monsterEmoji: '👺',
    txSignature: '1uSs...Wc5X',
  },
  {
    id: '13',
    depositedBy: 'WhaleWatcher',
    walletAddress: 'QaZf8r4Tg87d97TXJSDpbD5jBkheTqA83TZRuJosgLhG',
    amount: 12000,
    tokenType: 'WIF',
    depositDate: '2025-01-27T12:15:00Z',
    claimDate: '2025-01-28T09:20:00Z',
    status: 'claimed',
    coordinates: { x: 140, y: 116 },
    monsterType: 'Phoenix',
    monsterEmoji: '🔥',
    txSignature: '2vTt...Xd6Y',
    claimedBy: 'AdventureSeeker',
  },
  {
    id: '14',
    depositedBy: 'TokenMaster',
    walletAddress: 'RbAg9s5Uh87d97TXJSDpbD5jBkheTqA83TZRuJosgMiH',
    amount: 7500,
    tokenType: 'USDC',
    depositDate: '2025-01-28T14:50:00Z',
    status: 'active',
    coordinates: { x: 208, y: 148 },
    monsterType: 'Kraken',
    monsterEmoji: '🦑',
    txSignature: '3wUu...Ye7Z',
  },
  {
    id: '15',
    depositedBy: 'MoonMission',
    walletAddress: 'ScBh0t6Vi87d97TXJSDpbD5jBkheTqA83TZRuJosgNjI',
    amount: 22000,
    tokenType: 'PEPE',
    depositDate: '2025-01-29T11:35:00Z',
    status: 'active',
    coordinates: { x: 80, y: 200 },
    monsterType: 'Unicorn',
    monsterEmoji: '🦄',
    txSignature: '4xVv...Zf8A',
  },
  {
    id: '16',
    depositedBy: 'SolanaBull',
    walletAddress: 'TdCi1u7Wj87d97TXJSDpbD5jBkheTqA83TZRuJosgOkJ',
    amount: 6000,
    tokenType: 'BONK',
    depositDate: '2025-02-01T09:20:00Z',
    status: 'expired',
    coordinates: { x: 176, y: 56 },
    monsterType: 'Dragon',
    monsterEmoji: '🐉',
    txSignature: '5yWw...Ag9B',
  },
];

// Helper functions for filtering
export const getActiveTreasures = () =>
  mockTreasureDeposits.filter(t => t.status === 'active');

export const getClaimedTreasures = () =>
  mockTreasureDeposits.filter(t => t.status === 'claimed');

export const getTreasuresByToken = (tokenType: TokenType) =>
  mockTreasureDeposits.filter(t => t.tokenType === tokenType);

export const getTreasuresByStatus = (status: TreasureStatus) =>
  mockTreasureDeposits.filter(t => t.status === status);

// Get unique token types
export const getUniqueTokens = (): TokenType[] => {
  const tokens = new Set(mockTreasureDeposits.map(t => t.tokenType));
  return Array.from(tokens);
};

// Get stats
export interface TreasureStats {
  total: number;
  active: number;
  claimed: number;
  expired: number;
  totalValue: Record<TokenType, number>;
}

export const getTreasureStats = (): TreasureStats => {
  const stats: TreasureStats = {
    total: mockTreasureDeposits.length,
    active: 0,
    claimed: 0,
    expired: 0,
    totalValue: {} as Record<TokenType, number>,
  };

  mockTreasureDeposits.forEach(treasure => {
    stats[treasure.status]++;

    if (!stats.totalValue[treasure.tokenType]) {
      stats.totalValue[treasure.tokenType] = 0;
    }
    stats.totalValue[treasure.tokenType] += treasure.amount;
  });

  return stats;
};
