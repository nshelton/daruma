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
  static readonly direction = 'updown'

  static DateToPos(date: Date): THREE.Vector3 {
    const TIME_OFFSET = new Date().getTime()

    if (this.layout === 'horizontal') {
      const ms = date.getTime()
      // get week of year from Date
      const weekOfYear = Math.ceil(
        (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 604800000
      )
      return new THREE.Vector3((ms - TIME_OFFSET) / 1e10, 0, 0)
    } else if (this.layout === 'days-vertical') {
      // get start of day from Date
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const ms = startOfDay.getTime()
      const day_ms = date.getTime() - ms

      return new THREE.Vector3(
        (this.thickness * (ms - TIME_OFFSET)) / this.MS_IN_A_DAY,
        (this.MS_IN_A_DAY - day_ms) / 1e10,
        0
      )
    }
  }

  static CreatePlane(
    start: THREE.Vector3,
    end: THREE.Vector3,
    material: THREE.Material
  ): THREE.Mesh[] {
    const startPos = Layout.DateToPos(start)
    const endPos = Layout.DateToPos(end)
    let w = Math.abs(endPos.x - startPos.x)
    let h = Math.abs(endPos.y - startPos.y)

    //check if ends on the next day and create two boxes
    const dayWraps = endPos.x != startPos.x
    if (dayWraps && this.layout === 'days-vertical') {
      const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59)
      const endMid = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0)

      const box1 = this.CreatePlane(start, startMid, material)
      const box2 = this.CreatePlane(endMid, end, material)
      return [box1[0], box2[0]]
    }

    if (material === undefined) {
      material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.2, 0.0, 0.9),
        transparent: true,
        opacity: 0.5
      })
    }

    if (this.direction === 'updown') {
      w = Layout.thickness
    } else if (this.direction === 'leftright') {
      h = Layout.thickness
    }
    const geometry = new THREE.PlaneGeometry(w * 0.99, h * 0.99)
    const plane_mesh = new THREE.Mesh(geometry, material)

    plane_mesh.position.copy(startPos)
    plane_mesh.position.add(endPos).divideScalar(2)
    return [plane_mesh]
  }
}

export { Layout }
export const LATITUDE = 34.088497900846455
export const LONGITUDE = -118.2879571087556
