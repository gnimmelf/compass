import { MapProvider } from "geo-three";

export class KartVerketMapProvider extends MapProvider {
    // Old: https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}
    public address: string;
    public layer = 'topo'
    public version = '1.0.0'
    public format: string;

    public constructor(address: string = 'https://cache.kartverket.no/v1/wmts',) {
      super();
      this.address = address;
      this.format = 'png';
      this.maxZoom = 19;
    }

    public fetchTile(zoom: number, x: number, y: number): Promise<any> {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = document.createElement('img');

        image.onload = () => {
          resolve(image);
        };

        image.onerror = () => {
          reject();
        };
        image.crossOrigin = 'Anonymous';
        image.src = `${this.address}/${this.version}/${this.layer}/default/webmercator/${zoom}/${x}/${y}.png`;
      });
    }
  }