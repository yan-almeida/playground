import ms from 'ms';
import { setTimeout } from 'timers/promises';
import { AckeableCluster } from './cluster/ackeable.cluster';
import { TaskMessage } from './cluster/task.message';
import logger from './logger';

async function* generate(): AsyncIterable<number> {
  while (true) {
    const random = Math.random();

    const number = Math.round(random * 100);

    yield setTimeout(ms('1s'), number);
    // yield number;
  }
}

const TASK_FILE = `./src/tasks/fibonacci.task.ts`;

const cluster = AckeableCluster.from<number>({
  file: TASK_FILE,
  size: 2,
  callback: async (pid, message) => {
    logger.task(`${pid}: fib ${TaskMessage.from(message)}`);

    if (Math.random() < 0.5) {
      throw new Error('Random error');
    }
  },
});

(async () => {
  for await (const data of generate()) {
    cluster.send(data);
  }
})();
