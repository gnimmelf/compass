import * as THREE from 'three'

import { latLngToPosition } from '../utils';


type Options = {
  // Map bounds
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export class MapMarkers {
  groundMapMesh: THREE.Mesh
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.Renderer
  options: Options
  clickMark: THREE.Mesh
  mouse: THREE.Vector2
  raycaster: THREE.Raycaster
  rayDirection = new THREE.Vector3(0, -1, 0)
  rayOrigin = new THREE.Vector3(0, 200, 0)

  constructor(
    groundMapMesh: THREE.Mesh,
    renderer: THREE.Renderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: Options
  ) {
    this.groundMapMesh = groundMapMesh
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.options = options

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clickMark = this.#createMarker()
    this.clickMark.visible = false;  // Initially hidden
    scene.add(this.clickMark);
  }

  #createMarker(color = 0x00ff00) {
    const geometry = new THREE.SphereGeometry(10, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(geometry, material);
    return marker
  }

  addLocation(lat: number, lng: number, color = 0xffffff, debug = false) {
    const { x, y } = latLngToPosition(
      lat,
      lng,
      this.options.minLat,
      this.options.maxLat,
      this.options.minLng,
      this.options.maxLng,
      this.groundMapMesh.geometry.parameters.width,
      this.groundMapMesh.geometry.parameters.height,
    );
    this.rayOrigin.setX(x).setZ(y)

    if (debug) {
      const arrowHelper = new THREE.ArrowHelper(this.rayDirection, this.rayOrigin, 200, 0xffffff);
      this.scene.add(arrowHelper);
    }

    this.raycaster.set(this.rayOrigin, this.rayDirection);
    const intersects = this.raycaster.intersectObject(this.groundMapMesh, false)
    if (intersects.length > 0) {
      console.log("!!")
      const marker = this.#createMarker(color)
      marker.position.copy(intersects[0].point);
      this.scene.add(marker)
    }
  }

  onResize() {

  }

  moveClickMark() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundMapMesh, false)
    if (intersects.length > 0) {
      // Move click-marker position to the intersection point and make it visible
      this.clickMark.position.copy(intersects[0].point);
      this.clickMark.visible = true;
      console.log(this.clickMark.position)
    }
  }

  setMousePos(evt: MouseEvent) {
    // TODO! Expensiver on every mousemove
    const rect = this.renderer.domElement.getBoundingClientRect()
    // Normalize mouse position to [-1, 1]
    this.mouse.x = ((evt.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
    this.mouse.y = - ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1
  }

}