import sqlite3 from 'sqlite3'

// Open the database connection
const db = new sqlite3.Database('parser/events.db')

// Define a function to retrieve all events from the database
function getAllEvents(callback: (err: Error | null, events: Event[]) => void): void {
  // Define the SQL query
  const query = 'SELECT * FROM events'

  // Execute the query
  db.all<Event>(query, (err, rows) => {
    if (err) {
      callback(err, [])
      return
    }

    // Process the rows
    const events: Event[] = rows.map(row => ({
      name: row.name,
      start: new Date(row.start),
      end: new Date(row.end),
      eventType: row.eventType
    }));

    callback(null, events)
  });
}

// Export the function
export { getAllEvents }
