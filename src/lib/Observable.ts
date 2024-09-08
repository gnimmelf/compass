export class Observable {
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