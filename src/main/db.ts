// // db.ts
// import sqlite3 from 'sqlite3'
// import { open } from 'sqlite'

// async function initializeDatabase(): Promise<sqlite3.Database> {
//   const db = await open({
//     filename: './database.db',
//     driver: sqlite3.Database
//   })

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS events (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT,
//       start TEXT,
//       end TEXT,
//       eventType TEXT
//     )
//   `)


//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS timeseries (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       time TEXT,
//       value TEXT,
//       name TEXT,
//       seriesType TEXT
//     )
//   `)

//   return db
// }

// export default initializeDatabase
