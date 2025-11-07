/**
 * NFT Minting Service
 * Handles minting collectible NFTs on Solana when players discover treasures
 */

const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Configuration
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
const METAPLEX_TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Metadata configuration for different collectible types
const COLLECTIBLE_METADATA = {
  'golden-fragment': {
    name: 'Golden Asteroid Fragment',
    symbol: 'DOTTY',
    uri: 'https://raw.githubusercontent.com/yourusername/dotty/main/solana/metadata/examples/golden-fragment.json'
  },
  'crystal-shard': {
    name: 'Crystal Energy Shard',
    symbol: 'DOTTY',
    uri: 'https://raw.githubusercontent.com/yourusername/dotty/main/solana/metadata/examples/crystal-shard.json'
  },
  'alien-artifact': {
    name: 'Ancient Alien Artifact',
    symbol: 'DOTTY',
    uri: 'https://raw.githubusercontent.com/yourusername/dotty/main/solana/metadata/examples/alien-artifact.json'
  }
};

/**
 * NFT Minting Service Class
 */
class NFTMintingService {
  constructor() {
    this.connection = null;
    this.backendWallet = null;
    this.program = null;
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Connect to Solana
      const endpoint = SOLANA_NETWORK === 'mainnet'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';

      this.connection = new Connection(endpoint, 'confirmed');
      console.log(`Connected to Solana ${SOLANA_NETWORK}`);

      // Load backend wallet keypair
      // In production, load this from environment variables or secure key management
      // For now, we'll create instructions for setting this up
      const walletPath = process.env.SOLANA_WALLET_PATH || path.join(process.env.HOME, '.config/solana/id.json');

      if (!fs.existsSync(walletPath)) {
        console.warn('⚠️  Solana wallet not found. NFT minting will be disabled.');
        console.warn('   Create a wallet with: solana-keygen new');
        console.warn(`   Or set SOLANA_WALLET_PATH environment variable`);
        return false;
      }

      const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
      );
      this.backendWallet = walletKeypair;
      console.log(`Backend wallet loaded: ${walletKeypair.publicKey.toString()}`);

      // Check wallet balance
      const balance = await this.connection.getBalance(walletKeypair.publicKey);
      console.log(`Wallet balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);

      if (balance === 0) {
        console.warn('⚠️  Wallet has 0 SOL. Request airdrop with:');
        console.warn(`   solana airdrop 2 ${walletKeypair.publicKey.toString()} --url devnet`);
      }

      // TODO: Initialize Anchor program when IDL is available
      // For now, we'll prepare the structure
      this.initialized = true;
      console.log('NFT Minting Service initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize NFT Minting Service:', error);
      return false;
    }
  }

  /**
   * Mint an NFT for a player
   * @param {string} playerWalletAddress - The player's wallet address
   * @param {string} collectibleType - Type of collectible (e.g., 'golden-fragment')
   * @returns {Object} - Minting result with transaction signature
   */
  async mintCollectible(playerWalletAddress, collectibleType) {
    if (!this.initialized) {
      throw new Error('NFT Minting Service not initialized');
    }

    // Validate inputs
    if (!playerWalletAddress) {
      throw new Error('Player wallet address is required');
    }

    if (!COLLECTIBLE_METADATA[collectibleType]) {
      throw new Error(`Unknown collectible type: ${collectibleType}`);
    }

    try {
      const playerPubkey = new PublicKey(playerWalletAddress);
      const metadata = COLLECTIBLE_METADATA[collectibleType];

      console.log(`Minting ${collectibleType} for ${playerWalletAddress}`);

      // Generate a new mint account
      const mintKeypair = Keypair.generate();

      // Derive the associated token account for the player
      const playerTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        playerPubkey
      );

      // Derive the metadata account address
      const [metadataAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METAPLEX_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        METAPLEX_TOKEN_METADATA_PROGRAM_ID
      );

      console.log('Mint account:', mintKeypair.publicKey.toString());
      console.log('Player token account:', playerTokenAccount.toString());
      console.log('Metadata account:', metadataAddress.toString());

      // TODO: Call the Anchor program's mint_collectible function
      // This requires the compiled program IDL
      // For now, return a placeholder response

      console.log('✅ NFT minted successfully (simulated)');

      return {
        success: true,
        signature: 'SIMULATED_TRANSACTION_' + Date.now(),
        mint: mintKeypair.publicKey.toString(),
        tokenAccount: playerTokenAccount.toString(),
        metadata: metadata,
        message: 'NFT minting simulated (waiting for program deployment)'
      };

    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Get the wallet's public key
   */
  getWalletAddress() {
    return this.backendWallet?.publicKey?.toString() || null;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized && this.backendWallet !== null;
  }
}

// Export singleton instance
const nftService = new NFTMintingService();

module.exports = {
  nftService,
  NFTMintingService
};
