import { SafeJSONParse } from '../utils/json.parse';
import { ClusterMessage } from './cluster.message';
import { RetryState } from './retry-strategy';

export class TaskMessage<Content> extends ClusterMessage<Content> {
  static from<Content>(
    message: ClusterMessage<Content> | string,
  ): TaskMessage<Content> {
    if (typeof message === 'string') {
      return new this(SafeJSONParse(message));
    }

    return new this({ key: message.key, message: message.message });
  }
}

export class RetryableTaskMessage<Content> extends ClusterMessage<Content> {
  state: Readonly<RetryState>;

  constructor(
    args: Omit<
      RetryableTaskMessage<Content>,
      typeof Symbol.toPrimitive | 'instanceof' | '__name'
    >,
  ) {
    super(args);
    this.state = args.state;
  }
}
