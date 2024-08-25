// Day.ts
import { Wireframe } from 'three/examples/jsm/Addons.js'
import { Event } from './Event'
import * as THREE from 'three'
import { msToWorldPosition, MS_IN_A_DAY, LATITUDE, LONGITUDE } from './dateUtils'
import { getSunrise, getSunset } from 'sunrise-sunset-js';


export class DayView {
  object: THREE.Object3D
  start: number // ms since epoch
  end: number // ms since epoch
  frame: THREE.Object3D
  hourTicks: THREE.Object3D
  dayHeight = 0.001

  private makePlane(startPos: number, endPos: number, height: number): THREE.Mesh {
    const w = endPos - startPos
    const geometry = new THREE.PlaneGeometry(w * 0.99, height)

    const plane_mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0x666666
      })
    )
    plane_mesh.position.x = (startPos + endPos) / 2

    return plane_mesh
  }

  constructor(date: Date) {
    this.object = new THREE.Object3D()
    this.start = msToWorldPosition(date.getTime())
    this.end = msToWorldPosition(date.getTime() + MS_IN_A_DAY)

    const width = this.end - this.start


    const sunrise = getSunrise(LATITUDE, LONGITUDE, date)
    const next_day = new Date(date.getTime() + MS_IN_A_DAY)
    const sunset = getSunset(LATITUDE, LONGITUDE, next_day)

    //create ball at sunrise and sunset
    const sunrisePos = msToWorldPosition(sunrise.getTime())
    const sunsetPos = msToWorldPosition(sunset.getTime())

    this.frame = this.makePlane(this.start, this.end, width)
    this.object.add(this.frame)

    const daylight = this.makePlane(sunrisePos, sunsetPos, width)
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

      const tick = this.makePlane(
        this.start + hour * width - tickWidth,
        this.start + hour * width + tickWidth,
        width
      )
      hourTicks.add(tick)
    }
    this.object.add(hourTicks)
  }

  setColor(color: number[]): void {
    this.frame.material.color.setRGB(color[0], color[1], color[2])
  }
}

export default DayView
