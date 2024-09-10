import * as THREE from 'three'
import { Layout } from './dateUtils'

export class CalendarCameraControls {
  private camera: THREE.Camera
  private domElement: HTMLElement

  public x_position: number = 0
  public y_position: number = 0.001
  public x_view_width: number = 0.01
  public y_view_height: number = 0.01

  public enabled: boolean = true

  private mouseButtons: { LEFT: THREE.MOUSE; MIDDLE: THREE.MOUSE; RIGHT: THREE.MOUSE }

  private STATE = {
    NONE: -1,
    DOLLY: 1,
    PAN: 2
  }
  private shiftKey: boolean = false

  private state: number = this.STATE.NONE

  private panOffset: THREE.Vector3 = new THREE.Vector3()

  private panStart: THREE.Vector2 = new THREE.Vector2()
  private panEnd: THREE.Vector2 = new THREE.Vector2()
  private panDelta: THREE.Vector2 = new THREE.Vector2()

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement

    this.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.NONE
    }
    this.domElement.addEventListener('keydown', this.onKeyDown)
    this.domElement.addEventListener('keyup', this.onKeyUp)

    this.domElement.addEventListener('contextmenu', this.onContextMenu)
    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('wheel', this.onMouseWheel)

    this.update()
  }

  private onContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.shiftKey && event.key === ' ') {
      this.shiftKey = true
    }
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.shiftKey && event.key === ' ') {
      this.shiftKey = false
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return

    switch (event.button) {
      case 0:
        {
          this.state = this.STATE.PAN
          this.panStart.set(event.clientX, event.clientY)
          break
          // Add cases for DOLLY and PAN if needed
        }
        break
      // Add cases for middle and right mouse buttons
    }

    if (this.state !== this.STATE.NONE) {
      document.addEventListener('pointermove', this.onPointerMove)
      document.addEventListener('pointerup', this.onPointerUp)
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return

    switch (this.state) {
      case this.STATE.PAN:
        this.panEnd.set(event.clientX, event.clientY)
        this.panDelta.subVectors(this.panEnd, this.panStart)

        this.x_position -= this.panDelta.x * this.x_view_width / this.domElement.clientWidth

        this.panStart.copy(this.panEnd)
        break
    }
  }

  private onPointerUp = (event: PointerEvent): void => {
    document.removeEventListener('pointermove', this.onPointerMove)
    document.removeEventListener('pointerup', this.onPointerUp)
    this.state = this.STATE.NONE
  }

  private onMouseWheel = (event: WheelEvent): void => {
    if (!this.enabled ) return

    event.preventDefault()
    console.log(event.deltaY)
    this.x_view_width *= Math.pow(1.1, event.deltaY * 0.01)
    this.update()
  }

  private pan = (deltaX: number, deltaY: number): void => {
    // const offset = new THREE.Vector3()

    // if (this.camera instanceof THREE.PerspectiveCamera) {
    //   const position = this.camera.position
    //   offset.copy(position).sub(this.target)
    //   let targetDistance = offset.length()

    //   // half of the fov is center to top of screen
    //   targetDistance *= Math.tan(((this.camera.fov / 2) * Math.PI) / 180.0)

    //   // we use only clientHeight here so aspect ratio does not distort speed
    //   this.panLeft(2 * deltaX * (targetDistance / this.domElement.clientHeight), this.camera.matrix)
    //   this.panUp(2 * deltaY * (targetDistance / this.domElement.clientHeight), this.camera.matrix)
    // } else if (this.camera instanceof THREE.OrthographicCamera) {
    //   this.panLeft(deltaX, this.camera.projectionMatrix)
    //   this.panUp(deltaY, this.camera.projectionMatrix)
    // } else {
    //   console.warn(
    //     'WARNING: CustomCameraControls encountered an unknown camera type - pan disabled.'
    //   )
    //   this.enablePan = false
    // }
  }

  public update(): boolean {

    this.camera.position.x = this.x_position
    this.camera.position.y = this.y_position
    this.camera.left = this.x_position - this.x_view_width
    this.camera.right = this.x_position + this.x_view_width
    this.camera.top = this.y_position + this.y_view_height
    this.camera.bottom = this.y_position - this.y_view_height
    this.camera.updateProjectionMatrix()

    return true
  }

  public dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu)
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('wheel', this.onMouseWheel)

    document.removeEventListener('pointermove', this.onPointerMove)
    document.removeEventListener('pointerup', this.onPointerUp)
    document.removeEventListener('keydown', this.onKeyDown)
  }

  // Add public methods to modify properties as needed
  public setMinPolarAngle(angle: number): void {
    this.minPolarAngle = angle
  }

  public setMaxPolarAngle(angle: number): void {
    this.maxPolarAngle = angle
  }

  // Add more setter methods as needed
}
