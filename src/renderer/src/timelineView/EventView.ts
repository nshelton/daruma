// Day.ts
import * as THREE from 'three'
import { Layout } from './dateUtils'
import { Event } from '../../types/Event.ts'

export class EventView {
  object: THREE.Object3D
  start: Date
  end: Date
  height: number
  type: string
  selected : boolean = false
  hovered : boolean = false

  // TODO make the colors like this
  // color: number[] = [0.5, 0.5, 0.5]
  // selected_color: number[] = [0.5, 0.5, 0.5]
  // hilight_color: number[] = [0.5, 0.5, 0.5]

  select(): void {
    this.selected = true
    this.object.children[0].material.color.setHex(0xffff00)
  }

  unselect(): void {
    this.selected = false
    this.object.children[0].material.color.setHex(this.getColorForEvent(this.type))
  }

  unhilight(): void {
    this.hovered = false
    this.object.children[0].material.color.setHex(this.getColorForEvent(this.type))
  }

  hilight(): void {
    this.hovered = true
    this.object.children[0].material.color.setHex(0xff0000)
  }

  private getColorForEvent(type: string): number {
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
    return plane_mesh
  }


  constructor(event: Event) {
    this.object = new THREE.Object3D()
    this.object.viewObject = this

    this.start = event.start
    this.end = event.end
    this.type = event.eventType
    this.height = 0.0005
    const box = this.makePlane(this.start, this.end, this.height)
    this.object.add(box)
  }
}

export default EventView
