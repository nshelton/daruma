// dateUtils.ts
import * as THREE from 'three'

class Layout {
  static readonly DAY_HEIGHT = 0.001
  static readonly HOUR_TICK_WIDTH = 0.000005

  static readonly MS_IN_A_DAY = 86400000
  static readonly dayWidth = this.MS_IN_A_DAY / 1e10
  static readonly dayHeight = 0.001

  static readonly layout = "linear"


  static DateToPos(date: Date): THREE.Vector3 {
    const TIME_OFFSET = new Date().getTime()

    if (this.layout == 'linear') {
      const ms = date.getTime()
      // get week of year from Date
      const weekOfYear = Math.ceil(
        (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 604800000
      )
      return new THREE.Vector3((ms - TIME_OFFSET) / 1e10, 0, 0)


    } else if (this.layout == "week") {
      const ms = date.getTime()
      const dayofweek = date.getDay()
      // get week of year from Date
      const ms_in_week = 604800000
      const beginning_of_week_ms = ms - (dayofweek * 86400000)

      const weekOfYear = Math.ceil(
        (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 604800000
      )
      console.log(date, weekOfYear)

      return new THREE.Vector3(ms_from_week, weekOfYear, 0)
    }
  }
};

export { Layout }
export const LATITUDE = 34.088497900846455
export const LONGITUDE = -118.2879571087556
