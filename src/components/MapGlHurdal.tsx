/**
 * IMPORTANT!
 *
 * Geo-Three vs Three-Geo
 *
 * This is three-geo
 * https://github.com/w3reality/three-geo
 *
 */

import {
  Component,
  createResource,
  createSignal,
  from,
  onCleanup,
  onMount,
  Suspense
} from 'solid-js';
import { createStore } from "solid-js/store";
import * as THREE from 'three';
import * as dat from 'lil-gui'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Bearing } from '../lib/Bearing';
import { svgLoader } from '../lib/svg';
import UrlMapHurdal from '../assets/hurdal-map.png'
import urlMapHurdalTopo from '../assets/hurdal-map-height.png'
import urlRose from '../assets/compass-rose.svg'
import urlBg from '../assets/sky.jpeg'

console.log('maxTextureSize:', WebGL2RenderingContext.MAX_TEXTURE_SIZE)

const guiProps = {
  cssColor: '#ff00ff',
  wireframe: false,
  rotationX: -Math.PI / 6,
  rotationY: 0,
  rotationZ: 0,
  posX: 0,
  posY: 0,
  displacement: 122,
}

/**
   * LIL-GUI onChange
   */
const gui = new dat.GUI({ closeFolders: true });
const guiGround = gui.addFolder('Ground')
const guiRose = gui.addFolder('Rose')


const VIEW = {
  viewFraction: 1.2,
  fov: 75,
  near: 0.1,
  far: 1e12,
  cameraDistance: 442,
  cameraPos: new THREE.Vector3(294, 20, 454),
  targetPos: new THREE.Vector3(382, 3, -17),
  get width() {
    return window.innerWidth / VIEW.viewFraction
  },
  get height() {
    return window.innerHeight / VIEW.viewFraction
  },
  get aspect() {
    return VIEW.width / VIEW.height
  }
} as const

const MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2, ROTATE: 0, DOLLY: 1, PAN: 2 };
const TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 };

class MapControls extends OrbitControls {
  screenSpacePanning: boolean
  mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number; }
  touches: { ONE: number; TWO: number }

  constructor(camera: THREE.Camera, renderer: THREE.Renderer) {
    super(camera, renderer.domElement);
    this.screenSpacePanning = false; // True pans viewport xy, false pans map xz-plane
    this.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    this.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };

    this.minDistance = 100;
    this.maxDistance = 1000
    this.zoomSpeed = 0.5;
    this.minPolarAngle = 0;
    this.maxPolarAngle = (Math.PI / 2) - (Math.PI / 18)
  }
}

class GroundMap {
  bounds?: THREE.Vector4
  planeWidth: number = 1000
  planeHeight: number = 1000

  planeGeo: THREE.PlaneGeometry
  mapTexture: THREE.Texture
  dispMapTexture: THREE.Texture
  material: THREE.MeshStandardMaterial
  mesh: THREE.Mesh

  constructor(scene: THREE.Scene, bounds?: THREE.Vector4) {
    this.bounds = bounds
    this.mapTexture = new THREE.TextureLoader().load(UrlMapHurdal)
    console.log(this.mapTexture)
    this.planeGeo = new THREE.PlaneGeometry(this.planeWidth, this.planeHeight, 100, 100)

    this.dispMapTexture = new THREE.TextureLoader().load(urlMapHurdalTopo)
    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(guiProps.cssColor),
      wireframe: guiProps.wireframe,
      map: this.mapTexture,
      displacementMap: this.dispMapTexture,
      displacementScale: guiProps.displacement,
    })

    this.mesh = new THREE.Mesh(this.planeGeo, this.material)
    this.mesh.rotation.x = -Math.PI / 2
    scene.add(this.mesh)
    scene.updateMatrixWorld()
  }

  addGui(folder: dat.GUI) {
    folder.addColor(guiProps, 'cssColor').onChange((e: THREE.ColorRepresentation) => {
      this.material.color = new THREE.Color(e)
    })
    folder.add(guiProps, 'wireframe').onChange((e: boolean) => {
      this.material.wireframe = e
    })
    folder.add(guiProps, 'displacement', 0, 350, 1).onChange((e: number) => {
      this.material.displacementScale = e
    })
  }
}

class CompassRose {
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

