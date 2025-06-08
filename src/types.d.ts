export interface ArcPoint {
  lat: number
  lng: number
  time: Date
  value?: unknown // Added optional value property
  // Add other properties as needed
}

export interface Event {
  name: string
  start: Date
  end: Date
  eventType: string
}

export interface CustomEvent {
  id: number
  title: string
  color: string
  startTime: number
  endTime: number
  y?: number
}
