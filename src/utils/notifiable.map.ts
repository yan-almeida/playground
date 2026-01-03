import { EventEmitter } from 'stream';
import logger from '../logger';

export type NotifiableMapCallback = () => void | Promise<void>;

export abstract class NotifiableMap<V> extends Map<string, V> {
  #events = new EventEmitter();

  set(key: string, value: V) {
    if (super.has(key)) {
      logger.emitter(`Key '${key}' already exists.`);
      return this;
    }

    super.set(key, value);

    const shouldNotify = this.notifyWhen();

    if (shouldNotify) {
      this.#events.emit(this.eventName);
    }

    return this;
  }

  protected abstract notifyWhen(): boolean;
  protected abstract eventName: string;

  on(callback: NotifiableMapCallback): this {
    this.#events.on(this.eventName, callback);

    return this;
  }
}
