class EventParser {
  // constructor() {}

  parseEvents(raw_logs: string[][]): Event[] {
    console.log(raw_logs)
    console.log(`Parsing ${raw_logs.length} raw events`)
    const events: Event[] = []

    for (let i = 0; i < raw_logs.length; i++) {
      const line = raw_logs[i]
      if (line.length < 3) continue
      if (line[2].includes('Charging')) {
        //try to find the next discharging event
        for (let j = i + 1; j < raw_logs.length; j++) {
          const nextLine = raw_logs[j]
          if (nextLine.length < 3) continue
          if (nextLine[2].includes('discharging')) {
            //found a charging event
            const start = new Date(line[0] + ' ' + line[1])
            const end = new Date(nextLine[0] + ' ' + nextLine[1])

            events.push({
              name: 'Charging',
              start: start,
              end: end,
              eventType: 'charging'
            })
            break
          }
          if (nextLine[2] === 'Charging phone') {
            break
          }
        }
      }

      if (line[2].includes('Arrive at Home')) {
        //try to find the next discharging event
        for (let j = i + 1; j < raw_logs.length; j++) {
          const nextLine = raw_logs[j]
          if (nextLine.length < 3) continue
          if (nextLine[2].includes('leave Home')) {
            //found a charging event
            const start = new Date(line[0] + ' ' + line[1])
            const end = new Date(nextLine[0] + ' ' + nextLine[1])

            events.push({
              name: 'home',
              start: start,
              end: end,
              eventType: 'home'
            })
            break
          }
          if (nextLine[2] === 'Arrive at Home') {
            break
          }
        }
      }

      if (line[2].includes('Arrived at Heidi')) {
        //try to find the next discharging event
        for (let j = i + 1; j < raw_logs.length; j++) {
          const nextLine = raw_logs[j]
          if (nextLine.length < 3) continue
          if (nextLine[2].includes("Left Heidi's")) {
            //found a charging event
            const start = new Date(line[0] + ' ' + line[1])
            const end = new Date(nextLine[0] + ' ' + nextLine[1])

            events.push({
              name: 'heidi',
              start: start,
              end: end,
              eventType: 'heidi'
            })
            break
          }
          if (nextLine[2] === 'Arrive at Heidi') {
            break
          }
        }
      }
      if (line[2].includes('connect')) {
        //try to find the next discharging event
        for (let j = i + 1; j < raw_logs.length; j++) {
          const nextLine = raw_logs[j]
          if (nextLine.length < 3) continue
          if (nextLine[2].includes('disconnect')) {
            //found a charging event
            const start = new Date(line[0] + ' ' + line[1])
            const end = new Date(nextLine[0] + ' ' + nextLine[1])

            events.push({
              name: 'wifi',
              start: start,
              end: end,
              eventType: 'wifi'
            })
            break
          }
          if (nextLine[2] === 'connect') {
            break
          }
        }
      }
    }

    return events
  }
}

interface Event {
  name: string
  start: Date
  end: Date
  eventType: string
}

export { EventParser }
export type { Event }
