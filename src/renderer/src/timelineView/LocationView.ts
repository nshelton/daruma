// Day.ts
import * as THREE from 'three'
import { Layout } from './dateUtils'
import { Materials } from '../materials/Materials'

export class LocationView {
  object: THREE.Object3D
  time: Date
  material: THREE.Material
  color: [number, number, number]

  setColor(color: number[]): void {
    this.object.children[0].material.uniforms.color.value.setRGB(color[0], color[1], color[2])
  }

  constructor(time: Date) {
    this.object = new THREE.Object3D()
    this.object.viewObject = this
    this.color = [1, 0.5, 0]

    this.time = time

    this.material = Materials.GetEventMaterial(
      new THREE.Color(this.color[0], this.color[1], this.color[2])
    )
    const pos = Layout.DateToPos(this.time)
    const sphere = new THREE.SphereGeometry(0.0001, 4, 4)

    this.object.add(new THREE.Mesh(sphere, this.material))

    this.object.position.copy(pos)
  }
}

export default LocationView
