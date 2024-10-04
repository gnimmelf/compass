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

import { latLngToPosition } from '../lib/utils';
import { Bearing } from '../lib/Bearing';
import { loadSvg3d } from '../lib/svg';
import UrlMapHurdal from '../assets/hurdal-map.png'
import urlMapHurdalTopo from '../assets/hurdal-map-height.png'
import urlRose from '../assets/compass-rose.svg'
import urlBg from '../assets/sky.jpeg'

console.log('maxTextureSize:', WebGL2RenderingContext.MAX_TEXTURE_SIZE)

const guiProps = {
  mapColor: '#fd8181',
  wireframe: true,
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
  viewFractionX: .9,
  viewFractionY: .8,
  fov: 75,
  near: 0.1,
  far: 1e12,
  cameraDistance: 1000,
  cameraPos: new THREE.Vector3(-45, 710, 850),
  aLight: new THREE.AmbientLight(0xffffff, Math.PI),
  get width() {
    return window.innerWidth * VIEW.viewFractionX
  },
  get height() {
    return window.innerHeight  * VIEW.viewFractionY
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

/**
 * Ground Map Plane
 */
type MapBounds = {
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
}
class GroundMap {
  manager: THREE.LoadingManager
  scene: THREE.Scene
  bounds: MapBounds

  planeGeoWidth = 1000
  planeGeoSegX = 50 // Increase to match diplacement better with texture

  planeGeometry!: THREE.PlaneGeometry
  mapTexture!: THREE.Texture
  dispMapTexture!: THREE.Texture
  material!: THREE.MeshStandardMaterial
  mesh!: THREE.Mesh

  constructor(scene: THREE.Scene, bounds: MapBounds) {
    this.manager = new THREE.LoadingManager()
    this.scene = scene
    this.bounds = bounds
    // Set up loadingManager.
    this.manager.onLoad = () => {
      this.#createMesh()
    };
    // Start loading textures
    this.mapTexture = new THREE.TextureLoader(this.manager).load(UrlMapHurdal)
    this.dispMapTexture = new THREE.TextureLoader(this.manager).load(urlMapHurdalTopo)
    this.dispMapTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.dispMapTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  async #createMesh() {
    const displacementImage = this.dispMapTexture.image as HTMLImageElement;
    const planeGeoHeight = this.planeGeoWidth / displacementImage.width * displacementImage.height
    const planeGeoSegY = Math.floor(this.planeGeoSegX / displacementImage.width * displacementImage.height)

    console.log('Segs', this.planeGeoSegX, planeGeoSegY, Math.round(this.planeGeoSegX / planeGeoSegY * 100) / 100)
    console.log('Dims', this.planeGeoWidth, planeGeoHeight, Math.round(displacementImage.width / displacementImage.height * 100) / 100)

    this.planeGeometry = new THREE.PlaneGeometry(
      this.planeGeoWidth,
      planeGeoHeight,
      this.planeGeoSegX,
      planeGeoSegY
    )

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(guiProps.mapColor),
      wireframe: guiProps.wireframe,
      map: this.mapTexture,
    })
    this.mesh = new THREE.Mesh(this.planeGeometry, this.material)
    this.mesh.rotation.x = -Math.PI / 2
    this.scene.add(this.mesh)
    // Displacement
    this.updateGroundGeometry(guiProps.displacement)
    this.scene.updateMatrixWorld()
  }

  updateGroundGeometry(displacementScale: number) {
    const displacementImage = this.dispMapTexture.image as HTMLImageElement;

    const canvas = document.createElement('canvas');
    canvas.width = displacementImage.width;
    canvas.height = displacementImage.height;

    const ctx2d = canvas.getContext('2d', {
      willReadFrequently: true
    }) as CanvasRenderingContext2D;
    ctx2d.drawImage(displacementImage, 0, 0);

    // Account for one extra vertex per segment dimension, that e.g. a length of 2 segments have 3 vertices
    const maxVertX = (this.planeGeometry.parameters.widthSegments + 1) as number;
    const maxVertY = (this.planeGeometry.parameters.heightSegments + 1) as number;

    const pixelsPerVertX = Math.round(displacementImage.width / maxVertX)
    const pixelsPerVertY = Math.round(displacementImage.height / maxVertY)

    // Account for zero-based indexing of the pixels (Needed?)
    const maxPixelX = displacementImage.width - 1;
    const maxPixelY = displacementImage.height - 1;

    // Loop through the geometry vertices and update Z-coordinate based on displacement map pixel data
    let imgData: ImageData
    let displacementVal, vertIdx: number
    const position = this.planeGeometry.getAttribute('position')
    for (let vertX = 0; vertX < maxVertX; vertX++) {
      for (let vertY = 0; vertY < maxVertY; vertY++) {
        const pixelX = Math.min(Math.round(vertX * pixelsPerVertX), maxPixelX)
        const pixelY = Math.min(Math.round(vertY * pixelsPerVertY), maxPixelY)

        imgData = ctx2d.getImageData(pixelX, pixelY, 1, 1)
        displacementVal = Math.round(imgData.data[0] / 255.0 * displacementScale)
        // Count number of X-rows and add index of current X-row
        vertIdx = (maxVertX * vertY) + vertX
        position.setZ(vertIdx, displacementVal);
      }
    }
    this.planeGeometry.attributes.position.needsUpdate = true;
    this.planeGeometry.computeVertexNormals();
    console.log('Updated geometry', displacementScale)
  }

  addLocation(lat: number, long: number) {
    const { x, y } = latLngToPosition(
      lat,
      long,
      this.bounds.minLat,
      this.bounds.maxLat,
      this.bounds.minLng,
      this.bounds.maxLng,
      this.planeWidth,
      this.planeHeight
    );
    // TODO! Intersect height and add marker
  }

  addGui(folder: dat.GUI) {
    folder.addColor(guiProps, 'mapColor').onChange((e: THREE.ColorRepresentation) => {
      this.material.color = new THREE.Color(e)
    })
    folder.add(guiProps, 'wireframe').onChange((e: boolean) => {
      this.material.wireframe = e
    })
    folder.add(guiProps, 'displacement', 0, 350, 1).onChange((e: number) => {
      this.material.displacementScale = e
      this.mesh.geometry.computeBoundingBox()
      this.mesh.geometry.computeBoundingSphere()
      this.updateGroundGeometry(e)
    })
  }

  animate() {
    // TODO! Whatever
  }
}


