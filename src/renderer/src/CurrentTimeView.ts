// Day.ts
import * as THREE from 'three'
import { Layout } from './dateUtils'

export class CurrentTimeView {
  object: THREE.Object3D
  pos: number = 0
  width: number = 0.0001
  // width = msToWorldPosition(600000000) // 1 minute wide
  height: number = 1000

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

  update(): void {
    const date = new Date()
    this.pos = Layout.DateToPos(date)
    this.object.position.x = this.pos - this.width / 2
  }
}

export default CurrentTimeView
