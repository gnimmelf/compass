import { Component, createEffect, from, Show } from 'solid-js';
import { Bearing, Status, PermissionStatus } from '../lib/Bearing';

import { Rose } from './Rose'

import { createSheet, stylesRegistry } from '../lib/styles'

const { classes } = createSheet({
  main: {
    textAlign: 'center'
  }
})

export const Compass: Component = (props) => {

  const bearing = new Bearing({
    timeoutMs: 5000
  })
  const state = from(bearing)

  createEffect(() => console.log(state()))

  return (
    <main class={classes.main}>
      <style>{stylesRegistry.toString()}</style>
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
            <Rose bearing={Math.round(state().bearing)} />
          </Show>

          <Show when={isNaN(state().bearing)}>
            <p>Move the device</p>
          </Show>

        </Show>

      </Show>
    </main>
  )
}