    svgLoader(urlRose, {
      scaleVector: new THREE.Vector3(.02, .02, .02),
      reCenter: new THREE.Vector3(0, 10, 0)
    }).then(rose => {
      this.rose = rose
      rose.name = 'rose'
      this.compass.add(rose);
      this.compass.rotation.x = guiProps.rotationX
      // TODO! Try adding `OrthographicCamera` as a wrapper around `compass`
      camera.add(this.compass);

      const padding = 3
      const distance = 10;
      // Calculate the visible height at the given distance
      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
      // Calculate the visible width at the given distance (based on the aspect ratio)
      const visibleWidth = visibleHeight * camera.aspect;
      // Set the position of the compass to the top-left of the camera's view
      const offsetX = -visibleWidth / 2 + padding; // Add any padding if needed
      const offsetY = visibleHeight / 2 - padding; // Add any padding if needed
      // Position the compass at the top-left corner
      this.compass.position.set(offsetX, offsetY, -distance);
    })
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
    folder.add(guiProps, 'rotationY', -Math.PI, Math.PI).onChange((e: number) => {
      const rose = this.compass.getObjectByName('rose')
      //@ts-ignore
      rose.rotation.y = e
    })
    folder.add(guiProps, 'rotationZ', -Math.PI, Math.PI).onChange((e: number) => {
      const rose = this.compass.getObjectByName('rose')
      //@ts-ignore
      rose.rotation.z = e
    })
    folder.add(guiProps, 'posX', -10, 10, .01).onChange((e: number) => {
      this.compass.position.x = e
    })
    folder.add(guiProps, 'posY', -10, 10, .01).onChange((e: number) => {
      this.compass.position.y = e
    })

  }
}

/**
 * MapGl Solid Component
 */

export const MapGl: Component = (props) => {

  const bearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(bearing)
  const [cameraInfo, setCameraInfo] = createSignal('-')
  const [cameraTargetInfo, setCameraTargetInfo] = createSignal('-')

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });

  /**
   * Scene, camera, light
   */
  const scene = new THREE.Scene()
  const bgLoader = new THREE.TextureLoader();
  const bgImage = bgLoader.load(urlBg);
  bgImage.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgImage
  const camera = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, VIEW.near, VIEW.far)
  const aLight = new THREE.AmbientLight(0xffffff, Math.PI)
  camera.position.set(VIEW.cameraPos.x, VIEW.cameraPos.y, VIEW.cameraPos.z);
  const controls = new MapControls(camera, renderer)
  controls.target.set(VIEW.targetPos.x, VIEW.targetPos.y, VIEW.targetPos.z);
  scene.add(
    camera,
    aLight
  ) // Makes Camera a HUD that can contain objects

  /**
   * Helpers, misc
   */
  const rayCaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const axesHelper = new THREE.AxesHelper(1e12)
  scene.add(
    axesHelper,
  )

  /**
   * Compass rose
   */
  const compass = new CompassRose(camera)
  compass.addGui(guiRose)

  /**
   *  Ground map
   */
  const groundMap = new GroundMap(scene)
  groundMap.addGui(guiGround)

  /**
   * Ainmationloop
   */
  renderer.setAnimationLoop(() => {
    // Scene
    controls.update()
    compass.animate()
    renderer.render(scene, camera)
    // Signals
    setCameraInfo(`X:${camera.position.x}, Y:${camera.position.y}, Z:${camera.position.z}`)
    setCameraTargetInfo(`Degrees:${compass.bearing}`)
  });

  /**
   * Eventhandlers
   */
  function onResize() {
    renderer.setSize(VIEW.width, VIEW.height);
    const width = parseInt(window.getComputedStyle(renderer.domElement).width)
    const height = parseInt(window.getComputedStyle(renderer.domElement).height)
    camera.aspect = width / height
    camera.updateProjectionMatrix();
  }

  function onClick(evt: MouseEvent) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (evt.clientY / window.innerHeight) * 2 + 1;
    rayCaster.setFromCamera(pointer, camera)
    const intersections = rayCaster.intersectObject(groundMap.mesh)
    if (intersections.length > 0) {
      const { face, point } = intersections[0]
      console.dir({ evt: evt.type, face, point }, { depth: null })
    }
  }

  onMount(() => {
    console.log('Mounted!')
    onResize()
    addEventListener('resize', () => {
      onResize()
    }, false)
    addEventListener('click', onClick, false);
  })

  onCleanup(() => {
    removeEventListener('resize', () => {
      onResize()
    })
  })

  return (
    <Suspense fallback="Loading...">
      {renderer.domElement}
      <div>
        <div>{cameraInfo()}</div>
        <div>{cameraTargetInfo()}</div>
        <div>{state().bearing ?? '-'}</div>
      </div>
    </Suspense>
  )
}
