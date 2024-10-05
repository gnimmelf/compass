import * as THREE from 'three'
import * as dat from 'lil-gui'
import { loadSvg3d } from '../svg';
import urlRose from '/assets/compass-rose.svg'

export const guiProps = {
  rotationX: -Math.PI / 6,
}

/**
 * Compass and Rose
 */
export class CompassRose {
  rose!: THREE.Group
  compass: THREE.Group
  bearing: number
  camera: THREE.PerspectiveCamera
  worldDirection: THREE.Vector3
  spherical: THREE.Spherical
  directionMask: THREE.Vector3

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    this.compass = new THREE.Group();
    this.spherical = new THREE.Spherical();
    this.worldDirection = new THREE.Vector3();
    this.directionMask = new THREE.Vector3(0, 0, 1);
    this.bearing = 0

    loadSvg3d(urlRose, {
      extrusion: 2,
      reCenter: new THREE.Vector3(0, 10, 0),
      reScale: new THREE.Vector3(.02, .02, .02),
      fillMaterial: new THREE.MeshBasicMaterial({ color: 0x000000 }),
      strokeMaterial: new THREE.LineBasicMaterial({ color: 0x888888 })
    }).then((rose: THREE.Group) => {
      this.rose = rose
      rose.name = 'rose'
      this.compass.add(rose);
      this.compass.rotation.x = guiProps.rotationX
      this.onResize()
      // TODO! Try adding `OrthographicCamera` as a wrapper around `compass`
      camera.add(this.compass);
    })
  }

  onResize() {
    const padding = 3
    const distance = 10;
    // Calculate the visible height at the given distance
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance;
    // Calculate the visible width at the given distance (based on the aspect ratio)
    const visibleWidth = visibleHeight * this.camera.aspect;
    // Set the position of the compass to the top-left of the camera's view
    const pixelsPerVertX = -visibleWidth / 2 + padding; // Add any padding if needed
    const pixelsPerVertY = visibleHeight / 2 - padding; // Add any padding if needed
    // Position the compass at the top-left corner
    this.compass.position.set(pixelsPerVertX, pixelsPerVertY, -distance);

  }

  animate() {
    this.camera.getWorldDirection(this.worldDirection);
    this.spherical.setFromVector3(this.worldDirection);
    this.bearing = Math.PI - this.spherical.theta
    this.rose?.setRotationFromAxisAngle(this.directionMask, this.bearing)
  }

  addGui(folder: dat.GUI) {
    folder.add(guiProps, 'rotationX', -Math.PI, Math.PI).onChange((e: number) => {
      const rose = this.compass.getObjectByName('rose')
      //@ts-ignore
      rose.rotation.x = e
    })
  }
}