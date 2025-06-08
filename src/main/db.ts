import sqlite3 from 'sqlite3'
import { Event, ArcPoint } from '../types'

// Open the database connection
const db_events = new sqlite3.Database('parser/events.db')
const db_locations = new sqlite3.Database('parser/locations.db')

// Cache for location data
let allLocationsMasterCache: ArcPoint[] | null = null
let dailyChunksCache: Map<string, ArcPoint[]> | null = null
const MAX_POINTS_TO_RENDER = 1000

export function initializeAllLocationsCache(
  callback?: (err: Error | null, count?: number) => void,
): void {
  console.log('[Cache] Initializing all locations cache...')
  const dbQueryTimer = `initializeAllLocationsCache_DBQuery`
  console.time(dbQueryTimer)

  db_locations.all<ArcPoint>(
    'SELECT * FROM locations ORDER BY time ASC',
    (err, rows) => {
      console.timeEnd(dbQueryTimer)
      if (err) {
        console.error('[Cache] Failed to load all locations from DB:', err)
        allLocationsMasterCache = null
        dailyChunksCache = null
        if (callback) callback(err)
        return
      }

      const processingTimer = `initializeAllLocationsCache_Processing`
      console.time(processingTimer)
      allLocationsMasterCache = rows.map((row) => ({
        lat: row.lat,
        lng: row.lng,
        time: new Date(row.time), // Ensure time is a Date object
      }))

      dailyChunksCache = new Map<string, ArcPoint[]>()
      for (const loc of allLocationsMasterCache) {
        const dayKey = loc.time.toISOString().split('T')[0] // YYYY-MM-DD
        if (!dailyChunksCache.has(dayKey)) {
          dailyChunksCache.set(dayKey, [])
        }
        dailyChunksCache.get(dayKey)!.push(loc)
      }
      console.timeEnd(processingTimer)
      const count = allLocationsMasterCache.length
      console.log(
        `[Cache] Successfully cached ${count} locations into ${dailyChunksCache.size} daily chunks.`,
      )
      if (callback) callback(null, count)
    },
  )
}

// Define a function to retrieve all events from the database
export function getAllEvents(
  callback: (err: Error | null, events: Event[]) => void,
): void {
  const timerLabel = `getAllEvents_db_call`
  console.time(timerLabel)
  const query = 'SELECT * FROM events'
  db_events.all<Event>(query, (err, rows) => {
    console.timeEnd(timerLabel)
    if (err) {
      callback(err, [])
      return
    }
    const processingLabel = `getAllEvents_processing`
    console.time(processingLabel)
    const events: Event[] = rows.map((row) => ({
      name: row.name,
      start: new Date(row.start),
      end: new Date(row.end),
      eventType: row.eventType,
    }))
    console.timeEnd(processingLabel)
    callback(null, events)
  })
}

// Old function, can be removed or kept if needed for other purposes
// export function getAllLocations(
//   callback: (err: Error | null, locations: ArcPoint[]) => void,
// ): void {
//   // Define the SQL query with a limit of 1000 rows
//   const query = 'SELECT * FROM locations LIMIT 1000'
//   ...
// }

export function getAllLocationsInRange(
  startTime: number, // Expecting Unix timestamp (milliseconds)
  endTime: number, // Expecting Unix timestamp (milliseconds)
  callback: (err: Error | null, locations: ArcPoint[]) => void,
): void {
  const operationOverallTimerLabel = `getAllLocationsInRange_Overall`
  console.time(operationOverallTimerLabel)

  if (!dailyChunksCache || !allLocationsMasterCache) {
    const cacheError = new Error(
      '[Cache] Location cache not initialized. Call initializeAllLocationsCache on startup.',
    )
    console.error(cacheError.message)
    console.timeEnd(operationOverallTimerLabel)
    // Fallback to direct query (slow, but keeps functionality if cache fails/not ready)
    // This part is the original direct DB query logic, kept as a fallback.
    // Consider removing if strict cache dependency is okay.
    console.warn(
      '[Cache] Falling back to direct DB query for getAllLocationsInRange.',
    )
    const fallbackDbCallTimerLabel = `getAllLocationsInRange_DBQuery_Fallback`
    console.time(fallbackDbCallTimerLabel)
    const startTimeISO = new Date(startTime).toISOString()
    const endTimeISO = new Date(endTime).toISOString()
    const query = `SELECT * FROM locations WHERE time >= ? AND time <= ? ORDER BY time ASC`
    db_locations.all<ArcPoint>(
      query,
      [startTimeISO, endTimeISO],
      (err, rows) => {
        console.timeEnd(fallbackDbCallTimerLabel)
        if (err) {
          console.timeEnd(operationOverallTimerLabel)
          callback(err, [])
          return
        }
        const fallbackJsProcessingTimerLabel = `getAllLocationsInRange_JSProcessing_Fallback`
        console.time(fallbackJsProcessingTimerLabel)
        let processedFallback: ArcPoint[] = rows.map((row) => ({
          lat: row.lat,
          lng: row.lng,
          time: new Date(row.time),
        }))
        if (processedFallback.length > MAX_POINTS_TO_RENDER) {
          const subsampled: ArcPoint[] = []
          const step = Math.max(
            1,
            Math.floor(processedFallback.length / MAX_POINTS_TO_RENDER),
          )
          for (let i = 0; i < processedFallback.length; i += step) {
            subsampled.push(processedFallback[i])
          }
          processedFallback = subsampled
        }
        console.timeEnd(fallbackJsProcessingTimerLabel)
        console.timeEnd(operationOverallTimerLabel)
        callback(null, processedFallback)
      },
    )
    return // End execution after dispatching fallback
  }

  const jsProcessingTimerLabel = `getAllLocationsInRange_JSProcessing_FromCache`
  console.time(jsProcessingTimerLabel)

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const potentialLocations: ArcPoint[] = []

  const currentDate = new Date(startDate)
  currentDate.setUTCHours(0, 0, 0, 0) // Start of the day in UTC for key matching

  while (currentDate <= endDate) {
    const dayKey = currentDate.toISOString().split('T')[0] // YYYY-MM-DD
    if (dailyChunksCache.has(dayKey)) {
      const dayPoints = dailyChunksCache.get(dayKey)!
      for (const point of dayPoints) {
        const pointTime = point.time.getTime()
        if (pointTime >= startTime && pointTime <= endTime) {
          potentialLocations.push(point)
        }
      }
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1) // Move to next day in UTC
  }

  // The points are already ordered by time due to initial sort and sequential daily processing.
  // If a more robust sort is needed here, it can be added:
  // potentialLocations.sort((a, b) => a.time.getTime() - b.time.getTime());

  let processedLocations = potentialLocations

  if (processedLocations.length > MAX_POINTS_TO_RENDER) {
    console.log(
      `[Cache] Subsampling from ${processedLocations.length} to ${MAX_POINTS_TO_RENDER} points for range.`,
    )
    const subsamplingTimerLabel = `getAllLocationsInRange_Subsampling_FromCache`
    console.time(subsamplingTimerLabel)
    const subsampledLocations: ArcPoint[] = []
    const step = Math.max(
      1,
      Math.floor(processedLocations.length / MAX_POINTS_TO_RENDER),
    )
    for (let i = 0; i < processedLocations.length; i += step) {
      subsampledLocations.push(processedLocations[i])
    }
    processedLocations = subsampledLocations
    console.timeEnd(subsamplingTimerLabel)
  }

  console.timeEnd(jsProcessingTimerLabel)
  console.timeEnd(operationOverallTimerLabel)
  callback(null, processedLocations)
}
