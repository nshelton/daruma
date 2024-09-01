// Day.ts
import * as THREE from 'three'
import { Layout, LATITUDE, LONGITUDE } from './dateUtils'
import { getSunrise, getSunset } from 'sunrise-sunset-js'

export class DayView {
  object: THREE.Object3D
  frame: THREE.Object3D
  hourTicks: THREE.Object3D
  direction = 'updown'
  color: number[] = [0.5, 0.5, 0.5]

  private makePlane(startPos: THREE.Vector3, endPos: THREE.Vector3): THREE.Mesh {
    let w = endPos.x - startPos.x
    let h = endPos.y - startPos.y

    if (this.direction === 'updown') {
      w = Layout.thickness
    } else if (this.direction === 'leftright') {
      h = Layout.thickness
    }
    const geometry = new THREE.PlaneGeometry(w * 0.99, h * 0.99)
    const plane_mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.color[0], this.color[1], this.color[2])
      })
    )
    plane_mesh.position.copy(startPos)
    plane_mesh.position.add(endPos).divideScalar(2)
    return plane_mesh
  }

  constructor(date: Date, color: number[]) {
    this.color = color
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

    this.frame = this.makePlane(start, end)
    this.object.add(this.frame)

    const daylight = this.makePlane(sunrisePos, sunsetPos)
    // daylight.position.z = 0.1
    daylight.material.transparent = true
    daylight.material.opacity = 0.5
    daylight.material.color.setRGB(1, 1, 1)
    this.object.add(daylight)

    //make box
    // const box = new THREE.Mesh(
      // new THREE.BoxGeometry(Layout.thickness, Layout.thickness, Layout.thickness),
      // new THREE.MeshBasicMaterial({ color: 0x00ffff })
    // )
    // this.object.add(box)

    //create hour ticks
    const hourTicks = new THREE.Object3D()
    for (let i = 0; i < 24; i++) {
      const tickTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i, 0, 0)
      let tickWidth = 0.000005

      if (i % 3 === 0) tickWidth *= 2
      if (i % 6 === 0) tickWidth *= 2
      if (i % 12 === 0) tickWidth *= 2

      const middle = Layout.DateToPos(tickTime)
      const left = middle.clone()
      if (this.direction === 'updown') left.y -= tickWidth
      else if (this.direction === 'leftright') left.x -= tickWidth

      const right = middle.clone()
      if (this.direction === 'updown') right.y += tickWidth
      else if (this.direction === 'leftright') right.x += tickWidth

      const tick = this.makePlane(left, right)

      hourTicks.add(tick)
    }

    this.object.add(hourTicks)

    const text = date.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric' })
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 40

    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Could not get 2d context')

    context.fillStyle = 'orange'
    context.font = '30px IBM Plex Mono'
    context.fillText(text, 0, 30)

    const texture = new THREE.CanvasTexture(canvas)
    texture.filter = THREE.NearestFilter
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1 })
    const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.01), material)

    // textMesh.position.x = (this.start + this.end) / 2
    textMesh.position.copy(Layout.DateToPos(date))
    textMesh.position.z = 0.001
    textMesh.position.y -= 0.001
    textMesh.position.x += Layout.thickness / 2
    textMesh.scale.multiplyScalar(0.05)
    this.object.add(textMesh)

    // add box for middle of day
    const middleOfDay = new Date(date.getTime() + Layout.MS_IN_A_DAY / 2)
    const middle = Layout.DateToPos(middleOfDay)
    const box = this.makePlane(middle, middle)
    box.position.z = 0.1
    box.material.transparent = true
    box.material.opacity = 0.5
    box.material.color.setRGB(1, 1, 1)
    this.object.add(box)

  }
}

export default DayView
