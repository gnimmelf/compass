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
  mapColor: '#ffffff',
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
  cameraDistance: 1000,
  cameraPos: new THREE.Vector3(-45, 710, 850),
  aLight: new THREE.AmbientLight(0xffffff, Math.PI),
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
    this.mapTexture = new THREE.TextureLoader(this.manager).load(UrlMapHurdal),
    this.dispMapTexture = new THREE.TextureLoader(this.manager).load(urlMapHurdalTopo)
    this.dispMapTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.dispMapTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  async #createMesh() {
    const displacementImage = this.dispMapTexture.image as HTMLImageElement;
    this.planeGeometry = new THREE.PlaneGeometry(
      displacementImage.width,
      displacementImage.height,
      displacementImage.width,
      displacementImage.height
    )

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(guiProps.mapColor),
      wireframe: guiProps.wireframe,
      map: this.mapTexture,
      displacementScale: guiProps.displacement,
    })
    this.mesh = new THREE.Mesh(this.planeGeometry, this.material)
    this.mesh.rotation.x = -Math.PI / 2
    this.scene.add(this.mesh)
    this.updateGroundGeometry(this.material.displacementScale)
    this.scene.updateMatrixWorld()
  }

  updateGroundGeometry(displacementScale: number) {
    const displacementImage = this.dispMapTexture.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    const ctx2d = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas.width = displacementImage.width;
    canvas.height = displacementImage.height;
    ctx2d.drawImage(displacementImage, 0, 0);
    const displacementData = ctx2d.getImageData(0, 0, displacementImage.width, displacementImage.height).data;

    const vertices = this.planeGeometry.attributes.position.array;
    const widthSegments = (this.planeGeometry.parameters.widthSegments + 1) as number;
    const heightSegments = (this.planeGeometry.parameters.heightSegments + 1) as number;

    const maxPixelX = displacementImage.width - 1;
    const maxPixelY = displacementImage.height - 1;

    // Loop through the vertices and update Z-coordinate based on displacement map pixel data
    for (let i = 0; i < vertices.length; i += 3) {
      /*
      TODO! Implement pixel sampling
      For example, if your displacement map is 512x512 pixels and your geometry has 100 segments,
      you'll need to scale the access of pixels accordingly to avoid out-of-bounds or incorrect sampling:
        ```
        const pixelX = Math.floor(x / widthSegments * displacementImage.width);
        const pixelY = Math.floor(y / heightSegments * displacementImage.height);
        ```
      This ensures that the x and y vertex coordinates properly map to the displacement map's pixel coordinates.
      */

      // Remove out-of-Bounds Pixel Access by limiting the pixel sampling to size of the displacement-image
      const x = Math.min(Math.floor((i / 3) % (widthSegments)), maxPixelX)
      const y = Math.min(Math.floor(i / 3 / (widthSegments)), maxPixelY)

      const pixelIndex = 4 * (y * displacementImage.width + x); // 4 values for RGBA
      const pixelValue = displacementData[pixelIndex] / 255; // Normalize

      // Modify Z coordinate based on the displacement map pixel value
      vertices[i + 2] = pixelValue * displacementScale;
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

  const deviceBearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(deviceBearing)
  const [store, setStore] = createStore({
    mapTheta: 0,
    mousePos: new THREE.Vector3(0, 0, 0)
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
    // Normalize mouse position to [-1, 1]
    mouse.x = (evt.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(evt.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundMap.mesh)
    if (intersects.length > 0) {
      // Set marker position the intersection point and make it visible
      marker.position.copy(intersects[0].point);
      marker.visible = true;
    }
  }

  onMount(() => {
    console.log('Mounted!')
    onResize()
    addEventListener('resize', onResize, false)
    addEventListener('dblclick', setMarker, false);
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
        <pre>{JSON.stringify(store.clickData, null, 2)}</pre>
        <div>Map theta: {Math.round(store.mapTheta * 100) / 100}</div>
        <div>Device bearing: {state().bearing ?? '-'}</div>
      </div>
    </Suspense>
  )
}
