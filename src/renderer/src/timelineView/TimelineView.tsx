import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CalendarCameraControls } from './CalendarCameraControls'
import { DayView } from './DayView'
import { EventView } from './EventView'
import { CurrentTimeView } from './CurrentTimeView'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { turboColors } from '../ColorSchemes'
import { IpcRendererEvent } from 'electron'
import { MouseInteractionManager } from './MouseInteractionManager'
import { ArcPoint } from 'src/types'
import { LocationView } from './LocationView'

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ eventData, locationData, infoPanelCallback }) => {

  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    infoPanelCallback({})

    const initial_zoom = 10000

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera()

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    const domElement = renderer.domElement
    console.log(window.innerWidth, window.innerHeight);
    renderer.setSize(domElement.clientWidth-500, domElement.clientHeight)

    mount.appendChild(renderer.domElement)

    const mouseControls = new MouseInteractionManager(
      camera,
      scene,
      renderer,
      (event: EventView) => {
        infoPanelCallback(EventViewToEventData[event.object.uuid])
      })

    const handleResize = (): void => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h)
      camera.left = w / -initial_zoom
      camera.right = w / initial_zoom
      camera.top = h / initial_zoom
      camera.bottom = h / -initial_zoom
      camera.updateProjectionMatrix()
    }

    handleResize()
    const controls = new CalendarCameraControls(camera, renderer.domElement)
    window.addEventListener('resize', handleResize)
    camera.position.z = 10

    // iterate through days of the year
    for (let year = 2020; year < 2025; year++) {
      for (let i = 0; i < 365; i++) {
        const date = new Date(year, 0, i + 1)
        const index = Math.floor((turboColors.length * i) / 365)
        const dayView = new DayView(date, turboColors[index])
        scene.add(dayView.object)
      }
    }

    const stats = new Stats()
    stats.showPanel(0)
    const stat_dom_object = stats.dom
    stat_dom_object.id = 'stats'
    document.getElementById('main-canvas')?.appendChild(stat_dom_object)

    const EventViewToEventData: Record<string, Event> = {}
    const AllEventViews: EventView[] = []

    const current_time = new CurrentTimeView()
    scene.add(current_time.object)

    eventData.forEach((e: Event) => {
      const event = new EventView(e)
      scene.add(event.object)
      AllEventViews.push(event)
      EventViewToEventData[event.object.uuid] = e
    })

    // for (var i = locationData.length - 1; i > locationData.length  - 1000; i--) {
    //   console.log(locationData[i])
    //   if (locationData[i] == undefined) continue
    //   const locationPoint = new LocationView(locationData[i].time)
    //   scene.add(locationPoint.object)
    // }

    let animationFrameId: number

    const animate = (): void => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      current_time?.update()
      stats.update()
    }

    animate()


    mouseControls.setEventViews(AllEventViews)

    return (): void => {
      window.removeEventListener('resize', handleResize)

      cancelAnimationFrame(animationFrameId)
      mouseControls.dispose()
      controls.dispose()
      renderer.dispose()
      renderer.forceContextLoss() // Add this line to discard the active WebGL context
      if (mount.children[0]) mount.removeChild(mount.children[0])
      document.getElementById('stats')?.remove()
      scene.clear()
    }
  }, [])

  return <div ref={mountRef} />
}

export default ThreeCanvas
