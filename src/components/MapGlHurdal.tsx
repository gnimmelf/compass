
import {
  Component,
  onMount,
  Suspense,
  Show
} from 'solid-js';
import { createStore } from "solid-js/store";

import * as dat from 'lil-gui'
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import { MapControls } from '../lib/map-gl/MapControls'
import { CompassRose } from '../lib/map-gl/CompassRose'
import { GroundMap } from '../lib/map-gl/GroundMap'
import { MapMarkers } from '../lib/map-gl/MapMarkers';

import { stringToBool } from '../lib/utils';
import { Version } from './Version';

/**
 * LIL-GUI onChange
 */
const gui = new dat.GUI({ closeFolders: true });
const guiGround = gui.addFolder('Ground')
const guiRose = gui.addFolder('Rose')

const VIEW = {
  viewFractionX: 1,
  viewFractionY: 1,
  fov: 75,
  near: 0.1,
  far: 1e12,
  cameraDistance: 1000,
  cameraPos: new THREE.Vector3(-45, 710, 850),
  aLight: new THREE.AmbientLight(0xff00ff, Math.PI),
} as const

/**
 * MapGl Solid Component
 */
export const MapGl: Component<{
  debug: string
  bgimage: string
}> = (props) => {

  // Hide gui unless debug
  gui.show(stringToBool(props.debug))

  let containerElRef!: HTMLDivElement;
  let scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      controls: MapControls,
      groundMap: GroundMap,
      compass: CompassRose,
      mapMarkers: MapMarkers

  const [store, setStore] = createStore({
    mapTheta: 0,
    mousePos: { x: 0, y: 0 }
  })

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(window.devicePixelRatio)

  async function createScene() {
    /**
     * Scene, camera, light
     */
    scene = new THREE.Scene()
    if (props.bgimage) {
      const bgLoader = new THREE.TextureLoader();
      bgLoader.setCrossOrigin("anonymous");
      const bgImage = bgLoader.load(props.bgimage);
      bgImage.colorSpace = THREE.SRGBColorSpace;
      scene.background = bgImage

    }

    camera = new THREE.PerspectiveCamera(VIEW.fov, 1, VIEW.near, VIEW.far)
    camera.position.set(VIEW.cameraPos.x, VIEW.cameraPos.y, VIEW.cameraPos.z);
    controls = new MapControls(camera, renderer)


    scene.add(
      camera,
      VIEW.aLight
    )

    if (stringToBool(props.debug)) {
      const axesHelper = new THREE.AxesHelper(1e12)
      scene.add(axesHelper)
    }

    /**
     * Compass rose
     */
    compass = new CompassRose(camera)
    compass.addGui(guiRose)

    /**
     *  Ground map
     */
    groundMap = new GroundMap(scene, {
      minLat: 60.3172171,
      maxLat: 60.4964025,
      minLng: 10.8153705,
      maxLng: 11.093055
    })
    await groundMap.loadTextures()
    groundMap.addGui(guiGround)

    mapMarkers = new MapMarkers(renderer, scene, camera)
  }

  /**
   * Eventhandlers
   */
  function onResize() {
    const rect = containerElRef.getBoundingClientRect()
    renderer.setSize(rect.width, rect.height);

    compass.onResize()
    mapMarkers.onResize()

    camera.aspect = rect.width / rect.height
    camera.updateProjectionMatrix();
  }

  /**
   * Animationloop
   */
  function animationLoop() {
    // Scene
    controls.update()
    compass.animate()
    groundMap.animate()
    renderer.render(scene, camera)
    // Signals
    setStore({
      mapTheta: compass.bearing,
      mousePos: {
        x: mapMarkers.mouse.x,
        y: mapMarkers.mouse.y
      }
    })
  }

  onMount(async () => {
    await createScene()
    groundMap.updateGroundGeometry()
    addEventListener('resize', onResize, false)
    addEventListener('mousemove', (evt: MouseEvent) => {
      mapMarkers.setMousePos(evt)
    }, false);
    // Finally start animation-loop
    renderer.setAnimationLoop(animationLoop);
    setTimeout(() => {
      // Make sure we run the initial updates after everything is drawn
      onResize()
      addEventListener('dblclick', (evt: MouseEvent) => {
        evt.stopPropagation()
        evt.preventDefault()
        mapMarkers.setMarker(groundMap.mesh)
      }, false);
    }, 100)
  })

  return (
    <Suspense fallback="Loading...">
      <div ref={containerElRef} class="map-canvas" style="width: 100%; height: 100%;">
        {renderer.domElement}
      </div>
      <Version />
      <Show when={stringToBool(props.debug)}>
        <div style={{ 'text-align': 'left' }}>
          <div>
            Map theta: {Math.round(store.mapTheta * 100) / 100}
            Mouse.x: {Math.round(store.mousePos.x * 100) / 100}
            Mouse.y: {Math.round(store.mousePos.y * 100) / 100}
          </div>
        </div>
      </Show>
    </Suspense>
  )
}
