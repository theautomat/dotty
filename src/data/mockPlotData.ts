export interface PlotHistory {
  timestamp: string;
  action: string;
  details: string;
}

export interface PlotMetadata {
  plotNumber: number;
  owner: string;
  discoveredDate: string;
  resources: string[];
  history: PlotHistory[];
}

// Mock data for plot metadata
export const mockPlotData: Record<number, PlotMetadata> = {
  1: {
    plotNumber: 1,
    owner: "Explorer Alpha",
    discoveredDate: "2025-01-15",
    resources: ["Ore", "Crystal", "Mineral"],
    history: [
      {
        timestamp: "2025-01-15 10:30",
        action: "Discovered",
        details: "Plot first discovered by Explorer Alpha"
      },
      {
        timestamp: "2025-01-16 14:20",
        action: "Mining",
        details: "Extracted 50 units of Ore"
      },
      {
        timestamp: "2025-01-18 09:15",
        action: "Mining",
        details: "Extracted 25 units of Crystal"
      }
    ]
  },
  2: {
    plotNumber: 2,
    owner: "Explorer Beta",
    discoveredDate: "2025-02-01",
    resources: ["Rare Ore", "Energy Crystal"],
    history: [
      {
        timestamp: "2025-02-01 11:00",
        action: "Discovered",
        details: "Plot first discovered by Explorer Beta"
      },
      {
        timestamp: "2025-02-03 16:45",
        action: "Mining",
        details: "Extracted 30 units of Rare Ore"
      }
    ]
  },
  3: {
    plotNumber: 3,
    owner: "Explorer Gamma",
    discoveredDate: "2025-02-10",
    resources: ["Common Ore", "Stone", "Iron"],
    history: [
      {
        timestamp: "2025-02-10 08:30",
        action: "Discovered",
        details: "Plot first discovered by Explorer Gamma"
      },
      {
        timestamp: "2025-02-11 12:00",
        action: "Mining",
        details: "Extracted 100 units of Common Ore"
      },
      {
        timestamp: "2025-02-12 15:30",
        action: "Mining",
        details: "Extracted 75 units of Iron"
      }
    ]
  }
};

// Function to get plot metadata
export const getPlotMetadata = (plotNumber: number): PlotMetadata | null => {
  return mockPlotData[plotNumber] || null;
};
