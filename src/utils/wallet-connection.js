/**
 * Solana Wallet Connection Utility
 * Handles Phantom wallet connection and NFT minting requests
 */

export class WalletConnection {
  constructor() {
    this.wallet = null;
    this.connected = false;
    this.connecting = false;
    this.publicKey = null;
    this.listeners = new Set();
  }

  /**
   * Check if Phantom wallet is installed
   */
  isPhantomInstalled() {
    return window.solana && window.solana.isPhantom;
  }

  /**
   * Connect to Phantom wallet
   */
  async connect() {
    if (this.connecting) {
      console.log('Already connecting...');
      return;
    }

    if (!this.isPhantomInstalled()) {
      const installUrl = 'https://phantom.app/';
      alert('Phantom wallet is not installed. You will be redirected to install it.');
      window.open(installUrl, '_blank');
      throw new Error('Phantom wallet not installed');
    }

    try {
      this.connecting = true;
      console.log('Connecting to Phantom wallet...');

      const resp = await window.solana.connect();
      this.wallet = window.solana;
      this.publicKey = resp.publicKey.toString();
      this.connected = true;

      console.log('Wallet connected:', this.publicKey);

      // Listen for disconnection
      this.wallet.on('disconnect', () => {
        this.handleDisconnect();
      });

      // Listen for account changes
      this.wallet.on('accountChanged', (publicKey) => {
        if (publicKey) {
          this.publicKey = publicKey.toString();
          console.log('Account changed:', this.publicKey);
          this.notifyListeners();
        } else {
          this.handleDisconnect();
        }
      });

      this.notifyListeners();
      return this.publicKey;

    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect() {
    if (this.wallet) {
      try {
        await this.wallet.disconnect();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    this.handleDisconnect();
  }

  /**
   * Handle disconnect event
   */
  handleDisconnect() {
    this.connected = false;
    this.publicKey = null;
    this.wallet = null;
    console.log('Wallet disconnected');
    this.notifyListeners();
  }

  /**
   * Request to mint an NFT for a collected item
   * @param {string} collectibleType - Type of collectible (e.g., 'golden-fragment')
   */
  async requestMintNFT(collectibleType) {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`Requesting mint for ${collectibleType}...`);

      // Call backend API to mint NFT
      const response = await fetch('/api/mint-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: this.publicKey,
          collectibleType: collectibleType
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Minting failed');
      }

      console.log('NFT minted successfully:', result);
      return result;

    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Check NFT service status
   */
  async checkServiceStatus() {
    try {
      const response = await fetch('/api/nft-status');
      const status = await response.json();
      return status;
    } catch (error) {
      console.error('Error checking service status:', error);
      return { ready: false };
    }
  }

  /**
   * Add a listener for wallet state changes
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          connected: this.connected,
          publicKey: this.publicKey
        });
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }

  /**
   * Get current connection state
   */
  getState() {
    return {
      connected: this.connected,
      publicKey: this.publicKey,
      isPhantomInstalled: this.isPhantomInstalled()
    };
  }
}

// Export singleton instance
export const walletConnection = new WalletConnection();
