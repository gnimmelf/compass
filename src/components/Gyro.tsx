import { Component, createEffect, from, onCleanup, onMount, Show } from 'solid-js';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';

import roseUrl from "../assets/compass-rose.svg"

class Scene extends THREE.Scene {
    _renderer: THREE.Renderer
    _camera: Camera

    constructor(renderer: THREE.Renderer, camera: Camera) {
        super()
        this._renderer = renderer
        this._camera = camera
    }

    render() {
        this._renderer.render(this, this._camera)
    }

    onResize() {
        this._renderer.setSize(window.innerWidth / 3, window.innerHeight / 3);
        const width = parseInt(window.getComputedStyle(this._renderer.domElement).width)
        const height = parseInt(window.getComputedStyle(this._renderer.domElement).height)
        this._camera.setAspect(width, height)
    }
}

class Camera extends THREE.PerspectiveCamera {
    static fieldOfView = 50
    static aspectRatio = window.innerWidth / window.innerHeight
    static near = 0.1
    static far = 1000

    constructor() {
        super(Camera.fieldOfView, 1, Camera.near, Camera.far)
        this.position.set(0, 3, 10);
    }

    setAspect(width: number, height: number) {
        this.aspect = width / height
        this.updateProjectionMatrix();
    }
}

class Cube extends THREE.Mesh {
    constructor() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
        super(geometry, material)
    }

    animate() {
        this.rotation.x += 0.01;
        this.rotation.y += 0.01;
    }
}

const loadSvg = () => {
    const loader = new SVGLoader();
	loader.load( roseUrl, (data) => {

    })
}

export const Gyro: Component<{
    bearing: number
}> = (props) => {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
    });
    renderer.setPixelRatio(window.devicePixelRatio);

    const camera = new Camera();
    const scene = new Scene(renderer, camera);

    var grid = new THREE.GridHelper(6, 6, "aqua", "gray");
    scene.add(grid);

    const cube = new Cube()
    scene.add(cube);

    renderer.setAnimationLoop(() => {
        cube.animate()
        scene.render()
    });

    onMount(() => {
        loadSvg()
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