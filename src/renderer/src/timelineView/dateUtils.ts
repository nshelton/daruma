// dateUtils.ts
import * as THREE from 'three'

class Layout {
  static readonly DAY_HEIGHT = 0.001
  static readonly HOUR_TICK_WIDTH = 0.000005

  static readonly MS_IN_A_DAY = 86400000
  static readonly dayWidth = this.MS_IN_A_DAY / 1e10
  static readonly thickness = 0.003

  // static readonly layout = "horizontal"
  static readonly layout = 'days-vertical'

  static DateToPos(date: Date): THREE.Vector3 {
    const TIME_OFFSET = new Date().getTime()

    if (this.layout == 'horizontal') {
      const ms = date.getTime()
      // get week of year from Date
      const weekOfYear = Math.ceil(
        (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 604800000
      )
      return new THREE.Vector3((ms - TIME_OFFSET) / 1e10, 0, 0)
    } else if (this.layout == 'days-vertical') {
      // get start of day from Date
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const ms = startOfDay.getTime()
      const day_ms = date.getTime() - ms

      return new THREE.Vector3(
        (this.thickness * (ms - TIME_OFFSET)) / this.MS_IN_A_DAY,
        day_ms / 1e10,
        0
      )
    }
  }
}

export { Layout }
export const LATITUDE = 34.088497900846455
export const LONGITUDE = -118.2879571087556
