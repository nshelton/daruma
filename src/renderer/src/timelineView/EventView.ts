// Day.ts
import * as THREE from 'three'
import { Layout } from './dateUtils'
import { Event } from '../../types/Event.ts'

export class EventView {
  object: THREE.Object3D
  start: Date
  end: Date
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
        return 0.000
      case 'heidi':
        return 0.0001
      case 'home':
        return 0.0002
      case 'wifi':
        return 0.0003
      default:
        return 0
    }
  }

  constructor(event: Event) {
    this.object = new THREE.Object3D()
    this.object.viewObject = this
    this.color = this.getColorForEvent(event.eventType)

    this.start = event.start
    this.end = event.end
    this.type = event.eventType

    this.material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.color[0], this.color[1], this.color[2]),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending

      })
    const box = Layout.CreatePlane(this.start, this.end, this.material).forEach((block: THREE.Mesh) => {
      block.scale.x *= 0.5
      this.object.add(block)
    })

  }
}

export default EventView
