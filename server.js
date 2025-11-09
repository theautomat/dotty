const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
// WebRTC signaling implementation is inline below (removed unused import)
const { nftService } = require('./nft-service');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Middleware to parse JSON bodies
app.use(express.json());

// Create HTTP server (needed for socket.io)
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

// Helius webhook endpoint - receives treasure deposit events from blockchain
app.post('/api/webhooks/helius', (req, res) => {
  console.log('\n🎉 ===== HELIUS WEBHOOK RECEIVED =====');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  console.log('=====================================\n');

  // Acknowledge receipt
  res.status(200).json({
    received: true,
    timestamp: Date.now()
  });
});

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

// Initialize WebRTC signaling on the same server
const ENABLE_MULTIPLAYER = true; // Enabled for multiplayer testing

if (ENABLE_MULTIPLAYER) {
  // Initialize Socket.IO on the same server with debug
  console.log('Creating Socket.IO server with debug enabled');
  const socketIO = require('socket.io');
  
  const io = socketIO(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    // Enable debug for Socket.IO
    debug: true,
    connectTimeout: 30000
  });
  
  console.log('WebRTC Socket.IO server initialized');
  
  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`New WebRTC connection: ${socket.id}`);
    
    // Handle room join
    socket.on('join-room', (data) => {
      const { roomId, requestPrimary } = data;
      console.log(`Socket ${socket.id} joining room ${roomId}, requesting primary: ${requestPrimary}`);
      
      socket.join(roomId);
      
      // For simplicity in testing, always grant primary to first connection in room
      const room = io.sockets.adapter.rooms.get(roomId);
      const isFirstInRoom = room && room.size === 1;
      
      socket.emit('role-assigned', {
        isPrimary: isFirstInRoom ? true : false,
        roomId,
        peers: [...io.sockets.adapter.rooms.get(roomId) || []].filter(id => id !== socket.id)
      });
      
      // If not first in room, notify existing members
      if (!isFirstInRoom) {
        socket.to(roomId).emit('new-peer', {
          peerId: socket.id,
          roomId
        });
      }
    });
    
    // Handle WebRTC signaling
    socket.on('offer', (data) => {
      console.log(`Socket ${socket.id} sending offer to ${data.targetId}`);
      socket.to(data.targetId).emit('offer', {
        offer: data.offer,
        offererId: socket.id
      });
    });
    
    socket.on('answer', (data) => {
      console.log(`Socket ${socket.id} sending answer to ${data.targetId}`);
      socket.to(data.targetId).emit('answer', {
        answer: data.answer,
        answererId: socket.id
      });
    });
    
    socket.on('ice-candidate', (data) => {
      socket.to(data.targetId).emit('ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`WebRTC connection closed: ${socket.id}`);
      // Notify all rooms this socket was in
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('peer-disconnected', {
            peerId: socket.id
          });
        }
      });
    });
  });
  
  console.log('Multiplayer mode enabled');
} else {
  console.log('Multiplayer mode disabled');
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

  if (ENABLE_MULTIPLAYER) {
    console.log(`WebRTC signaling server running (multiplayer enabled)`);
    console.log(`To test multiplayer: open one browser normally, then open another with "?join=true" added to URL`);
  }

  console.log(`Press Ctrl+C to stop the server`);
});