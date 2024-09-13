import { Component, createEffect, from, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapView, OpenStreetMapsProvider, UnitsUtils } from 'geo-three';
import { Bearing, Status, PermissionStatus } from '../lib/Bearing';

const MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2, ROTATE: 0, DOLLY: 1, PAN: 2 };
const TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 };

const MAP_ORIGIN = UnitsUtils.datumsToSpherical(59.9139, 10.7522);
const MAP_ORIGIN_Z = 300000

class MapControls extends OrbitControls {
  screenSpacePanning: boolean
  mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number; }
  touches: { ONE: number; TWO: number }

  constructor(camera: THREE.Camera, renderer: THREE.Renderer) {
    super(camera, renderer.domElement);
    this.screenSpacePanning = false;
    this.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    this.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };

    this.maxDistance = MAP_ORIGIN_Z * 3
    this.minDistance = 1e1;
    this.zoomSpeed = 2.0;

    this.target.set(MAP_ORIGIN.x, 0, -MAP_ORIGIN.y);
  }
}


class Scene extends THREE.Scene {

  renderer: THREE.Renderer
  camera: Camera

  constructor(renderer: THREE.Renderer, camera: Camera) {
    super()
    this.renderer = renderer
    this.camera = camera
  }

  render() {
    this.renderer.render(this, this.camera)
  }

  onResize() {
    this.renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
    const width = parseInt(window.getComputedStyle(this.renderer.domElement).width)
    const height = parseInt(window.getComputedStyle(this.renderer.domElement).height)
    this.camera.setAspect(width, height)
  }
}

class Camera extends THREE.PerspectiveCamera {
  static fieldOfView = 70
  static aspectRatio = window.innerWidth / window.innerHeight
  static near = 0.1
  static far = 1e12

  constructor() {
    super(Camera.fieldOfView, Camera.aspectRatio, Camera.near, Camera.far)
    this.position.set(MAP_ORIGIN.x, MAP_ORIGIN_Z, -MAP_ORIGIN.y+300000);

  }

  setAspect(width: number, height: number) {
    this.aspect = width / height
    this.updateProjectionMatrix();
  }
}

export const MapGl: Component = (props) => {

  const bearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(bearing)

  createEffect(() => console.log(state()))

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  const camera = new Camera()
  const scene = new Scene(renderer, camera);
  const provider = new OpenStreetMapsProvider();
  const map = new MapView(MapView.PLANAR, provider);
  scene.add(map);
  map.updateMatrixWorld(true);

  const controls = new MapControls(camera, renderer);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera)
  });

  onMount(() => {
    scene.onResize()
    addEventListener('resize', () => {
      scene.onResize()
    }, false)
  })

  onCleanup(() => {
    removeEventListener('resize', () => {
      scene.onResize()
    })
  })

  return (
    <>
      {renderer.domElement}
    </>
  )
}
