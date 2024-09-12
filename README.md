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