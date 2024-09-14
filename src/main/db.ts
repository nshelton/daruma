import sqlite3 from 'sqlite3'
import { Event, ArcPoint } from '../types'

// Open the database connection
const db_events = new sqlite3.Database('parser/events.db')
const db_locations = new sqlite3.Database('parser/locations.db')

// Define a function to retrieve all events from the database
export function getAllEvents(callback: (err: Error | null, events: Event[]) => void): void {
  // Define the SQL query
  const query = 'SELECT * FROM events'

  // Execute the query
  db_events.all<Event>(query, (err, rows) => {
    if (err) {
      callback(err, [])
      return
    }

    // Process the rows
    const events: Event[] = rows.map((row) => ({
      name: row.name,
      start: new Date(row.start),
      end: new Date(row.end),
      eventType: row.eventType
    }))

    callback(null, events)
  })
}

export function getAllLocations(
  callback: (err: Error | null, locations: ArcPoint[]) => void
): void {
  // Define the SQL query
  const query = 'SELECT * FROM locations'

  // Execute the query
  db_locations.all<ArcPoint>(query, (err, rows) => {
    if (err) {
      callback(err, [])
      return
    }

    // Process the rows
    const locations: ArcPoint[] = rows.map((row) => ({
      lat: row.lat,
      lng: row.lng,
      time: new Date(row.time)
    }))

    callback(null, locations)
  })
}
