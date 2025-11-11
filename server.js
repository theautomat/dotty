const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { nftService } = require('./nft-service');

// Import TypeScript modules (tsx/ts-node will handle .ts files)
const { firebaseAdmin } = require('./firebase-admin-config.ts');
const { treasureService } = require('./treasure-service.ts');
const { searchService } = require('./search-service.ts');
const {
  verifyHeliusAuth,
  handleHeliusWebhook,
  webhookHealthCheck
} = require('./helius-webhook-handler.ts');
const {
  handleSearchWebhook,
  searchWebhookHealthCheck
} = require('./search-webhook-handler.ts');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Middleware to parse JSON bodies
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Development-only setup with LiveReload
if (isDev) {
  console.log('Running in development mode with LiveReload');
  const livereload = require('livereload');
  const connectLivereload = require('connect-livereload');
  
  // Set up LiveReload server
  const liveReloadServer = livereload.createServer({
    delay: 300,
    debug: true
  });
  
  // Watch the game directory for changes
  liveReloadServer.watch([
    path.join(__dirname), // Watch the entire game directory
  ]);
  
  // Log when LiveReload detects a change
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      console.log("LiveReload connected - watching for changes...");
    }, 100);
  });
  
  // Inject LiveReload script into all HTML files
  app.use(connectLivereload());
}

// Set up middleware to serve static files
// In production, serve from dist directory (Vite build output)
// In development, Vite dev server handles the files
if (process.env.NODE_ENV === 'production') {
  console.log('Running in production mode - serving from dist directory');
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Also serve sounds from public directory
  app.use('/sounds', express.static(path.join(__dirname, 'public/sounds')));
} else {
  // In development, still serve assets like sounds, images, etc.
  console.log('Running in development mode - serving from assets directory');
  app.use(express.static(path.join(__dirname, 'assets')));
  
  // Serve files from src directory for entry screen
  app.use('/src', express.static(path.join(__dirname, 'src')));
}

// Leaderboard API endpoint for future use
app.get('/api/leaderboard', (req, res) => {
  // This is just the API endpoint - the actual Firebase data will be fetched client-side
  // We might expand this later to do server-side processing if needed
  res.json({
    success: true,
    message: 'Use client-side Firebase to fetch leaderboard data'
  });
});

// NFT minting endpoint
app.post('/api/mint-nft', async (req, res) => {
  try {
    const { walletAddress, collectibleType } = req.body;

    // Validate request
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required'
      });
    }

    if (!collectibleType) {
      return res.status(400).json({
        success: false,
        error: 'collectibleType is required'
      });
    }

    // Check if NFT service is ready
    if (!nftService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'NFT minting service not initialized. Check server logs for setup instructions.'
      });
    }

    // Rate limiting could be added here
    // TODO: Add session verification, cooldowns, etc.

    // Mint the NFT
    const result = await nftService.mintCollectible(walletAddress, collectibleType);

    res.json(result);

  } catch (error) {
    console.error('Error in /api/mint-nft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mint NFT'
    });
  }
});

// NFT service status endpoint
app.get('/api/nft-status', (req, res) => {
  res.json({
    ready: nftService.isReady(),
    network: process.env.SOLANA_NETWORK || 'devnet',
    walletAddress: nftService.getWalletAddress()
  });
});

// ============================================================================
// HELIUS WEBHOOK ENDPOINTS
// ============================================================================

/**
 * Helius Webhook Endpoint
 *
 * This endpoint receives transaction notifications from Helius when:
 * - A user hides treasure in your Solana program
 * - Any transaction matches your webhook configuration
 *
 * Configuration Steps:
 * 1. Create a Helius account: https://www.helius.dev/
 * 2. Set up a webhook pointing to: https://your-domain.com/api/webhooks/helius
 * 3. Configure the webhook with:
 *    - Account addresses: Your Solana program ID
 *    - Transaction types: Any (or specific instruction types)
 *    - Auth header: Set HELIUS_WEBHOOK_AUTH_HEADER env var
 */
app.post('/api/webhooks/helius',
  verifyHeliusAuth(process.env.HELIUS_WEBHOOK_AUTH_HEADER),
  handleHeliusWebhook
);

// Webhook health check endpoint
app.get('/api/webhooks/helius/health', webhookHealthCheck);

// ============================================================================
// SEARCH WEBHOOK ENDPOINTS
// ============================================================================

