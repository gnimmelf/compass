import { customElement, hot } from 'solid-element';
import { Compass } from "./components/Compass.jsx"
import { Gyro } from "./components/Gyro.jsx";
// import { MapGl } from './components/MapGlTentone.jsx';
// import { MapGl } from './components/MapGlTest.jsx'
// import { MapGl } from './components/MapGl.jsx'
import { MapGl } from './components/MapGlHurdal.jsx';

customElement("my-compass", Compass);
customElement("my-map-gl", MapGl);
customElement("my-gyro", Gyro);

