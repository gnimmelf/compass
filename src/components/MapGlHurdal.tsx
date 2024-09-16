/**
 * IMPORTANT!
 *
 * Geo-Three vs Three-Geo
 *
 * This is three-geo
 * https://github.com/w3reality/three-geo
 *
 */

import { Component, createSignal, from, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DebugProvider,
  MapView,
  OpenStreetMapsProvider,
  UnitsUtils
} from 'geo-three';
import * as dat from 'lil-gui'
import {
  Bearing,
} from '../lib/Bearing';
import { KartVerketMapProvider } from '../lib/KartverketMapProvider';
import hurdalMap from '../assets/hurdal-map.png'
import hurdalMapHeight from '../assets/hurdal-map-height.png'

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

    this.minDistance = 1e1;
    this.zoomSpeed = 2.0;
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
    antialias: true
  });

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, VIEW.near, VIEW.far)
  camera.position.set(VIEW.cameraPos.x, VIEW.cameraPos.y, VIEW.cameraPos.z);
  console.log(camera.zoom)


  const rayCaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const controls = new MapControls(camera, renderer)
  controls.target.set(VIEW.targetPos.x, VIEW.targetPos.y, VIEW.targetPos.z);

  const axesHelper = new THREE.AxesHelper(1e12)
  const aLight = new THREE.AmbientLight(0xffffff, Math.PI)

  scene.add(
    axesHelper,
    aLight,
  )

  // Displacement map

  const guiProps = {
    cssColor: '#ff00ff',
    wireframe: false,
    rotation: -Math.PI / 2,
    axisPos: 0,
    displacement: 122
  }

  const groundGeo = new THREE.PlaneGeometry(1000, 1000, 100, 100)

  const mapTexture = new THREE.TextureLoader().load(hurdalMap)
  const dispMapTexture = new THREE.TextureLoader().load(hurdalMapHeight)

  const groundMat = new THREE.MeshStandardMaterial({
    // color: 0xbbff00,
    wireframe: guiProps.wireframe,
    map: mapTexture,
    displacementMap: dispMapTexture,
    displacementScale: guiProps.displacement,
  })

  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = guiProps.rotation
  groundMesh.position.z = guiProps.axisPos
  scene.add(groundMesh)

  scene.updateMatrixWorld()

  // lil-gui

  const gui = new dat.GUI();
  gui.addColor(guiProps, 'cssColor').onChange((e: THREE.ColorRepresentation) => {
    groundMat.color = new THREE.Color(e)
  })
  gui.add(guiProps, 'wireframe').onChange((e: boolean) => {
    groundMat.wireframe = e
  })
  gui.add(guiProps, 'rotation', -Math.PI, Math.PI)
    .onChange((e: number) => {
      groundMesh.rotation.x = e
    })
  gui.add(guiProps, 'axisPos', -100, 100, 1).onChange((e: number) => {
    groundMesh.position.y = e
  })
  gui.add(guiProps, 'displacement', 0, 350, 1).onChange((e: number) => {
    groundMat.displacementScale = e
  })

  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
    setCameraInfo(`X:${camera.position.x}, Y:${camera.position.y}, Z:${camera.position.z}`)
    // setCameraTargetInfo(`X:${cameraTargetVec2.x}, Y:${cameraTargetVec2.y}`)
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
    <>
      {renderer.domElement}
      <div>
        <div>{cameraInfo()}</div>
        <div>{cameraTargetInfo()}</div>
        <div>{state().bearing ?? '-'}</div>
        <img src={hurdalMapHeight} />
      </div>
    </>
  )
}
