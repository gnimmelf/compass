/**
 * IMPORTANT!
 *
 * Geo-Three vs Three-Geo
 *
 * This is geo-three
 * https://github.com/tentone/geo-three
 *
 */

import { Component, createEffect, createSignal, from, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DebugProvider,
  MapTilerProvider,
  MapView,
  OpenStreetMapsProvider,
  UnitsUtils
} from 'geo-three';
import { KartVerketMapProvider } from '../lib/KartverketMapProvider';
import {
  Bearing,
} from '../lib/Bearing';

const initialPos = UnitsUtils.datumsToSpherical(59.9139, 10.7522)
const cameraOffset = 300000

const VIEW = {
  widthFraction: 1.2,
  fov: 75,
  near: 0.1,
  far: 1e12,
  controlTargetPos: {
    x: initialPos.x,
    y: 0,
    z: -initialPos.y,
  },
  cameraPos: {
    x: initialPos.x,
    y: cameraOffset,
    z: -(initialPos.y - cameraOffset),
  },
  get width() {
    return window.innerWidth / VIEW.widthFraction
  },
  get height() {
    return window.innerHeight / VIEW.widthFraction
  },
  get aspect() {
    return VIEW.width / VIEW.height
  }
} as const

const provider = ({
  debug: {
    mapNodeType: MapView.PLANAR,
    provider: new DebugProvider()
  },
  openStreetMaps: {
    mapNodeType: MapView.PLANAR,
    provider: new OpenStreetMapsProvider()
  },
  mapTiler: {
    mapNodeType: MapView.PLANAR,
    provider: new MapTilerProvider('YNFgrZRjeDjcbOMKxgzA', 'maps', 'backdrop', 'png')
  },
  kartverket: {
    mapNodeType: MapView.PLANAR,
    provider: new KartVerketMapProvider()
  }
} as const).mapTiler



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

    this.minDistance = 1e1;
    this.zoomSpeed = 2.0;
    this.minPolarAngle = 0;
    this.maxPolarAngle = (Math.PI / 2) - (Math.PI / 18)

    this.target.set(
      VIEW.controlTargetPos.x,
      VIEW.controlTargetPos.y,
      VIEW.controlTargetPos.z,
    );
  }
}

class Map extends MapView {
  controls: MapControls

  constructor(camera: THREE.Camera, renderer: THREE.Renderer) {
    super(provider.mapNodeType, provider.provider)

    this.controls = new MapControls(camera, renderer)
    this.cacheTiles = false
  }
}

class Scene extends THREE.Scene {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera

  constructor() {
    super()
    this.background = new THREE.Color(0.4, 0.4, 0.4);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.camera = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, VIEW.near, VIEW.far)
    this.camera.position.set(
      VIEW.cameraPos.x,
      VIEW.cameraPos.y,
      VIEW.cameraPos.z,
    );
  }

  render() {
    this.renderer.render(this, this.camera)
  }

  onResize() {
    this.renderer.setSize(VIEW.width, VIEW.height);
    const width = parseInt(window.getComputedStyle(this.renderer.domElement).width)
    const height = parseInt(window.getComputedStyle(this.renderer.domElement).height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix();
  }
}

/**
 * SolidJs Component
 * @param props
 * @returns
 */
export const MapGl: Component = (props) => {

  const bearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(bearing)

  createEffect(() => console.log(state()))

  const [info, setInfo] = createSignal('-')

  // World setup
  const scene = new Scene();

  const axesHelper = new THREE.AxesHelper(1e12)
  scene.add(axesHelper);

  const map = new Map(scene.camera, scene.renderer)
  scene.add(map);
  map.updateMatrixWorld(true);

  // World setup

  scene.renderer.setAnimationLoop(() => {
    map.controls.update();
    scene.render()
    const cameraFocusPos = UnitsUtils.sphericalToDatums(scene.camera.position.x, scene.camera.position.y)
    setInfo(`lat:${cameraFocusPos.latitude}, long:${cameraFocusPos.longitude}`)
  });

  function onResize() {
    scene.onResize()
  }

  onMount(() => {
    scene.onResize()
    addEventListener('resize', onResize, false)
    console.log({ scene })
  })

  onCleanup(() => {
    removeEventListener('resize', onResize)
  })

  return (
    <>
      {scene.renderer.domElement}
      <div>
        <div>{info()}</div>
      </div>
    </>
  )
}
