// Day.ts
import * as THREE from 'three'
import { msToWorldPosition } from './dateUtils'

export class EventView {
  object: THREE.Object3D
  pos: number
  width = 0.0001
  // width = msToWorldPosition(600000000) // 1 minute wide
  height = 1000

  constructor(start: Date, end: Date | null) {
    this.object = new THREE.Object3D()

    const geometry = new THREE.SphereGeometry(this.width)
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9

    })


    const cursor = new THREE.Mesh(geometry, sphereMaterial)

    this.object.position.x = msToWorldPosition(start.getTime())
    this.object.add(cursor)
  }
}

export default EventView
