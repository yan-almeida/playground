import { Serializable } from 'node:child_process';

export class ClusterMessage<Message = Serializable> {
  __name = this.constructor.name;

  message: Message;
  key: string;

  constructor(args: Omit<ClusterMessage<Message>, typeof Symbol.toPrimitive | '__name'>) {
    this.message = args.message;
    this.key = args.key;
  }

  protected [Symbol.toPrimitive]() {
    return JSON.stringify(this);
  }
}
