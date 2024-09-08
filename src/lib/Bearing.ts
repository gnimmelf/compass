
import { Observable } from "./Observable"
import { throttle } from "./utils"

export enum PermissionStatus {
  Granted = 'granted',
  Denied = 'denied',
  Default = 'default',
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
export class Bearing extends Observable {
  #state: {
    hasSupport: boolean
    permission: PermissionStatus
    pending: boolean
    bearing?: number
  }
  #eventname?: keyof WindowEventMap
  #handler?: (event: DeviceOrientationEvent) => any

  constructor() {
    super({})
    this.#state = {
      pending: true,
      hasSupport: false,
      permission: PermissionStatus.Default,
    }

    let setupCompleted = false
    addEventListener("deviceorientationabsolute", throttle((event: DeviceOrientationEvent) => {
      //@ts-ignore
      const { alpha, absolute, webkitCompassHeading } = event

      if (!setupCompleted) {
        //@ts-ignore
        if (DeviceOrientationEvent.requestPermission) {
          this.#state.hasSupport = true
        }
        else {
          this.#state.pending = false
          this.#state.hasSupport = absolute
          this.#state.permission = PermissionStatus.Granted
        }
        setupCompleted = true
      }
      else if (setupCompleted && this.#state.permission === PermissionStatus.Granted) {
        // Set bearing
        this.#state.bearing = webkitCompassHeading || alpha
      }

      this.next(this.#state)
    }, 100), true);

    this.next(this.#state)
  }

  async requestPermission() {
    try {
      //@ts-ignore
      this.#state.permission = await DeviceOrientationEvent.requestPermission();
    } catch {
      this.#state.hasSupport = false
    }
    this.#state.pending = false
    this.next(this.#state)
  }

  cleanUp() {
    //@ts-ignore
    removeEventListener(this.#eventname, this.#handler, true)
  }
}