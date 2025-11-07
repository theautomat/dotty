/**
 * Solana and Phantom wallet type definitions
 */

export interface PhantomWallet {
  isPhantom: boolean;
  publicKey: {
    toString(): string;
    toBase58(): string;
  } | null;
  isConnected: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PhantomPublicKey }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  signMessage(message: Uint8Array, display?: string): Promise<{ signature: Uint8Array }>;
  on(event: string, handler: (args: any) => void): void;
  request(args: any): Promise<any>;
}

export interface PhantomPublicKey {
  toString(): string;
  toBase58(): string;
  toBuffer(): Buffer;
}

export interface SolanaNetwork {
  name: string;
  url: string;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface MintNFTRequest {
  walletAddress: string;
  collectibleType: string;
}

export interface MintNFTResponse {
  success: boolean;
  signature?: string;
  mint?: string;
  error?: string;
}
