import { Component, createEffect, from, Show } from 'solid-js';

import { Bearing, PermissionStatus } from './lib/Bearing';


/**
 * Compass
 * @param props
 * @returns
 */
export const Compass: Component = (props) => {

  const bearing = new Bearing()
  const state = from(bearing)

  createEffect(() => console.log(state()))

  return (
    <div>
      <h1>Compass</h1>
      <Show when={!state().pending}>

        <Show when={!state().hasSupport}>
          <p>Not supported!</p>
        </Show>

        <Show when={state().bearing}>
          <p>{Math.round(state().bearing)} degrees</p>
        </Show>

      </Show>

      <Show when={state().hasSupport && state().permission === PermissionStatus.Default}>
          <p>Ask for permission: `bearing.requestPermission()`!</p>
        </Show>
    </div>
  )
}
