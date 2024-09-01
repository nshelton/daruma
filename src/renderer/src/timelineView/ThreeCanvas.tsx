// ThreeCanvas.tsx
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { DayView } from './DayView'
import { EventView } from './EventView'
import { CurrentTimeView } from './CurrentTimeView'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import turboColors from '../ColorSchemes'
// import Event from '../../main/EventParser.ts'

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
    // controls.enableDamping = true // an animation loop is required when either damping or auto-rotation are enabled
    // controls.dampingFactor = 0.25

    controls.minDistance = 1
    controls.maxDistance = 500
    controls.enableRotate = false

    // swap left button for pan and right button for rotate
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE
    }

    window.addEventListener('resize', handleResize)
    camera.position.z = 10

    //draw a really long boxx for timeline that renders on top of everything
    const geometry = new THREE.PlaneGeometry(100000, 0.00005)
    const material = new THREE.MeshBasicMaterial({ color: 0x666666 })
    const timeline = new THREE.Mesh(geometry, material)
    timeline.position.z = 9
    scene.add(timeline)

    // iterate through days of the year
    for (let i = 0; i < 365; i++) {
      const date = new Date(2024, 0, i + 1)
      const index = Math.floor((turboColors.length * i) / 365)
      const dayView = new DayView(date, turboColors[index])
      scene.add(dayView.object)
    }

    document.getElementById('stats')?.remove()
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    const stat_dom_object = stats.dom
    stat_dom_object.id = 'stats'
    document.getElementById('main-canvas')?.appendChild(stat_dom_object)

    const triggerLoad = (): void => window.electron.ipcRenderer.send('get-file-content')
    const EventViewToEventData = {}
    const AllEventViews: EventView[] = []

    window.electron.ipcRenderer.on('event-list', (_, eventlist: Event[]) => {
      eventlist.forEach((e) => {
        const event = new EventView(e)
        scene.add(event.object)
        AllEventViews.push(event)
        EventViewToEventData[event.object.uuid] = e
      })
    })

    console.log('loader')
    triggerLoad()

    var current_selected :EventView = null

    const onDocumentMouseDown = (event: MouseEvent): void => {
      event.preventDefault()
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      if (intersects[0].object.parent.viewObject instanceof EventView) {
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
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      if (intersects.length > 0) {
        console.log(intersects[0].object.viewObject)
        AllEventViews.forEach((e) => {
          e.unhilight()
        })
        if (intersects[0].object.parent.viewObject instanceof EventView) {
          intersects[0].object.parent.viewObject.hilight()
        }
      }
    }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    renderer.domElement.addEventListener('click', onDocumentMouseDown, false)
    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false)

    const current_time = new CurrentTimeView()
    scene.add(current_time.object)
    const animate = (): void => {

      requestAnimationFrame(animate)
      controls.update() // only required if controls.enableDamping or controls.autoRotate are set to true
      renderer.render(scene, camera)
      current_time?.update()
      stats.update()
    }

    animate()

    return (): void => {
      mount.removeChild(renderer.domElement)
    }


  }, [])

  return <div ref={mountRef} />
}

export default ThreeCanvas
