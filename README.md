# Dotty

A top-down exploration game where you play as Dotty, a little alien character exploring an alien landscape to discover hidden treasures and digital assets.

## Game Concept

- **Character**: Dotty, a circular character viewed from a top-down perspective
- **Movement**: WASD keys control movement through a 2D world
- **Camera**: Frustrum view from above with adjustable zoom levels (min/max constraints)
- **Treasures**: Hidden items that reveal themselves when Dotty gets close enough
- **Interaction**: Run into treasures to trigger mining/collection dialogs
- **Digital Assets**: Treasures represent crypto tokens, NFTs, or other digital assets
- **Wallet Integration**: Planned integration with Phantom Wallet (https://phantom.com/)
- **Backend**: Firebase for user data and inventory storage

## Current Status

This project is in early development. The current focus is on building the core mechanics:
- Top-down character movement with WASD controls
- Camera system with zoom functionality
- Treasure discovery and proximity detection system

Future features include:
- Wallet integration with Phantom
- NFT/crypto asset collection
- Firebase user authentication and data storage
- Alien landscape graphics

## Setup and Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/dotty.git
cd dotty
```

2. Install dependencies:

```bash
npm install
# or with yarn
yarn
```

### Running the Game

For development with Hot Module Replacement (HMR):

```bash
npm run vite
```

This launches Vite's dev server with instant hot reloading:
- Changes appear immediately in the browser without manual refresh
- Fast HMR updates as you edit files
- Access the game at [http://localhost:5173](http://localhost:5173)

For production build and serve:

```bash
npm run dev
```

This builds the project and serves it in production mode at [http://localhost:3000](http://localhost:3000).

To deploy to production:

```bash
npm run build
npm start
```

## Game Controls

- **W**: Move up
- **A**: Move left
- **S**: Move down
- **D**: Move right
- **Mouse Scroll**: Zoom in/out (within min/max limits)
- **E/Space**: Interact with treasures (planned)

## Deployment to Heroku

```bash
# Login to Heroku CLI
heroku login

# Create a new Heroku app
heroku create your-app-name

# Push to Heroku
git push heroku main

# Open the deployed app
heroku open
```

## Technology

- Three.js for rendering
- Firebase for user identification and data storage
- Express.js for serving the application
- Phantom Wallet integration (planned)

## License

MIT
