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

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, VIEW.near, VIEW.far)
  scene.add(camera) // Makes Camera a HUD that can contain objects
  camera.position.set(VIEW.cameraPos.x, VIEW.cameraPos.y, VIEW.cameraPos.z);

  const rayCaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const controls = new MapControls(camera, renderer)
  controls.target.set(VIEW.targetPos.x, VIEW.targetPos.y, VIEW.targetPos.z);

  const axesHelper = new THREE.AxesHelper(1e12)
  const aLight = new THREE.AmbientLight(0xffffff, Math.PI)

  /**
   * Compass rose
   */

  const compass = new THREE.Group();
  svgLoader(urlRose, {
    scaleVector: new THREE.Vector3(.02, .02, .02),
    reCenter: new THREE.Vector3(0,10,0)
  }).then(rose => {
    rose.name = 'rose'
    compass.add(rose);
    compass.rotation.x = guiProps.rotationX
    camera.add(compass);

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
    compass.position.set(offsetX, offsetY, -distance);
  })

  scene.add(
    axesHelper,
    aLight,
  )

  /**
   *  Displacement map
   */
  const groundGeo = new THREE.PlaneGeometry(1000, 1000, 100, 100)

  const mapTexture = new THREE.TextureLoader().load(UrlMapHurdal)
  const dispMapTexture = new THREE.TextureLoader().load(urlMapHurdalTopo)

  const groundMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(guiProps.cssColor),
    wireframe: guiProps.wireframe,
    map: mapTexture,
    displacementMap: dispMapTexture,
    displacementScale: guiProps.displacement,
  })

  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  scene.add(groundMesh)

  scene.updateMatrixWorld()

  // LIL-GUI onChange
  const gui = new dat.GUI();
  const guiScene = gui.addFolder('Scene')
  const guiRose = gui.addFolder('Rose')

  guiScene.addColor(guiProps, 'cssColor').onChange((e: THREE.ColorRepresentation) => {
    groundMat.color = new THREE.Color(e)
  })
  guiScene.add(guiProps, 'wireframe').onChange((e: boolean) => {
    groundMat.wireframe = e
  })
  guiScene.add(guiProps, 'displacement', 0, 350, 1).onChange((e: number) => {
    groundMat.displacementScale = e
  })
  guiRose.add(guiProps, 'rotationX', -Math.PI, Math.PI).onChange((e: number) => {
    const rose = compass.getObjectByName('rose')
    //@ts-ignore
    rose.rotation.x = e
  })
  guiRose.add(guiProps, 'rotationY', -Math.PI, Math.PI).onChange((e: number) => {
    const rose = compass.getObjectByName('rose')
    //@ts-ignore
    rose.rotation.y = e
  })
  guiRose.add(guiProps, 'rotationZ', -Math.PI, Math.PI).onChange((e: number) => {
    const rose = compass.getObjectByName('rose')
    //@ts-ignore
    rose.rotation.z = e
  })
  guiRose.add(guiProps, 'posX', -10, 10, .01).onChange((e: number) => {
    compass.position.x = e
  })
  guiRose.add(guiProps, 'posY', -10, 10, .01).onChange((e: number) => {
    compass.position.y = e
  })

  var dir = new THREE.Vector3();
  var sph = new THREE.Spherical();
  var roseDirection = new THREE.Vector3(0,0,1);
  renderer.setAnimationLoop(() => {
    // Scene
    controls.update()
    camera.getWorldDirection(dir);
    sph.setFromVector3(dir);
    compass.getObjectByName('rose')?.setRotationFromAxisAngle(roseDirection, Math.PI - sph.theta)
    renderer.render(scene, camera)
    // Signals
    setCameraInfo(`X:${camera.position.x}, Y:${camera.position.y}, Z:${camera.position.z}`)
    setCameraTargetInfo(`Degrees:${sph.theta}`)
  });

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
    const intersections = rayCaster.intersectObject(groundMesh)
    if (intersections.length > 0) {
      console.log(intersections[0])
      console.log(camera)
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
