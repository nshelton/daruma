export interface TimeRange {
  start: number
  end: number
}

export interface LayerItem {
  id: string | number
  timestamp?: number // For point-in-time items
  startTime?: number // For duration-based items
  endTime?: number // For duration-based items
  metadata?: Record<string, unknown>
  layerId: string // To identify which layer this item belongs to
  // Layer-specific properties can be added by extending this interface
  [key: string]: unknown
}

export interface SelectedItem extends LayerItem {
  // Might include coordinates of click or other interaction-specific details if needed
}

export interface Layer<T extends LayerItem = LayerItem> {
  id: string
  name: string
  isVisible: boolean
  zIndex?: number // For controlling draw order if necessary

  // Method to draw the layer on the canvas
  draw: (
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
  ) => void

  // Method to find the closest item to a click/mouse position
  // Returns the item if found, null otherwise.
  // Optional for layers that are not interactive (e.g., background sunlight).
  findClosestItem?: (
    canvasX: number,
    canvasY: number,
    timeRange: TimeRange,
    timestampToX: (timestamp: number) => number,
    canvasHeight: number, // Full height of the canvas
    canvasWidth: number, // Full width of the canvas
    xToTimestamp?: (x: number) => number, // Optional inverted function
  ) => T | null

  // Optional: If a layer needs to react to hover events for tooltips, etc.
  // findHoveredItem?: (
  //   canvasX: number,
  //   canvasY: number,
  //   timeRange: TimeRange,
  //   timestampToX: (timestamp: number) => number
  // ) => T | null;

  // Optional: Cleanup resources if any
  destroy?: () => void
}
