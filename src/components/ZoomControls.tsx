import React from 'react';
import { gameStore } from '../store/gameStore';

const ZOOM_LEVELS = 5;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = (ZOOM_MAX - ZOOM_MIN) / (ZOOM_LEVELS - 1);

export const ZoomControls: React.FC = () => {
  // In React components, use the hook directly instead of subscribe
  const currentZoom = gameStore((state) => state.currentZoom);

  React.useEffect(() => {
    console.log('ZoomControls: Current zoom from hook:', currentZoom);
  }, [currentZoom]);

  const handleZoomIn = () => {
    console.log('Zoom In button clicked - Current zoom:', currentZoom);
    const newZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX);
    console.log('Setting new zoom to:', newZoom);
    // Set the zoom level directly - Map will apply and clamp it
    gameStore.getState().setCurrentZoom(newZoom);
    console.log('Store currentZoom after set:', gameStore.getState().currentZoom);
  };

  const handleZoomOut = () => {
    console.log('Zoom Out button clicked - Current zoom:', currentZoom);
    const newZoom = Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN);
    console.log('Setting new zoom to:', newZoom);
    // Set the zoom level directly - Map will apply and clamp it
    gameStore.getState().setCurrentZoom(newZoom);
  };

  const canZoomIn = currentZoom < ZOOM_MAX;
  const canZoomOut = currentZoom > ZOOM_MIN;

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-10">
      <button
        className="w-10 h-10 bg-white hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed border border-gray-300 rounded-md shadow-lg flex items-center justify-center text-2xl font-bold text-gray-700 disabled:text-gray-400 transition-colors"
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        className="w-10 h-10 bg-white hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed border border-gray-300 rounded-md shadow-lg flex items-center justify-center text-2xl font-bold text-gray-700 disabled:text-gray-400 transition-colors"
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
};
