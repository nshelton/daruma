// Day.ts
import * as THREE from 'three'
import { Layout, LATITUDE, LONGITUDE } from './dateUtils'
import { getSunrise, getSunset } from 'sunrise-sunset-js'

export class DayView {
  object: THREE.Object3D
  frame: THREE.Object3D
  hourTicks: THREE.Object3D
  dayHeight = Layout.dayHeight

  private makePlane(startPos: THREE.Vector3, endPos: THREE.Vector3, height: number): THREE.Mesh {
    const w = endPos.x - startPos.x
    const geometry = new THREE.PlaneGeometry(w * 0.99, height)

    const plane_mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0x666666
      })
    )
    plane_mesh.position.copy(startPos)
    plane_mesh.position.add(endPos).divideScalar(2)

    return plane_mesh
  }

  constructor(date: Date) {
    this.object = new THREE.Object3D()
    const start = Layout.DateToPos(date)
    const end = Layout.DateToPos(new Date(date.getTime() + Layout.MS_IN_A_DAY))

    const width = end.x - start.x

    const sunrise = getSunrise(LATITUDE, LONGITUDE, date)
    const next_day = new Date(date.getTime() + Layout.MS_IN_A_DAY)
    const sunset = getSunset(LATITUDE, LONGITUDE, next_day)

    //create ball at sunrise and sunset
    const sunrisePos = Layout.DateToPos(sunrise)
    const sunsetPos = Layout.DateToPos(sunset)

    this.frame = this.makePlane(start, end, width)
    this.object.add(this.frame)

    const daylight = this.makePlane(sunrisePos, sunsetPos, width)
    // daylight.position.z = 0.1
    daylight.material.transparent = true
    daylight.material.opacity = 0.5
    daylight.material.color.setRGB(1, 1, 1)
    this.object.add(daylight)

    //create hour ticks
    const hourTicks = new THREE.Object3D()
    for (let i = 0; i < 24; i++) {
      const hour = i / 24
      let tickWidth = 0.000005

      if (i % 3 === 0) tickWidth *= 2
      if (i % 6 === 0) tickWidth *= 2
      if (i % 12 === 0) tickWidth *= 2

      const left = start.clone()
      left.x += hour * width - tickWidth
      const right = start.clone()
      right.x += hour * width + tickWidth

      const tick = this.makePlane(left, right, width)
      hourTicks.add(tick)
    }
    this.object.add(hourTicks)

    const text = date.toDateString()
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 10

    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Could not get 2d context')
    // context.fillStyle = 'green'
    // context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = 'orange'
    context.font = '10px Arial'
    context.fillText(text, 0, 10)

    const texture = new THREE.CanvasTexture(canvas)
    texture.filter = THREE.NearestFilter
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1 })
    const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.01), material)

    textMesh.position.copy(start)
    textMesh.position.add(end).divideScalar(2)


    // textMesh.position.x = (this.start + this.end) / 2
    textMesh.position.y += width / 2 + 0.001
    textMesh.position.z = 0.001
    textMesh.scale.multiplyScalar(0.06)
    this.object.add(textMesh)
  }

  setColor(color: number[]): void {
    this.frame.material.color.setRGB(color[0], color[1], color[2])
  }
}

export default DayView
