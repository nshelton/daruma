import React from 'react'
import TimelinePanel from './TimelinePanel'
import { TimelineData } from './TimelinePanel'

const generateSampleData = (): TimelineData[] => {
  const data: TimelineData[] = []
  // Generate sample data points from 1991 to 2050
  const startYear = 1991
  const endYear = 2050

  const eventTypes = ['meeting', 'call', 'email', 'task']
  const locations = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin']
  const priorities = ['high', 'medium', 'low']

  // Generate more dense data for 2020-2025
  for (let year = startYear; year <= endYear; year++) {
    const isHighDensity = year >= 2020 && year <= 2025
    const pointsPerYear = isHighDensity ? 1000 : 10 // 1000 points per year in high density period

    for (let i = 0; i < pointsPerYear; i++) {
      const timestamp =
        new Date(year, 0, 1).getTime() +
        Math.random() * 365 * 24 * 60 * 60 * 1000 // Random time within the year

      // Generate sample metadata
      const metadata = {
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        duration: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
        participants: Math.floor(Math.random() * 5) + 1, // 1-5 participants
        description: `Sample event in ${year}`,
      }

      data.push({
        timestamp,
        value: Math.random() * 100, // Random value between 0 and 100
        metadata,
      })
    }
  }

  return data.sort((a, b) => a.timestamp - b.timestamp)
}

const TimelinePanelDemo: React.FC = () => {
  const data = generateSampleData()
  return <TimelinePanel data={data} />
}

export default TimelinePanelDemo
