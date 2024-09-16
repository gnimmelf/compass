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
import {
  Bearing,
} from '../lib/Bearing';
import { KartVerketMapProvider } from '../lib/KartverketMapProvider';

const initialPos = UnitsUtils.datumsToSpherical(59.9139, 10.7522)

const VIEW = {
  widthFraction: 1.2,
  fov: 75,
  near: 0.1,
  far: 1000,
  controlTargetPos: {
    x: initialPos.x,
    y: 0,
    z: -initialPos.y,
  },
  cameraPos: {
    x: initialPos.x,
    y: 300000,
    z: -(initialPos.y + 300000),
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

export const MapGl: Component = (props) => {

  const bearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(bearing)
  const [tileInfo, setTileInfo] = createSignal('-')

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, VIEW.near, VIEW.far)

  const controls = new OrbitControls(camera, renderer.domElement)

  const axesHelper = new THREE.AxesHelper(1e12)
    const gHelper = new THREE.GridHelper( 10, 10 );

  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const cube = new THREE.Mesh( geometry, material );

  scene.add(
    axesHelper,
    gHelper,
    cube
  )

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera)
    controls.update()
    setTileInfo(`X:${camera.position.x}, Y:${camera.position.y}, Z:${camera.position.z}`)
  });

  function onResize() {
    renderer.setSize(VIEW.width, VIEW.height);
    const width = parseInt(window.getComputedStyle(renderer.domElement).width)
    const height = parseInt(window.getComputedStyle(renderer.domElement).height)
    camera.aspect = width / height
    camera.updateProjectionMatrix();
  }

  onMount(() => {
    console.log('Mounted!')
    camera.position.set(5, 5, 5);
    onResize()
    addEventListener('resize', () => {
      onResize()
    }, false)
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
        <div>{tileInfo()}</div>
        <div>{state().bearing ?? '-'}</div>
      </div>
    </>
  )
}
