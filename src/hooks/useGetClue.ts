import { useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import gameIdl from '../../solana/target/idl/game.json';
import { SOLANA_CONFIG } from '../config/solana';

export const useGetClue = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [isGettingClue, setIsGettingClue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClue = async (treasureId: string) => {
    if (!publicKey || !anchorWallet) {
      setError('Please connect your wallet first');
      return;
    }

    setIsGettingClue(true);
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

      // Generate unique clue ID using timestamp
      const clueId = new BN(Date.now());

      // Get BOOTY token mint
      if (!SOLANA_CONFIG.BOOTY_TOKEN_MINT) {
        throw new Error('BOOTY token mint not configured. Please run dev:local setup.');
      }
      const bootyMint = new PublicKey(SOLANA_CONFIG.BOOTY_TOKEN_MINT);

      // Derive player's BOOTY token account
      const playerBootyAccount = await getAssociatedTokenAddress(
        bootyMint,
        publicKey
      );

      // Derive vault's BOOTY token account (vault PDA is the owner)
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault')],
        program.programId
      );
      const vaultBootyAccount = await getAssociatedTokenAddress(
        bootyMint,
        vaultPda,
        true // allowOwnerOffCurve = true for PDAs
      );

      // Derive clue_record PDA
      const [clueRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('clue'),
          publicKey.toBuffer(),
          clueId.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      );

      console.log('Getting clue for treasure:', treasureId);
      console.log('Clue ID:', clueId.toString());

      // Call getClue instruction using Anchor
      const tx = await program.methods
        .getClue(treasureId, clueId)
        .accounts({
          player: publicKey,
          playerBootyAccount: playerBootyAccount,
          vaultBootyAccount: vaultBootyAccount,
          clueRecord: clueRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Clue purchase transaction successful!');
      console.log('Transaction signature:', tx);
      console.log('Treasure ID:', treasureId);

      // Success! Clear any previous errors
      setError(null);

      return {
        success: true,
        signature: tx,
        treasureId,
        clueId: clueId.toString(),
      };

    } catch (err: any) {
      console.error('Failed to get clue:', err);
      const errorMessage = err.message || 'Failed to get clue';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };

    } finally {
      setIsGettingClue(false);
    }
  };

  return {
    getClue,
    isGettingClue,
    error,
  };
};
