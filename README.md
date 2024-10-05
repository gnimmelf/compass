# MapGlHurdal

## Coordinate Systems

- WGS84 (EPSG:4326)

    - Default for GeoJson files

    - Coordinate System: Geographic coordinate system (GCS).

    - Units: Degrees of latitude and longitude.

    - Description: WGS84 is a global standard coordinate system used by GPS. Coordinates are expressed in degrees of latitude (north/south) and longitude (east/west), which represent positions on the Earth's surface as if it were a sphere.

    - Use Case: WGS84 is typically used for storing raw geographic coordinates. It is the default in many geographic datasets and is required by standards like GeoJSON.

- Web Mercator (EPSG:3857)

    - Coordinate System: Projected coordinate system (PCS).

    - Units: Meters.

    - Description: Web Mercator projects the Earth’s surface onto a flat, two-dimensional plane using the Mercator projection. Instead of latitude and longitude, it uses x and y coordinates in meters. This projection distorts areas near the poles but preserves angles, making it useful for maps where visualizing shapes and distances (within reasonable latitudes) is more important than size accuracy.

    - Use Case: Web Mercator is commonly used in web mapping applications (e.g., Google Maps, OpenStreetMap, Bing Maps) because it allows for seamless panning and zooming.


## TODO

- [x] Get the compass on the map

    - [x] Reposition compass on window resize

    - [ ] Toggle to orientate map after device

    - [x] Toggle to orient compass after MapControls

- [ ] Figure out how to transpose webMercator/EGS84 from the segment of the map-texture used and onto the mesh

    - [ ] Get ideas from `tentone/geo-three`

    - [ ] Plot some geo-locations i Hurdal onto the map

    - [ ] Get higher fidelity on the map-texture

        - [ ] Maby this is a blocker, and we need some tiling system

            - [ ] If so, re-check using / copying from `tentone/geo-three`

- [ ] Make a skybox

# Compass

A long time dream of getting a working compass on a webpage.

Never tried it before, but I just wanted to make my own version because of the cumbersom checks.

Bearing ("absolut `alpha`" | `webkitCompassHeading`) is pushed to an observable. This observable needs to be tied into the reactive system.

If permissions are needed (iOS), make a call to `instance.requestPermissions`

## Example

```jsx
<>
    <h1>Compass</h1>

    <Show when={state().status == Status.Pending}>
        <p>Loading...</p>
    </Show>

    <Show when={state().status == Status.Unsupported}>
        <p>Not supported!</p>
    </Show>

    <Show when={state().status == Status.Ready}>

        <Show when={state().permission == PermissionStatus.Default}>
            <button onclick={() => bearing.requestPermission()}>Request permission</button>
        </Show>

        <Show when={state().premission == PermissionStatus.Denied}>
            <p>Permission denied</p>
            <button onclick={() => bearing.requestPermission()}>Request permission again</button>
        </Show>


        <Show when={state().permission == PermissionStatus.Granted}>

            <Show when={!isNaN(state().bearing)}>
                <p>{Math.round(state().bearing)} degrees</p>
            </Show>

            <Show when={isNaN(state().bearing)}>
                <p>Move the device</p>
            </Show>

        </Show>

    </Show>
</>
```

# Gotchas

1. Must be `https` connection.

# TODO

- [x] Defer / throttle the orientation events

    - [ ] Do some magic softening on the bearing value, eg defer a calculatet a mean before pushing state

- [x] Do som better checks for Safari on iOS.

    - [x] General feature detection

- [ ] Check in Firefox

- [ ] Check in iOS (+ Safari?)