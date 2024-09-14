export interface ArcPoint {
  lat: number
  lng: number
  time: Date
  // Add other properties as needed
}

export interface Event {
  name: string
  start: Date
  end: Date
  eventType: string
}
