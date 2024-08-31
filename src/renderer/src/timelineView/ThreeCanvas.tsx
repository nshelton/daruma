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

    infoPanelCallback('ThreeCanvas has been initialized')

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
      const dayView = new DayView(date)
      const index = Math.floor((turboColors.length * i) / 365)
      dayView.setColor(turboColors[index]) // Apply turbo color scheme
      scene.add(dayView.object)
    }

    document.getElementById('stats')?.remove()
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    const stat_dom_object = stats.dom
    stat_dom_object.id = 'stats'
    document.getElementById('main-canvas')?.appendChild(stat_dom_object)

    const triggerLoad = (): void => window.electron.ipcRenderer.send('get-file-content')

    window.electron.ipcRenderer.on('event-list', (_, eventlist: Event[]) => {
      console.log(eventlist)
      eventlist.forEach((e) => {
        const event = new EventView(e)
        scene.add(event.object)
      })
    })

    console.log('loader')
    triggerLoad()

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


  }, [infoPanelCallback])

  return <div ref={mountRef} />
}

export default ThreeCanvas
