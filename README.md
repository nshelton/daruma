# daruma

Visualize timeseries data, location history, events



TODOS:
[] implement server or local db with standardized event schema

[] wifi event doesn't work well

[] Granular location logging using OneTracks or Arc App
  - convertor sceipts to put into standard schema


[] Week layout, month layout, day layout
  - view settings menu
  - layer visibility toggle

[] serialized settings struct

[] info panel
  - clickable events

[] more granular time info when zoom in
  - remove objects from scene when zoom in (for perf ?)
  - can likely handle a lot, but just put an upper bound on it

[] google photos API

[] time series renderer
  - automatic simplification based on zoom level
  - temperature / humidity?
  - moon phase, sun altitude
  - create scripts on server that insert data into db

## Project

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
