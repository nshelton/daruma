// dateUtils.ts
import * as THREE from 'three'


class Layout {
  static readonly DAY_HEIGHT = 0.001
  static readonly HOUR_TICK_WIDTH = 0.000005

  static readonly MS_IN_A_DAY = 86400000

  static DateToPos(date: Date): THREE.Vector3 {
    const ms = date.getTime()
    return new THREE.Vector3((ms - 1724554994000) / 1e10, 0, 0)
  }

  static dayWidth = this.MS_IN_A_DAY / 1e10
  static readonly dayHeight = 0.001

}

export { Layout }
export const LATITUDE = 34.088497900846455
export const LONGITUDE = -118.2879571087556
