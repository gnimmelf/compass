import { customElement, hot } from 'solid-element';
import { Compass } from "./components/Compass.jsx"

declare global {
    const __APP_VERSION__: string;
}

customElement("my-compass", Compass);



