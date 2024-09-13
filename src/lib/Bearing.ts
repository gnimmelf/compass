
import { Observable } from "./Observable"
import { throttle } from "./utils"

export enum Status {
  Initializing = 'initializing',
  Pending = 'pending',
  Ready = 'ready',
  Unsupported = 'unsupported'
}

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
type Constructor = {
  timeoutMs?: number
  throttleMs?: number
}

export class Bearing extends Observable {
  #timeoutMs: number
  #state: {
    status: Status
    permission: PermissionStatus
    bearing?: number
  }
  #eventname?: keyof WindowEventMap
  #handler?: (event: DeviceOrientationEvent) => any

  constructor(args: Constructor = {}) {
    const { timeoutMs, throttleMs } = Object.assign(args, {
      timeoutMs: 150,
      throttleMs: 150,
    })
    super({})
    this.#timeoutMs = timeoutMs
    this.#state = {
      status: Status.Initializing,
      permission: PermissionStatus.Default,
    }

    const setBearing = throttle((bearing: number) => {
      this.#state.bearing = bearing
      this.next(this.#state)
    }, throttleMs)

    addEventListener("deviceorientationabsolute", (event: DeviceOrientationEvent) => {
      //@ts-ignore
      const { alpha, absolute, webkitCompassHeading } = event

      if (this.#state.status == Status.Initializing) {
        //@ts-ignore
        if (DeviceOrientationEvent.requestPermission) {
          // Assume we have support, but really we can't know until after premission is granted
          this.#state.status = Status.Ready
        }
        else {

          this.#state.status = absolute
            ? Status.Ready
            : Status.Unsupported
          this.#state.permission = PermissionStatus.Granted
        }
      }

      if (this.#state.permission === PermissionStatus.Granted) {
        // Set bearing
        setBearing(webkitCompassHeading || 360 - alpha!)
      } else {
        // Push new state
        this.next(this.#state)
      }
    }, true);

    this.next(this.#state)
  }

  async requestPermission() {
    this.#state.status = Status.Pending
    this.next(this.#state)

    try {
      //@ts-ignore
      this.#state.permission = await DeviceOrientationEvent.requestPermission();

      if (this.#state.permission === PermissionStatus.Granted) {
        // Wait to see if bearing has been set within reasonable time
        setTimeout(() => {
          if (this.#state.bearing === undefined) {
            this.#state.status = Status.Unsupported
          }
          else {
            this.#state.status = Status.Ready
          }
          this.next(this.#state)
        }, this.#timeoutMs)
      }
      else {
        this.#state.status = Status.Ready
        this.next(this.#state)
      }
    } catch {
      this.#state.status = Status.Unsupported
      this.next(this.#state)
    }
  }

  cleanUp() {
    //@ts-ignore
    removeEventListener(this.#eventname, this.#handler, true)
  }
}