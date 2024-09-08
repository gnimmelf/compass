import { createStore } from 'solid-js/store'
import { Component, createEffect, from, onMount, Show } from 'solid-js';

import { isIOS } from './lib';

class Observable {
  #value: any
  #subscriptions: Set<(value: any) => void>

  constructor(value: any) {
    this.#value = value
    this.#subscriptions = new Set()
  }

  next(value: any) {
    this.#value = value
    this.#subscriptions.forEach((subscriber) => subscriber(this.#value));
  }

  subscribe(subscriber: (value: any) => void) {
    this.#subscriptions.add(subscriber);
    // Semi-hot stream
    subscriber(this.#value);
    return () => this.unsubscribe(subscriber)
  }

  unsubscribe(subscriber: (value: any) => void) {
    return this.#subscriptions.delete(subscriber)
  }
}

/**
 * Class Bearing
 * Returns the degree absolute to the North,
 *  - 90 for East
 *  - 180 for South
 *  - 270 for West
 * See:
 *  - https://blog.stackademic.com/building-a-compass-app-with-react-and-tailwind-css-caee725a1817
 *  - https://github.com/chunlaw/react-world-compass
 */
class Bearing extends Observable {
  #state: {
    hasSupport: boolean
    hasPermission: boolean
    bearing: number
  }
  #eventname!: keyof WindowEventMap
  #handler!: (event: DeviceOrientationEvent) => any

  constructor() {
    super({})
    this.#state = {
      hasSupport: false,
      hasPermission: !isIOS,
      bearing: 0
    }
    this.next(this.#state)

    if (isIOS) {
      this.#setIOSHandler()
    } else {
      this.#setDefaultHandler()
    }
    addEventListener(this.#eventname, this.#handler, true);
  }

  async requestPermission() {
    try {
      //@ts-ignore
      const response = await DeviceOrientationEvent.requestPermission();
      if (response === "granted") {
        this.#state.hasPermission = true
      }
    } catch {
      this.#state.hasSupport = false
    }
    this.next(this.#state)
  }

  cleanUp() {
    //@ts-ignore
    removeEventListener(this.#eventname, this.#handler, true)
  }

  #setDefaultHandler() {
    this.#eventname = "deviceorientationabsolute",
    this.#handler = (event: DeviceOrientationEvent) => {
      const { alpha, absolute } = event
      this.#state.hasSupport = absolute
      this.#state.bearing = Math.abs(alpha!);
      this.next(this.#state)
    }
  }

  #setIOSHandler() {
    this.#state.hasSupport = true
    this.#eventname = "deviceorientation"
    this.#handler = (event: DeviceOrientationEvent) => {
      //@ts-ignore
      const { webkitCompassHeading } = event
      this.#state.bearing = 360 - webkitCompassHeading;
      this.next(this.#state)
    }
  }
}

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
      <Show when={!state().hasSupport}>
        <p>Not supported!</p>
      </Show>
      <Show when={!state().hasPermission}>
        <p>Ask for permission: `bearing.requestPermission()`!</p>
      </Show>

      <Show when={state().hasSupport && state().hasPermission}>
        <h1>Compass</h1>
        <p>{Math.round(state().bearing)} degrees</p>
      </Show>

    </div>
  )
}
