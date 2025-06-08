export interface ArcPoint {
  lat: number
  lng: number
  time: Date
  value?: any // Added optional value property
  // Add other properties as needed
}

export interface Event {
  name: string
  start: Date
  end: Date
  eventType: string
}
