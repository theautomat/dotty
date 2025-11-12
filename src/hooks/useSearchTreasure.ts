import { useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import gameIdl from '../../solana/target/idl/game.json';

export const useSearchTreasure = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTreasure = async (x: number, y: number) => {
    if (!publicKey || !anchorWallet) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Create Anchor provider
      const provider = new AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed' }
      );

      // Load program with IDL
      const programIdString = (gameIdl as any).metadata?.address;
      if (!programIdString) {
        throw new Error('Program ID not found in IDL');
      }
      const programIdPubkey = new PublicKey(programIdString);
      const program = new Program(gameIdl as any, programIdPubkey, provider);

      // Generate unique search ID using timestamp
      const searchId = new BN(Date.now());

      // Derive search_record PDA
      const [searchRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('search'),
          publicKey.toBuffer(),
          searchId.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      );

      console.log('Searching treasure at coordinates:', x, y);
      console.log('Search ID:', searchId.toString());
      console.log('Search Record PDA:', searchRecordPda.toString());

      // Call searchTreasure instruction using Anchor
      const tx = await program.methods
        .searchTreasure(x, y, searchId)
        .accounts({
          player: publicKey,
          searchRecord: searchRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Search transaction successful!');
      console.log('Transaction signature:', tx);
      console.log('Coordinates searched:', `(${x}, ${y})`);

      // Success! Clear any previous errors
      setError(null);

      return {
        success: true,
        signature: tx,
        coordinates: { x, y },
        searchId: searchId.toString(),
      };

    } catch (err: any) {
      console.error('Failed to search treasure:', err);
      const errorMessage = err.message || 'Failed to search treasure';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };

    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchTreasure,
    isSearching,
    error,
  };
};
