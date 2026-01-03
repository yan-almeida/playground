import { NotifiableMap, NotifiableMapCallback } from './notifiable.map';

const EVENT_NAME = 'MAX_REACHED';

export class MaxNotifiableMap<V> extends NotifiableMap<V> {
  protected eventName = EVENT_NAME;

  constructor(readonly limit: number) {
    super();
  }

  protected notifyWhen(): boolean {
    return this.size >= this.limit;
  }

  whenReachMax(callback: NotifiableMapCallback): this {
    this.on(callback);
    return this;
  }
}
