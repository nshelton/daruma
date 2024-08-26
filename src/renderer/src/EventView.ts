// Day.ts
import * as THREE from 'three'
import { msToWorldPosition } from './dateUtils'
import Event from '../../main/EventParser.ts'

export class EventView {
  object: THREE.Object3D
  start: Date
  end: Date
  height: number
  type: string
  // width = msToWorldPosition(600000000) // 1 minute wide

  private getColorForEvent(type: string): number {
    console.log(type)
    switch (type) {
      case 'charging':
        return 0x00ff00
      case 'heidi':
        return 0xff00ff
      case 'home':
        return 0x0000ff
      case 'wifi':
        return 0x00ffff
      default:
        return 0x333333
    }
  }

  private getYPosForEvent(type: string): number {
    console.log(type)
    switch (type) {
      case 'charging':
        return 0.001
      case 'heidi':
        return 0.0025
      case 'home':
        return 0.0015
      case 'wifi':
        return 0.002
      default:
        return 0
    }
  }

  private makePlane(startPos: Date, endPos: Date, height: number): THREE.Mesh {
    const start = msToWorldPosition(startPos.getTime())
    const end = msToWorldPosition(endPos.getTime())

    const w = end - start
    const geometry = new THREE.PlaneGeometry(w * 0.99, height)

    const plane_mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: this.getColorForEvent(this.type)
      })
    )
    plane_mesh.position.x = (start + end) / 2
    plane_mesh.position.y = this.getYPosForEvent(this.type)
    plane_mesh.position.z = 0.5

    return plane_mesh
  }

  constructor(event: Event) {
    this.object = new THREE.Object3D()
    this.start = event.start
    this.end = event.end
    this.type = event.eventType
    this.height = 0.0005
    const box = this.makePlane(this.start, this.end, this.height)
    this.object.add(box)
  }
}

export default EventView
