export interface TimelineData {
  timestamp: number
  value: number | string
  metadata?: Record<string, unknown>
  // Potentially add a layerId here if original data points are treated as a layer item
  // layerId?: string;
}
