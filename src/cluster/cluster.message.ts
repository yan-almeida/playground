import { Serializable } from 'node:child_process';

export class ClusterMessage<Message = Serializable> {
  __name: Readonly<string> = this.constructor.name;

  message: Message;
  key: string;

  constructor(
    args: Omit<
      ClusterMessage<Message>,
      typeof Symbol.toPrimitive | 'instanceof' | '__name'
    >,
  ) {
    this.message = args.message;
    this.key = args.key;
  }

  protected [Symbol.toPrimitive]() {
    return JSON.stringify(this);
  }

  static instanceof<Message = any>(args: any): args is ClusterMessage<Message> {
    return !!args.__name || args instanceof ClusterMessage;
  }
}
