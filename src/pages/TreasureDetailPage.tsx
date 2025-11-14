import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGetClue } from '@/hooks/useGetClue';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Treasure {
  id: string;
  txSignature: string;
  walletAddress: string;
  amount: number;
  tokenType: string;
  status: 'active' | 'claimed' | 'expired';
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

interface Clue {
  id: string;
  txSignature: string;
  walletAddress: string;
  treasureId: string;
  clueText?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  purchasedAt: string;
  generatedAt?: string;
}

export function TreasureDetailPage() {
  const { treasureId } = useParams<{ treasureId: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { getClue, isGettingClue, error: clueError } = useGetClue();

  const [treasure, setTreasure] = useState<Treasure | null>(null);
  const [userClues, setUserClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch treasure details
  useEffect(() => {
    if (!treasureId) return;

    async function fetchTreasure() {
      try {
        setLoading(true);
        setError(null);

        const treasureRef = doc(db, 'treasures', treasureId);
        const treasureSnap = await getDoc(treasureRef);

        if (!treasureSnap.exists()) {
          setError('Treasure not found');
          return;
        }

        setTreasure({
          id: treasureSnap.id,
          ...treasureSnap.data()
        } as Treasure);

      } catch (err) {
        console.error('Error fetching treasure:', err);
        setError('Failed to load treasure details');
      } finally {
        setLoading(false);
      }
    }

    fetchTreasure();
  }, [treasureId]);

  // Subscribe to user's clues for this treasure
  useEffect(() => {
    if (!treasureId || !publicKey) return;

    const cluesRef = collection(db, 'treasures', treasureId, 'clues');
    const q = query(
      cluesRef,
      where('walletAddress', '==', publicKey.toString()),
      orderBy('purchasedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clues = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Clue[];

      setUserClues(clues);
    });

    return () => unsubscribe();
  }, [treasureId, publicKey]);

  const handleGetClue = async () => {
    if (!treasureId) return;

    const result = await getClue(treasureId);

    if (result?.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading treasure...</div>
      </div>
    );
  }

  if (error || !treasure) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl mb-4">{error || 'Treasure not found'}</div>
        <Button onClick={() => navigate('/treasure')}>
          Back to Gallery
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/treasure')}
            variant="outline"
            className="mb-4"
          >
            ← Back to Gallery
          </Button>
          <h1 className="text-4xl font-bold text-white mb-2">Treasure Details</h1>
          <p className="text-gray-400">ID: {treasure.id}</p>
        </div>

        {/* Treasure Info Card */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Treasure Information</h3>
              <div className="space-y-2 text-gray-300">
                <div>
                  <span className="text-gray-400">Amount:</span>{' '}
                  <span className="font-semibold">{treasure.amount} {treasure.tokenType}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>{' '}
                  <span className={cn(
                    "px-2 py-1 rounded text-sm font-semibold",
                    treasure.status === 'active' && "bg-green-500/20 text-green-300",
                    treasure.status === 'claimed' && "bg-blue-500/20 text-blue-300",
                    treasure.status === 'expired' && "bg-gray-500/20 text-gray-300"
                  )}>
                    {treasure.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Hidden By:</span>{' '}
                  <span className="font-mono text-sm">{treasure.walletAddress.slice(0, 8)}...{treasure.walletAddress.slice(-8)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Hidden At:</span>{' '}
                  <span>{new Date(treasure.hiddenAt).toLocaleString()}</span>
                </div>
                {treasure.claimedAt && (
                  <div>
                    <span className="text-gray-400">Claimed At:</span>{' '}
                    <span>{new Date(treasure.claimedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Blockchain Details</h3>
              <div className="space-y-2 text-gray-300">
                <div>
                  <span className="text-gray-400">Transaction:</span>{' '}
                  <a
                    href={`https://solscan.io/tx/${treasure.txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-mono text-sm underline"
                  >
                    {treasure.txSignature.slice(0, 8)}...{treasure.txSignature.slice(-8)}
                  </a>
                </div>
                {treasure.metadata?.slot && (
                  <div>
                    <span className="text-gray-400">Slot:</span>{' '}
                    <span>{treasure.metadata.slot.toLocaleString()}</span>
                  </div>
                )}
                {treasure.metadata?.fee && (
                  <div>
                    <span className="text-gray-400">Fee:</span>{' '}
                    <span>{(treasure.metadata.fee / 1000000000).toFixed(9)} SOL</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Get Clue Section */}
        {treasure.status === 'active' && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">🔮 Get a Clue</h3>
            <p className="text-gray-300 mb-4">
              Purchase a mystical clue from the Pirate Oracle to help you find this treasure's location!
              Each clue costs <span className="font-semibold text-yellow-400">10 BOOTY tokens</span>.
            </p>

            {!publicKey ? (
              <p className="text-yellow-400 mb-4">Connect your wallet to purchase clues</p>
            ) : (
              <Button
                onClick={handleGetClue}
                disabled={isGettingClue}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGettingClue ? 'Purchasing Clue...' : '💰 Purchase Clue (10 BOOTY)'}
              </Button>
            )}

            {clueError && (
              <p className="text-red-400 mt-2">{clueError}</p>
            )}

            {showSuccess && (
              <p className="text-green-400 mt-2">✅ Clue purchased! Generating your clue...</p>
            )}
          </Card>
        )}

        {/* User's Clues */}
        {publicKey && userClues.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📜 Your Clues</h3>
            <div className="space-y-4">
              {userClues.map((clue) => (
                <div
                  key={clue.id}
                  className="bg-black/20 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      clue.status === 'pending' && "bg-yellow-500/20 text-yellow-300",
                      clue.status === 'generating' && "bg-blue-500/20 text-blue-300",
                      clue.status === 'completed' && "bg-green-500/20 text-green-300",
                      clue.status === 'failed' && "bg-red-500/20 text-red-300"
                    )}>
                      {clue.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(clue.purchasedAt).toLocaleString()}
                    </span>
                  </div>

                  {clue.status === 'completed' && clue.clueText && (
                    <p className="text-yellow-200 italic leading-relaxed">{clue.clueText}</p>
                  )}

                  {clue.status === 'pending' && (
                    <p className="text-gray-400 italic">Awaiting generation...</p>
                  )}

                  {clue.status === 'generating' && (
                    <p className="text-blue-300 italic">The Pirate Oracle is speaking...</p>
                  )}

                  {clue.status === 'failed' && (
                    <p className="text-red-400 italic">Failed to generate clue. {clue.error}</p>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    <a
                      href={`https://solscan.io/tx/${clue.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      View Transaction
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