/**
 * Search Webhook Endpoint
 *
 * This endpoint receives search transaction notifications from the local
 * transaction monitor (Helius simulator) when:
 * - A user searches for treasure at specific coordinates
 *
 * For local development only - simulates Helius webhook behavior
 */
app.post('/api/webhooks/search',
  verifyHeliusAuth(process.env.HELIUS_WEBHOOK_AUTH_HEADER),
  handleSearchWebhook
);

// Search webhook health check endpoint
app.get('/api/webhooks/search/health', searchWebhookHealthCheck);

// ============================================================================
// TREASURE API ENDPOINTS
// ============================================================================

// Get active hidden treasures
app.get('/api/treasures', async (req, res) => {
  try {
    const { limit, tokenType, status } = req.query;

    if (!treasureService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const treasures = await treasureService.getActiveTreasures({
      limit: limit ? parseInt(limit) : 100,
      tokenType,
      status: status || 'active'
    });

    res.json({
      success: true,
      count: treasures.length,
      treasures
    });

  } catch (error) {
    console.error('Error fetching treasures:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch treasures'
    });
  }
});

// Get treasures by wallet address
app.get('/api/treasures/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit } = req.query;

    if (!treasureService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const treasures = await treasureService.getTreasuresByWallet(address, {
      limit: limit ? parseInt(limit) : 100
    });

    res.json({
      success: true,
      count: treasures.length,
      treasures
    });

  } catch (error) {
    console.error('Error fetching treasures by wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch treasures'
    });
  }
});

// Get specific treasure by transaction signature
app.get('/api/treasures/:signature', async (req, res) => {
  try {
    const { signature } = req.params;

    if (!treasureService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const treasure = await treasureService.getHiddenTreasure(signature);

    if (!treasure) {
      return res.status(404).json({
        success: false,
        error: 'Treasure not found'
      });
    }

    res.json({
      success: true,
      treasure
    });

  } catch (error) {
    console.error('Error fetching treasure:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch treasure'
    });
  }
});

// Update treasure status (claim, expire, etc.)
app.patch('/api/treasures/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    const { status, claimedBy } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    if (!['active', 'claimed', 'expired'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, claimed, or expired'
      });
    }

    if (!treasureService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const result = await treasureService.updateTreasureStatus(signature, status, {
      claimedBy
    });

    res.json(result);

  } catch (error) {
    console.error('Error updating treasure:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update treasure'
    });
  }
});

// ============================================================================
// SEARCH API ENDPOINTS
// ============================================================================

// Get map searches
app.get('/api/searches', async (req, res) => {
  try {
    const { limit, walletAddress, found } = req.query;

    if (!searchService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const searches = await searchService.getSearches({
      limit: limit ? parseInt(limit) : 100,
      walletAddress,
      found: found !== undefined ? found === 'true' : undefined
    });

    res.json({
      success: true,
      count: searches.length,
      searches
    });

  } catch (error) {
    console.error('Error fetching searches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch searches'
    });
  }
});

// Get searches by wallet address
app.get('/api/searches/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit } = req.query;

    if (!searchService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const searches = await searchService.getSearchesByWallet(address, {
      limit: limit ? parseInt(limit) : 100
    });

    res.json({
      success: true,
      count: searches.length,
      searches
    });

  } catch (error) {
    console.error('Error fetching searches by wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch searches'
    });
  }
});

// Get searches at specific coordinates
app.get('/api/searches/coordinates/:x/:y', async (req, res) => {
  try {
    const { x, y } = req.params;
    const { limit } = req.query;

    if (!searchService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const searches = await searchService.getSearchesAtCoordinates(
      parseInt(x),
      parseInt(y),
      limit ? parseInt(limit) : 100
    );

    res.json({
      success: true,
      count: searches.length,
      searches
    });

  } catch (error) {
    console.error('Error fetching searches at coordinates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch searches'
    });
  }
});

// Get specific search by transaction signature
app.get('/api/searches/:signature', async (req, res) => {
  try {
    const { signature } = req.params;

    if (!searchService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const search = await searchService.getSearch(signature);

    if (!search) {
      return res.status(404).json({
        success: false,
        error: 'Search not found'
      });
    }

    res.json({
      success: true,
      search
    });

  } catch (error) {
    console.error('Error fetching search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch search'
    });
  }
});