/**
 * Compass and Rose
 */
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
      // TODO! Try adding `OrthographicCamera` as a wrapper around `compass`
      camera.add(this.compass);

      const padding = 3
      const distance = 10;
      // Calculate the visible height at the given distance
      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
      // Calculate the visible width at the given distance (based on the aspect ratio)
      const visibleWidth = visibleHeight * camera.aspect;
      // Set the position of the compass to the top-left of the camera's view
      const pixelsPerVertX = -visibleWidth / 2 + padding; // Add any padding if needed
      const pixelsPerVertY = visibleHeight / 2 - padding; // Add any padding if needed
      // Position the compass at the top-left corner
      this.compass.position.set(pixelsPerVertX, pixelsPerVertY, -distance);
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

  const deviceBearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(deviceBearing)
  const [store, setStore] = createStore({
    mapTheta: 0,
    mousePos: { x: 0, y: 0}
  })
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(window.devicePixelRatio)

  /**
   * Scene, camera, light
   */
  const scene = new THREE.Scene()
  const bgLoader = new THREE.TextureLoader();
  const bgImage = bgLoader.load(urlBg);
  bgImage.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgImage
  const camera = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, VIEW.near, VIEW.far)
  camera.position.set(VIEW.cameraPos.x, VIEW.cameraPos.y, VIEW.cameraPos.z);
  const controls = new MapControls(camera, renderer)
  scene.add(
    camera,
    VIEW.aLight
  )

  /**
   * Helpers, misc
   */
  const axesHelper = new THREE.AxesHelper(1e12)
  scene.add(axesHelper)

  /**
   * Compass rose
   */
  const compass = new CompassRose(camera)
  compass.addGui(guiRose)

  /**
   *  Ground map
   */
  const groundMap = new GroundMap(scene, {
    minLat: 60.3172171,
    maxLat: 60.4964025,
    minLng: 10.8153705,
    maxLng: 11.093055
  })
  groundMap.addGui(guiGround)

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

  // TODO! Refactor into a class
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  // Create a simple marker (e.g., a small sphere)
  const markerGeometry = new THREE.SphereGeometry(10, 16, 16);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.visible = false;  // Initially hidden
  scene.add(marker);

  function setMarker(evt: MouseEvent) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundMap.mesh, false)
    if (intersects.length > 0) {
      // Set marker position the intersection point and make it visible
      marker.position.copy(intersects[0].point);
      marker.visible = true;
    }
  }

  function setMousePos(evt: MouseEvent) {
    // Normalize mouse position to [-1, 1]
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ( ( evt.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1
    mouse.y = - ( ( evt.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1
    setStore('mousePos', { x: mouse.x, y: mouse.y })
  }

  /**
   * Ainmationloop
   */
  renderer.setAnimationLoop(() => {
    // Scene
    controls.update()
    compass.animate()
    groundMap.animate()
    renderer.render(scene, camera)
    // Signals
    setStore({
      mapTheta: compass.bearing
    })
  });


  onMount(() => {
    console.log('Mounted!')
    onResize()
    addEventListener('resize', onResize, false)
    addEventListener('dblclick', (evt: MouseEvent) => {
      evt.stopPropagation()
      setMarker(evt)
    }, false);
    addEventListener('mousemove', setMousePos, false);
  })

  onCleanup(() => {
    removeEventListener('resize', () => {
      onResize()
    })
  })

  return (
    <Suspense fallback="Loading...">
      {renderer.domElement}
      <div style={{ 'text-align': 'left' }}>
        <pre>{JSON.stringify(store.mousePos, null, 2)}</pre>
        <div>Map theta: {Math.round(store.mapTheta * 100) / 100}</div>
        <div>Device bearing: {state().bearing ?? '-'}</div>
      </div>
    </Suspense>
  )
}
