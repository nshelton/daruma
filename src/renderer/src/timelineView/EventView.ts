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
  selected: boolean = false
  hovered: boolean = false
  direction = 'updown'

  // TODO make the colors like this
  color: number[] = [0.5, 0.1, 0.5]
  selected_color: number[] = [0.5, 0.5, 0.5]
  hilight_color: number[] = [0.5, 0.5, 0.5]

  setColor(color: number[]): void {
    this.object.children[0].material.color.setRGB(color[0], color[1], color[2])
  }

  select(): void {
    this.selected = true
    this.setColor(this.selected_color)
  }

  unselect(): void {
    this.selected = false
    this.setColor(this.color)
  }

  unhilight(): void {
    this.hovered = false
    if (!this.selected) {
      this.setColor(this.color)
    }
  }

  hilight(): void {
    this.hovered = true
    if (!this.selected) {
      this.setColor(this.hilight_color)
    }
  }

  private getColorForEvent(type: string): number[] {
    const b = 0.6
    switch (type) {
      case 'charging':
        return [0, b, 0]
      case 'heidi':
        return [b, 0, b]
      case 'home':
        return [0, 0, b]
      case 'wifi':
        return [0, b, b]
      default:
        return [0.3, 0.3, 0.3]
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

  private makePlane(start: Date, end: Date): THREE.Mesh {
    const startPos = Layout.DateToPos(start)
    const endPos = Layout.DateToPos(end)
    let w = Math.abs(endPos.x - startPos.x)
    let h = Math.abs(endPos.y - startPos.y)

    //check if ends on the next day and create two boxes

    if (this.direction === 'updown') {
      w = Layout.thickness * 0.3
    } else if (this.direction === 'leftright') {
      h = Layout.thickness
    }
    const geometry = new THREE.PlaneGeometry(w * 0.99, h * 0.99)
    const plane_mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.color[0], this.color[1], this.color[2]),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false
      })
    )
    plane_mesh.position.copy(startPos)
    plane_mesh.position.add(endPos).divideScalar(2)
    // plane_mesh.position.x += Layout.thickness * 0.5
    return plane_mesh
  }

  constructor(event: Event) {
    this.object = new THREE.Object3D()
    this.object.viewObject = this
    this.color = this.getColorForEvent(event.eventType)

    this.start = event.start
    this.end = event.end
    this.type = event.eventType
    const box = this.makePlane(this.start, this.end, this.height)
    this.object.add(box)

  }
}

export default EventView
