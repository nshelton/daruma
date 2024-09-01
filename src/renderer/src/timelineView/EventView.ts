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

  private makePlane(startPos: Date, endPos: Date, height: number): THREE.Mesh {
    this.color = this.getColorForEvent(this.type)
    this.selected_color = this.color.map((c) => c * 1.5 + 0.2)
    this.hilight_color = this.color.map((c) => c * 1.2 + 0.5)

    console.log(this.color, this.hilight_color, this.selected_color)

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
