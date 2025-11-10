#!/usr/bin/env node

/**
 * Helius Webhook Testing Utility
 *
 * This script simulates a Helius webhook call to test your treasure hiding endpoint locally.
 *
 * Usage:
 *   node test-helius-webhook.js
 *   node test-helius-webhook.js --amount 5.5 --token SOL
 *   node test-helius-webhook.js --wallet <wallet-address>
 */

const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

// Configuration
const SERVER_HOST = getArg('host', 'localhost');
const SERVER_PORT = getArg('port', '3001');
const AMOUNT = parseFloat(getArg('amount', '100'));
const TOKEN = getArg('token', 'TEST');
const WALLET = getArg('wallet', 'DemoWallet123456789ABCDEFGHIJK');
const AUTH_HEADER = process.env.HELIUS_WEBHOOK_AUTH_HEADER || 'test-auth-secret';

// Generate a mock transaction signature
function generateMockSignature() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let signature = '';
  for (let i = 0; i < 88; i++) {
    signature += chars[Math.floor(Math.random() * chars.length)];
  }
  return signature;
}

// Create mock Helius webhook payload
const mockHeliusPayload = [
  {
    // Transaction metadata
    signature: generateMockSignature(),
    type: 'TRANSFER',
    timestamp: Date.now(),
    slot: 123456789,
    fee: 5000,
    feePayer: WALLET,

    // Native transfers (for SOL)
    nativeTransfers: TOKEN === 'SOL' ? [
      {
        fromUserAccount: WALLET,
        toUserAccount: 'TreasureVaultAccount123456789',
        amount: AMOUNT * 1e9 // Convert to lamports
      }
    ] : [],

    // Token transfers (for SPL tokens)
    tokenTransfers: TOKEN !== 'SOL' ? [
      {
        fromUserAccount: WALLET,
        toUserAccount: 'TreasureVaultAccount123456789',
        tokenAmount: AMOUNT,
        mint: `${TOKEN}MintAddress123456789`,
        tokenSymbol: TOKEN
      }
    ] : [],

    // Account data
    accountData: [
      {
        account: WALLET,
        nativeBalanceChange: TOKEN === 'SOL' ? -(AMOUNT * 1e9 + 5000) : -5000,
        tokenBalanceChanges: []
      }
    ],

    // Description
    description: `Treasure hidden: ${AMOUNT} ${TOKEN}`,

    // Events (program-specific)
    events: [
      {
        type: 'HIDE_TREASURE',
        programId: process.env.SOLANA_PROGRAM_ID || 'YourGameProgramId123456789',
        data: {
          wallet: WALLET,
          amount: AMOUNT,
          token: TOKEN
        }
      }
    ]
  }
];

// Send webhook request
function sendWebhook() {
  const payload = JSON.stringify(mockHeliusPayload, null, 2);

  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/webhooks/helius',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': AUTH_HEADER
    }
  };

  console.log('🚀 Sending mock Helius webhook...\n');
  console.log('📋 Request Details:');
  console.log(`   URL: http://${SERVER_HOST}:${SERVER_PORT}${options.path}`);
  console.log(`   Amount: ${AMOUNT} ${TOKEN}`);
  console.log(`   Wallet: ${WALLET}`);
  console.log(`   Signature: ${mockHeliusPayload[0].signature}`);
  console.log('');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`📥 Response Status: ${res.statusCode}\n`);

      try {
        const response = JSON.parse(data);
        console.log('📦 Response Body:');
        console.log(JSON.stringify(response, null, 2));

        if (response.success) {
          console.log('\n✅ Webhook processed successfully!');
          if (response.results && response.results.length > 0) {
            console.log(`   Transaction ID: ${response.results[0].id}`);
          }
        } else {
          console.log('\n❌ Webhook processing failed!');
          console.log(`   Error: ${response.error}`);
        }
      } catch (error) {
        console.log('Response:', data);
      }

      console.log('\n📊 Next Steps:');
      console.log('   1. Check Firestore emulator: http://localhost:4000');
      console.log('   2. Query treasures: curl http://localhost:3000/api/treasures');
      console.log(`   3. Get this treasure: curl http://localhost:3000/api/treasures/${mockHeliusPayload[0].signature}`);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error sending webhook:', error.message);
    console.error('\n💡 Make sure your server is running:');
    console.error('   npm run server');
  });

  req.write(payload);
  req.end();
}

// Display help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Helius Webhook Testing Utility

Usage:
  node test-helius-webhook.js [options]

Options:
  --host <host>       Server host (default: localhost)
  --port <port>       Server port (default: 3000)
  --amount <amount>   Treasure amount (default: 2.5)
  --token <token>     Token type (default: SOL)
  --wallet <address>  Wallet address (default: mock address)
  --help, -h          Show this help message

Examples:
  node test-helius-webhook.js
  node test-helius-webhook.js --amount 10 --token BONK
  node test-helius-webhook.js --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

Environment Variables:
  HELIUS_WEBHOOK_AUTH_HEADER - Auth header for webhook verification
  SOLANA_PROGRAM_ID          - Your Solana program ID

Prerequisites:
  1. Start Firebase emulator: firebase emulators:start
  2. Start your server: npm run server
  3. Run this script: node test-helius-webhook.js
`);
  process.exit(0);
}

// Run the webhook test
sendWebhook();
