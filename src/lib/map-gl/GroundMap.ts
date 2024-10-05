import * as THREE from 'three'
import * as dat from 'lil-gui'

import { latLngToPosition } from '../utils';
import UrlMapHurdal from '/assets/hurdal-map.png'
import urlMapHurdalTopo from '/assets/hurdal-map-height.png'

type MapBounds = {
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
}

export const guiProps = {
  mapColor: '#ffffff',
  wireframe: false,
  displacementScale: 122,
}

/**
 * Ground Map Plane
 */
export class GroundMap {
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
    // Start loading textures
    this.mapTexture = new THREE.TextureLoader(this.manager).load(UrlMapHurdal)
    this.dispMapTexture = new THREE.TextureLoader(this.manager).load(urlMapHurdalTopo)
    this.dispMapTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.dispMapTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  async loadTextures() {
    return new Promise((resolve) => {
      this.manager.onLoad = () => {
        this.#createMesh()
        resolve(true)
      };
    })
  }

  #createMesh() {
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
      displacementScale: guiProps.displacementScale
    })

    this.mesh = new THREE.Mesh(this.planeGeometry, this.material)
    this.mesh.rotation.x = -Math.PI / 2
    this.scene.add(this.mesh)
    // Displacement
    this.updateGroundGeometry()
    this.scene.updateMatrixWorld()
  }

  updateGroundGeometry() {
    const displacementScale = this.material.displacementScale
    const displacementImage = this.dispMapTexture.image as HTMLImageElement;

    this.mesh.geometry.computeBoundingBox()
    this.mesh.geometry.computeBoundingSphere()

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
    folder.add(guiProps, 'displacementScale', 0, 350, 1).onChange((e: number) => {
      this.material.displacementScale = e
      this.updateGroundGeometry()
    })
  }

  animate() {
    // TODO! Whatever
  }
}