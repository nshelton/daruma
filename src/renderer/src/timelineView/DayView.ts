// Day.ts
import * as THREE from 'three'
import { Layout, LATITUDE, LONGITUDE } from './dateUtils'
import { getSunrise, getSunset } from 'sunrise-sunset-js'

export class DayView {
  object: THREE.Object3D
  hourTicks: THREE.Object3D
  direction = 'updown'
  color: number[] = [0.5, 0.5, 0.5]
  frameMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.2, 0.0, 0.1)
    // transparent: true,
    // opacity: 0.5
  })

  daylightMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.2, 0.2, 0.0),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5
  })

  tickMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    transparent: false
  })

  constructor(date: Date, color: number[]) {
    this.color = color
    this.frameMaterial.color.setRGB(color[0], color[1], color[2])
    this.object = new THREE.Object3D()

    // Layout.CreatePlane(
    //   date,
    //   new Date(date.getTime() + Layout.MS_IN_A_DAY),
    //   this.frameMaterial
    // ).forEach((block: THREE.Mesh) => {
    //   this.object.add(block)
    // })

    const sunrise = getSunrise(LATITUDE, LONGITUDE, date)
    const next_day = new Date(date.getTime() + Layout.MS_IN_A_DAY)
    const sunset = getSunset(LATITUDE, LONGITUDE, next_day)

    const sunlight = Layout.CreatePlane(sunrise, sunset, this.daylightMaterial)[0]

    sunlight.position.z = 0.1
    this.object.add(sunlight)

    const hourTicks = new THREE.Object3D()

    for (let i = 0; i < 24; i++) {
      const tickTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i, 0, 0)
      let tickWidth = 0.5

      if (i % 3 === 0) tickWidth *= 2
      if (i % 6 === 0) tickWidth *= 2
      if (i % 12 === 0) tickWidth *= 2

      const t0 = new Date(tickTime.getTime() - tickWidth * 60 * 1000)
      const t1 = new Date(tickTime.getTime() + tickWidth * 60 * 1000)

      const tick = Layout.CreatePlane(t0, t1, this.tickMaterial)[0]
      hourTicks.add(tick)
    }

    this.object.add(hourTicks)

    let text = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    text = text.replace(',', '').toLocaleLowerCase()
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 40

    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Could not get 2d context')

    context.fillStyle = 'orange'
    context.font = '30px IBM Plex Mono'
    context.fillText(text, 0, 30)

    const texture = new THREE.CanvasTexture(canvas)
    texture.filter = THREE.NearestFilter
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1 })
    const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.0025, 0.0005), material)

    textMesh.position.copy(Layout.DateToPos(date))
    textMesh.position.y += 0.001
    this.object.add(textMesh)

    if (date.getDay() == 0) {
      const weekBar = Layout.CreatePlane(date, new Date(date.getTime() + Layout.MS_IN_A_DAY - 1), this.frameMaterial)[0]
      weekBar.position.z = 0.2
      weekBar.position.x -= Layout.thickness / 2
      weekBar.scale.y = 2
      weekBar.scale.x = 0.1
      this.object.add(weekBar)
    }
  }
}

export default DayView
