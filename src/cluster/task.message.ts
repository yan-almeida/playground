import { SafeJSONParse } from '../utils/json.parse';
import { ClusterMessage } from './cluster.message';

export class TaskMessage<Content> extends ClusterMessage<Content> {
  static from<Content>(message: ClusterMessage<Content> | string): TaskMessage<Content> {
    if (typeof message === 'string') {
      return new this(SafeJSONParse(message));
    }

    return new this({ key: message.key, message: message.message });
  }
}
