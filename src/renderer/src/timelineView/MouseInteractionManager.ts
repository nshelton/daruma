import * as THREE from 'three'
import { EventView } from './EventView'

export class MouseInteractionManager {
  private camera: THREE.Camera
  private scene: THREE.Scene
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private renderer: THREE.Renderer
  private eventViews: EventView[]
  private interactiveObjects: THREE.Object3D[]
  private onSelectCallback: (event: Event) => void
  private currentSelected?: EventView

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    renderer: THREE.Renderer,
    onSelectCallback: (event: Event) => void
  ) {
    this.camera = camera
    this.scene = scene
    this.eventViews = []
    this.renderer = renderer
    this.onSelectCallback = onSelectCallback
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.interactiveObjects = []

    this.updateInteractiveObjects()

    this.onMouseMove = this.onMouseMove.bind(this)
    this.onClick = this.onClick.bind(this)

    this.addEventListeners()
  }

  public setEventViews(eventViews: EventView[]): void {
    this.eventViews = eventViews
    this.updateInteractiveObjects()
  }

  private updateInteractiveObjects(): void {
    this.interactiveObjects = this.eventViews.map((eventView) => eventView.object)
  }

  private addEventListeners(): void {
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove)
    this.renderer.domElement.addEventListener('click', this.onClick)
  }

  private removeEventListeners(): void {
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove)
    this.renderer.domElement.removeEventListener('click', this.onClick)
  }

  private updateMousePosition(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  }

  private getIntersectedObject(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true)
    return intersects.length > 0 ? intersects[0] : null
  }

  private onMouseMove(event: MouseEvent): void {
    event.preventDefault()
    this.updateMousePosition(event)
    const intersectedObject = this.getIntersectedObject()

    this.eventViews.forEach((eventView) => eventView.unhilight())

    if (intersectedObject) {
      const eventView = this.findEventViewFromObject(intersectedObject.object)
      if (eventView) {
        eventView.hilight()
      }
    }
  }

  private onClick(event: MouseEvent): void {
    event.preventDefault()
    this.updateMousePosition(event)
    const intersectedObject = this.getIntersectedObject()

    if (intersectedObject) {
      const eventView = this.findEventViewFromObject(intersectedObject.object)
      if (eventView) {
        if (eventView !== this.currentSelected) {
          this.currentSelected?.unselect()
        }
        eventView.select()
        this.currentSelected = eventView
        this.onSelectCallback(eventView.getEventData())
      }
    }
  }

  private findEventViewFromObject(object: THREE.Object3D): EventView | undefined {
    return this.eventViews.find(
      (eventView) => eventView.object === object || eventView.object.children.includes(object)
    )
  }

  public updateEventViews(newEventViews: EventView[]): void {
    this.eventViews = newEventViews
    this.updateInteractiveObjects()
  }

  public dispose(): void {
    this.removeEventListeners()
    this.currentSelected = undefined
  }
}
