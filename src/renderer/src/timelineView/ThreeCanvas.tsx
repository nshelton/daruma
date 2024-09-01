import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { DayView } from './DayView'
import { EventView } from './EventView'
import { CurrentTimeView } from './CurrentTimeView'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import turboColors from '../ColorSchemes'
import { IpcRendererEvent } from 'electron'

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ infoPanelCallback }) => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    infoPanelCallback({})

    const initial_zoom = 100000

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera()

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    mount.appendChild(renderer.domElement)

    const handleResize = (): void => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.left = window.innerWidth / -initial_zoom
      camera.right = window.innerWidth / initial_zoom
      camera.top = window.innerHeight / initial_zoom
      camera.bottom = window.innerHeight / -initial_zoom
      camera.updateProjectionMatrix()
    }

    handleResize()
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = 1
    controls.maxDistance = 500
    controls.enableRotate = false
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE
    }

    window.addEventListener('resize', handleResize)
    camera.position.z = 10

    // iterate through days of the year
    for (let i = 0; i < 365; i++) {
      const date = new Date(2024, 0, i + 1)
      const index = Math.floor((turboColors.length * i) / 365)
      const dayView = new DayView(date, turboColors[index])
      scene.add(dayView.object)
    }

    const stats = new Stats()
    stats.showPanel(0)
    const stat_dom_object = stats.dom
    stat_dom_object.id = 'stats'
    document.getElementById('main-canvas')?.appendChild(stat_dom_object)

    const EventViewToEventData: Record<string, any> = {}
    const AllEventViews: EventView[] = []

    let current_selected: EventView | undefined = undefined

    const onDocumentMouseDown = (event: MouseEvent): void => {
      event.preventDefault()
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      if (intersects[0]?.object.parent?.viewObject instanceof EventView) {
        const clickedView = intersects[0].object.parent.viewObject
        const this_data = EventViewToEventData[clickedView.object.uuid]
        infoPanelCallback(this_data)
        if (clickedView !== current_selected) {
          current_selected?.unselect()
        }
        clickedView.select()
        current_selected = clickedView
      }
    }

    const onDocumentMouseMove = (event: MouseEvent): void => {
      event.preventDefault()
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      AllEventViews.forEach((e) => e.unhilight())
      if (intersects[0]?.object.parent?.viewObject instanceof EventView) {
        intersects[0].object.parent.viewObject.hilight()
      }
    }

    renderer.domElement.addEventListener('click', onDocumentMouseDown)
    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove)

    const current_time = new CurrentTimeView()
    scene.add(current_time.object)

    let animationFrameId: number

    const animate = (): void => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      current_time?.update()
      stats.update()
    }

    animate()

    const handleEventList = (_: IpcRendererEvent, eventlist: Event[]): void => {
      eventlist.forEach((e) => {
        const event = new EventView(e)
        scene.add(event.object)
        AllEventViews.push(event)
        EventViewToEventData[event.object.uuid] = e
      })
    }

    window.electron.ipcRenderer.on('event-list', handleEventList)
    window.electron.ipcRenderer.send('get-file-content')

    return (): void => {
      window.removeEventListener('resize', handleResize)

      renderer.domElement.removeEventListener('click', onDocumentMouseDown)
      renderer.domElement.removeEventListener('mousemove', onDocumentMouseMove)
      window.electron.ipcRenderer.removeListener('event-list', handleEventList)
      cancelAnimationFrame(animationFrameId)
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
