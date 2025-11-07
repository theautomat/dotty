/**
 * Wallet UI Component
 * Displays wallet connection button and status
 */

import { walletConnection } from '../utils/wallet-connection.js';

export class WalletUI {
  constructor() {
    this.container = null;
    this.connectButton = null;
    this.statusText = null;
    this.addressDisplay = null;
    this.init();
  }

  init() {
    // Create UI container
    this.container = document.createElement('div');
    this.container.id = 'wallet-ui';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #9945FF;
      border-radius: 12px;
      padding: 15px;
      color: white;
      font-family: 'Arial', sans-serif;
      z-index: 1000;
      min-width: 200px;
      backdrop-filter: blur(10px);
    `;

    // Create connect button
    this.connectButton = document.createElement('button');
    this.connectButton.textContent = 'Connect Wallet';
    this.connectButton.style.cssText = `
      width: 100%;
      padding: 10px;
      background: linear-gradient(90deg, #9945FF, #14F195);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      cursor: pointer;
      font-size: 14px;
      transition: transform 0.2s, opacity 0.2s;
    `;

    this.connectButton.onmouseover = () => {
      this.connectButton.style.transform = 'scale(1.05)';
    };

    this.connectButton.onmouseout = () => {
      this.connectButton.style.transform = 'scale(1)';
    };

    this.connectButton.onclick = () => this.handleConnectClick();

    // Create address display
    this.addressDisplay = document.createElement('div');
    this.addressDisplay.style.cssText = `
      margin-top: 10px;
      font-size: 12px;
      word-break: break-all;
      display: none;
      color: #14F195;
    `;

    // Create status text
    this.statusText = document.createElement('div');
    this.statusText.style.cssText = `
      margin-top: 10px;
      font-size: 11px;
      opacity: 0.7;
      text-align: center;
    `;
    this.statusText.textContent = 'NFT minting ready';

    // Add elements to container
    this.container.appendChild(this.connectButton);
    this.container.appendChild(this.addressDisplay);
    this.container.appendChild(this.statusText);

    // Add to page
    document.body.appendChild(this.container);

    // Listen for wallet state changes
    walletConnection.addListener((state) => {
      this.updateUI(state);
    });

    // Check initial state
    this.updateUI(walletConnection.getState());

    // Check service status
    this.checkServiceStatus();
  }

  async checkServiceStatus() {
    const status = await walletConnection.checkServiceStatus();
    if (!status.ready) {
      this.statusText.textContent = '⚠️ NFT service not ready';
      this.statusText.style.color = '#FFA500';
    } else {
      this.statusText.textContent = '✓ NFT minting ready';
      this.statusText.style.color = '#14F195';
    }
  }

  async handleConnectClick() {
    const state = walletConnection.getState();

    if (state.connected) {
      // Already connected, show disconnect option
      if (confirm('Disconnect wallet?')) {
        await walletConnection.disconnect();
      }
    } else {
      // Not connected, try to connect
      try {
        await walletConnection.connect();
      } catch (error) {
        console.error('Failed to connect:', error);
        alert('Failed to connect wallet: ' + error.message);
      }
    }
  }

  updateUI(state) {
    if (state.connected) {
      this.connectButton.textContent = '✓ Connected';
      this.connectButton.style.background = '#14F195';
      this.addressDisplay.style.display = 'block';
      this.addressDisplay.textContent = `${state.publicKey.slice(0, 4)}...${state.publicKey.slice(-4)}`;
    } else {
      this.connectButton.textContent = state.isPhantomInstalled ? 'Connect Wallet' : 'Install Phantom';
      this.connectButton.style.background = 'linear-gradient(90deg, #9945FF, #14F195)';
      this.addressDisplay.style.display = 'none';
    }
  }

  /**
   * Show a notification when NFT is minted
   */
  showMintNotification(collectibleName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 3px solid #14F195;
      border-radius: 16px;
      padding: 30px;
      color: white;
      font-family: 'Arial', sans-serif;
      z-index: 2000;
      text-align: center;
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">NFT Minted!</div>
      <div style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">${collectibleName}</div>
      <div style="font-size: 12px; color: #14F195;">Check your Phantom wallet</div>
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  destroy() {
    if (this.container) {
      this.container.remove();
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    to {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
