// ThreeCanvas.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DayView } from './DayView';
import { EventView } from './EventView';
import { CurrentTimeView } from './CurrentTimeView';
import { msToWorldPosition } from './dateUtils'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import turboColors from './ColorSchemes.tsx';

const ThreeCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const initial_zoom = 100000;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera()

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const handleResize = (): void => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.left = window.innerWidth / -initial_zoom
      camera.right = window.innerWidth / initial_zoom
      camera.top = window.innerHeight / initial_zoom
      camera.bottom = window.innerHeight / -initial_zoom
      camera.updateProjectionMatrix()
    }

    handleResize()
    const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    // controls.dampingFactor = 0.25;

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

    // Create a Day with Events
    // day.addEvent(new Event('Event 1', 0, 1));
    // day.addEvent(new Event('Event 2', 1, 2));
    // day.addEvent(new Event('Event 3', 2, 3));

    // get a date object with month, day year

    // iterate through days of the year
    for (let i = 0; i < 365; i++) {
      const date = new Date(2024, 0, i + 1)
      const dayView = new DayView(date)
      const index = Math.floor((turboColors.length * i) / 365)
      dayView.setColor(turboColors[index]) // Apply turbo color scheme
      scene.add(dayView.object)
    }

    // const date = new Date(2024, 8, 17);
    // const day = new DayView().;
    // scene.add(day.object);

    // var current_time = new CurrentTimeView()
    // scene.add(current_time.object)

    // // Render events on a timeline

    // get file content

    // ...


    // const geometry = new THREE.PlaneGeometry(100, 100, 100, 100);
    // const material = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x888888 });
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    document.getElementById('stats')?.remove()
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    const stat_dom_object = stats.dom
    stat_dom_object.id = 'stats'
    document.getElementById('main-canvas')?.appendChild(stat_dom_object)

    const triggerLoad = (): void => window.electron.ipcRenderer.send('get-file-content')

    window.electron.ipcRenderer.on('file-content', (event, fileContent) => {
      console.log(fileContent)
      fileContent.forEach((line) => {
        if(line.length < 3) return

        const date = new Date(line[0] + ' ' + line[1])

        // const start = msToWorldPosition(date.getTime())
        // const end = msToWorldPosition(date.getTime() + 1000 * 60 * 60 * 24)
        const event = new EventView(date)
        scene.add(event.object)
      })
    })

    console.log('loader')
    triggerLoad()

    const animate = (): void => {

      requestAnimationFrame(animate)
      controls.update() // only required if controls.enableDamping or controls.autoRotate are set to true
      renderer.render(scene, camera)
      // current_time?.update();
      stats.update()
    }

    animate()

    return (): void => {
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} />;
};

export default ThreeCanvas;
