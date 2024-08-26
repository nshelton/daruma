// Day.ts
import { Wireframe } from 'three/examples/jsm/Addons.js'
import { Event } from './EventView'
import * as THREE from 'three'
import { msToWorldPosition } from './dateUtils'

export class CurrentTimeView {
  object: THREE.Object3D
  pos: number
  width = 0.0001
  // width = msToWorldPosition(600000000) // 1 minute wide
  height = 1000

  constructor() {
    this.object = new THREE.Object3D()

    const geometry = new THREE.BoxGeometry(this.width, this.height, 1)
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9
    })

    const cursor = new THREE.Mesh(geometry, lineMaterial)
    this.object.add(cursor)
  }

  update() {
    let date = new Date()
    this.pos = msToWorldPosition(date.getTime())
    this.object.position.x = this.pos - this.width / 2
  }
}

export default CurrentTimeView
