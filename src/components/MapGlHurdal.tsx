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
    // this.maxPolarAngle = (Math.PI / 2) - (Math.PI / 18)
  }
}

type MapBounds = {
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
}
class GroundMap {
  scene: THREE.Scene
  bounds: MapBounds
  planeWidth: number = 1000
  planeHeight: number = 1000

  planeGeo!: THREE.PlaneGeometry
  mapTexture!: THREE.Texture
  dispMapTexture!: THREE.Texture
  material!: THREE.MeshStandardMaterial
  mesh!: THREE.Mesh

  constructor(scene: THREE.Scene, bounds: MapBounds) {
    this.scene = scene
    this.bounds = bounds
  }

  async load() {
    const loader = new THREE.TextureLoader()
    return new Promise((resolve) => {
      loader.load(UrlMapHurdal, (mapTexture) => {
        this.mapTexture = mapTexture
        this.planeWidth = this.mapTexture.source.data.naturalWidth
        this.planeHeight = this.mapTexture.source.data.naturalHeight
        this.planeGeo = new THREE.PlaneGeometry(this.planeWidth, this.planeHeight, 100, 100)
        this.dispMapTexture = new THREE.TextureLoader().load(urlMapHurdalTopo)
        this.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(guiProps.mapColor),
          wireframe: guiProps.wireframe,
          map: this.mapTexture,
          displacementMap: this.dispMapTexture,
          displacementScale: guiProps.displacement,
        })
        this.mesh = new THREE.Mesh(this.planeGeo, this.material)
        this.mesh.rotation.x = -Math.PI / 2
        this.scene.add(this.mesh)
        this.scene.updateMatrixWorld()
        resolve(this)
      })
    })
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
    this.addPoint(x, y)
  }

  addPoint(x: number, y: number) {
    // Create a simple point (e.g., a small sphere) to represent the point of interest
    const geometry = new THREE.SphereGeometry(5, 16, 16); // A small sphere for the point
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(geometry, material);

    // Position the point based on latitude/longitude and terrain
    const ray = new THREE.Raycaster();
    const rayOrig = new THREE.Vector3(x, 100, y);
    const rayDir = new THREE.Vector3(0, -1, 0);
    ray.set(rayOrig, rayDir);
    //@ts-ignore
    const { point } = ray.intersectObject(this.mesh, true).pop()
    if (point) {
      marker.position.set(x, point.y, y);
      const axesHelper = new THREE.AxesHelper(100)
      marker.add(axesHelper)
      this.scene.add(marker);
    }
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
    })
  }

  animate() {
    // TODO Add array of markers, recalculate pos-y to always be on top of ground-mesh height
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
  // scene.add(axesHelper)
  let helper: THREE.Mesh
  const geometryHelper = new THREE.ConeGeometry(20, 100, 3);
  geometryHelper.translate(0, 50, 0);
  geometryHelper.rotateX(Math.PI / 2);
  helper = new THREE.Mesh(geometryHelper, new THREE.MeshNormalMaterial());
  scene.add(helper);

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
  groundMap.load().then(() => {
    groundMap.addLocation(60.4095405, 11.0535962)
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

  // TODO! Refactor into a class
  const ray = new THREE.Raycaster();
  const pointerPos = new THREE.Vector2();

  function onClick(evt: MouseEvent) {
    pointerPos.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointerPos.y = - (evt.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(pointerPos, camera)
    const intersections = ray.intersectObject(groundMap.mesh)
    if (intersections.length > 0) {
      const { point, face } = intersections[0]
      console.log({ face })
      groundMap.addPoint(point.x, point.z)
    }
  }

  function onPointerMove(evt: MouseEvent) {
    pointerPos.x = (evt.clientX / renderer.domElement.clientWidth) * 2 - 1;
    pointerPos.y = (evt.clientY / renderer.domElement.clientHeight) * 2 + 1;
    ray.setFromCamera(pointerPos, camera);

    // See if the ray from the camera into the world hits one of our meshes
    const intersects = ray.intersectObject(groundMap.mesh);

    const intersections = ray.intersectObject(groundMap.mesh)
    if (intersections.length > 0) {
      helper.position.set(0, 0, 0);
      helper.lookAt(intersects[0].face.normal);
      helper.position.copy(intersects[0].point);

    }

  }

  onMount(() => {
    console.log('Mounted!')
    onResize()
    addEventListener('resize', () => {
      onResize()
    }, false)
    addEventListener('click', onClick, false);
    addEventListener('click', onPointerMove, false);
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