// Update search result (mark as found)
app.patch('/api/searches/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    const { found, treasureId } = req.body;

    if (found === undefined) {
      return res.status(400).json({
        success: false,
        error: 'found field is required'
      });
    }

    if (!searchService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Database not ready'
      });
    }

    const result = await searchService.updateSearchResult(signature, found, treasureId);

    res.json(result);

  } catch (error) {
    console.error('Error updating search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update search'
    });
  }
});

// ============================================================================
// PAGE ROUTES
// ============================================================================

// Simplified leaderboard URL route
app.get('/leaderboard', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'dist/leaderboard.html'));
  } else {
    res.sendFile(path.join(__dirname, 'leaderboard.html'));
  }
});

// Treasure gallery route
app.get('/treasure', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'dist/treasure.html'));
  } else {
    res.sendFile(path.join(__dirname, 'treasure.html'));
  }
});

// Entry screen route
app.get('/entry-screen', (req, res, next) => {
  if (isDev) {
    // Development - handled by LiveReload middleware
    next();
  } else {
    // Production
    res.sendFile(path.join(__dirname, 'src/entry-screen/entry-screen.html'));
  }
});

// Handle game sharing URLs - serve the main game page for any /games/{id} path
app.get('/games/:gameId', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  } else {
    // In development, redirect to Vite dev server
    res.redirect(`http://localhost:3000?gameId=${req.params.gameId}`);
  }
});

// Override index.html in development to inject LiveReload
if (isDev) {
  const injectLiveReload = (req, res, next, filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if LiveReload script is already in the file
    if (!content.includes('livereload.js')) {
      // Find the closing </body> tag and insert LiveReload script before it
      content = content.replace(
        '</body>',
        '  <script src="http://localhost:35729/livereload.js"></script>\n</body>'
      );
      
      // Send the modified content
      res.send(content);
    } else {
      // Let Express handle it as a static file
      next();
    }
  };

  // Inject LiveReload into index.html
  app.get('/index.html', (req, res, next) => {
    const indexPath = path.join(__dirname, 'index.html');
    injectLiveReload(req, res, next, indexPath);
  });
  
  // Inject LiveReload into leaderboard.html (both paths)
  app.get('/leaderboard.html', (req, res, next) => {
    const leaderboardPath = path.join(__dirname, 'leaderboard.html');
    injectLiveReload(req, res, next, leaderboardPath);
  });
  
  // Also inject LiveReload for the clean /leaderboard URL
  app.get('/leaderboard', (req, res, next) => {
    const leaderboardPath = path.join(__dirname, 'leaderboard.html');
    injectLiveReload(req, res, next, leaderboardPath);
  });

  // Inject LiveReload for the clean /treasure URL
  app.get('/treasure', (req, res, next) => {
    const treasurePath = path.join(__dirname, 'treasure.html');
    injectLiveReload(req, res, next, treasurePath);
  });

  // Inject LiveReload for entry screen
  app.get('/entry-screen', (req, res, next) => {
    const entryScreenPath = path.join(__dirname, 'src/entry-screen/entry-screen.html');
    injectLiveReload(req, res, next, entryScreenPath);
  });
  
  // Inject LiveReload for shared game URLs
  app.get('/games/:gameId', (req, res, next) => {
    const indexPath = path.join(__dirname, 'index.html');
    injectLiveReload(req, res, next, indexPath);
  });
}

// Log the environment before server starts
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`isDev: ${isDev}`);

// Initialize Firebase Admin
const firebaseInitialized = firebaseAdmin.initialize();
if (firebaseInitialized) {
  console.log(`✅ Firebase Admin initialized (Project: ${firebaseAdmin.getProjectId()})`);
} else {
  console.log('⚠️  Firebase Admin not configured - treasure tracking disabled');
}

// Initialize NFT service
nftService.initialize().then(initialized => {
  if (initialized) {
    console.log('✅ NFT minting is ready');
  } else {
    console.log('❌ NFT minting is disabled (wallet not configured)');
  }
});

// Start the server using the HTTP server, not Express app
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);

  if (isDev) {
    console.log(`DEVELOPMENT MODE: LiveReload is active - game will refresh when files change`);
    console.log(`Open your browser to http://localhost:${PORT}/index.html to play the game`);
  } else {
    console.log(`PRODUCTION MODE: LiveReload is disabled`);
  }

  console.log(`Press Ctrl+C to stop the server`);
});