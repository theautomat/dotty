import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { getPlotMetadata, type PlotMetadata } from '@/data/mockPlotData';
import { useGameStore } from '@/store/gameStore';

interface MetadataPanelProps {
  plotNumber?: number;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ plotNumber = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to grid position and panel state setter from Zustand store
  const gridPosition = useGameStore((state) => state.gridPosition);
  const setRightPanelOpen = useGameStore((state) => state.setRightPanelOpen);
  const { x, y } = gridPosition;

  // Sync panel state with store and trigger canvas resize
  useEffect(() => {
    setRightPanelOpen(isOpen);
    // Trigger resize event so Game.ts onWindowResize() recalculates canvas dimensions
    window.dispatchEvent(new Event('resize'));
  }, [isOpen, setRightPanelOpen]);

  const plotData: PlotMetadata | null = getPlotMetadata(plotNumber);

  return (
    <>
      {/* Toggle Button */}
      <div
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300",
          isOpen ? "right-80" : "right-0"
        )}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-l-md rounded-r-none h-16 w-8 bg-white hover:bg-gray-50 text-gray-700 border border-r-0"
          aria-label={isOpen ? "Close panel" : "Open panel"}
        >
          <div className="flex flex-col items-center">
            <svg
              className={cn(
                "w-4 h-4 transition-transform duration-300",
                isOpen ? "rotate-0" : "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <svg
              className={cn(
                "w-4 h-4 -mt-2 transition-transform duration-300",
                isOpen ? "rotate-0" : "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Button>
      </div>

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-white border-l shadow-lg transform transition-transform duration-300 z-40 overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 border-b pb-2 text-gray-900">
            Plot Metadata
          </h2>

          {plotData ? (
            <div className="space-y-6">
              {/* Coordinates - Always shown from store */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Coordinates
                </h3>
                <p className="text-xl font-bold text-gray-900">
                  ({x}, {y})
                </p>
              </div>

              {/* Plot Number */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Plot Number
                </h3>
                <p className="text-xl font-bold text-gray-900">
                  #{plotData.plotNumber}
                </p>
              </div>

              {/* Owner */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Owner
                </h3>
                <p className="text-gray-900">{plotData.owner}</p>
              </div>

              {/* Discovered Date */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Discovered
                </h3>
                <p className="text-gray-900">{plotData.discoveredDate}</p>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Resources
                </h3>
                <div className="flex flex-wrap gap-2">
                  {plotData.resources.map((resource, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm border"
                    >
                      {resource}
                    </span>
                  ))}
                </div>
              </div>

              {/* History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  History
                </h3>
                <div className="space-y-3">
                  {plotData.history.map((entry, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-gray-300 pl-4 pb-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600">
                          {entry.timestamp}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-700 border">
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{entry.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-600 text-center py-8">
              No data available for this plot
            </div>
          )}
        </div>
      </div>
    </>
  );
};
