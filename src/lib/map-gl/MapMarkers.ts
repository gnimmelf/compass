import * as THREE from 'three'

export class MapMarkers {
  clickMark: THREE.Mesh
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.Renderer
  canvasRect!: DOMRect

  constructor(renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clickMark = this.#createMarker()
    this.clickMark.visible = false;  // Initially hidden
    scene.add(this.clickMark);

    this.onResize()
  }

  #createMarker() {
    const geometry = new THREE.SphereGeometry(10, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const marker = new THREE.Mesh(geometry, material);
    return marker
  }

  onResize() {
    this.canvasRect = this.renderer.domElement.getBoundingClientRect()
  }

  setMarker(mapMesh:THREE.Mesh) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(mapMesh, false)
    if (intersects.length > 0) {
      // Set marker position the intersection point and make it visible
      this.clickMark.position.copy(intersects[0].point);
      this.clickMark.visible = true;
    }
  }

  setMousePos(evt: MouseEvent) {
    // Normalize mouse position to [-1, 1]
    const rect = this.canvasRect
    this.mouse.x = ((evt.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1
    this.mouse.y = - ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1
  }

}