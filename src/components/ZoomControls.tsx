import React from 'react';
import { gameStore } from '../store/gameStore';

const ZOOM_LEVELS = 5;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = (ZOOM_MAX - ZOOM_MIN) / (ZOOM_LEVELS - 1);

export const ZoomControls: React.FC = () => {
  const [currentZoom, setCurrentZoom] = React.useState(1.0);

  React.useEffect(() => {
    // Subscribe to zoom changes to update current zoom level
    const unsubscribe = gameStore.subscribe(
      (state) => state.currentZoom,
      (zoom) => {
        if (zoom !== undefined) {
          setCurrentZoom(zoom);
        }
      }
    );

    return unsubscribe;
  }, []);

  const handleZoomIn = () => {
    const newZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX);
    // Set the zoom level directly - Map will apply and clamp it
    gameStore.getState().setCurrentZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN);
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
