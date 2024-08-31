// Day.ts
import * as THREE from 'three'
import { Layout } from './dateUtils'
import { Event } from '../../main/EventParser'

export class EventView {
  object: THREE.Object3D
  start: Date
  end: Date
  height: number
  type: string
  // width = Layout.msToWorldPosition(600000000) // 1 minute wide

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
    const start: THREE.Vector3 = Layout.DateToPos(startPos)
    const end: THREE.Vector3 = Layout.DateToPos(endPos)

    const w = end.x - start.x
    const geometry = new THREE.PlaneGeometry(w * 0.99, height)

    const plane_mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: this.getColorForEvent(this.type)
      })
    )
    plane_mesh.position.copy(start)
    plane_mesh.position.add(end).divideScalar(2)
    plane_mesh.position.y += this.getYPosForEvent(this.type)
    plane_mesh.position.z = 0.5
    console.log(plane_mesh.position)
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
