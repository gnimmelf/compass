import { customElement, hot } from 'solid-element';
import { Compass } from "./components/Compass.jsx"
import { MapGl } from './components/MapGlHurdal.jsx';

declare global {
    const __APP_VERSION__: string;
}

customElement("my-compass", Compass);
customElement("my-map-gl", {
    debug: "0",
    bgimage: ""
}, MapGl);


