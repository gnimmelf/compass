import * as THREE from 'three'

export class UrlLoader {
  textureLoader = new THREE.TextureLoader()
  assets: Record<string, Promise<THREE.Texture>> = {}

  constructor(assets: Record<string, string>) {
    for (const key in assets) {
      this.loadTexture(key, assets[key])
    }
  }

  loadTexture(key: string, url: string) {
    this.assets[key] = new Promise((resolve) => {
      this.textureLoader.load(url, (texture) => {
        resolve(texture)
      })
    })
  }

  get(key: string) {
    return this.assets[key]
  }
}