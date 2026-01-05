import { ClusterMessage } from '../cluster/cluster.message';
import { TaskMessage } from '../cluster/task.message';
import logger from '../logger';

function fib(n: number) {
  if (n <= 1) return n;

  return fib(n - 1) + fib(n - 2);
}

process.on('message', (payload: ClusterMessage<number>) => {
  logger.task(`${process.pid} received ${payload.message} message`);

  const result = fib(35);

  const response = new TaskMessage<number>({
    key: payload.key,
    message: payload.message + result,
  });
  process.send(response);
  logger.task(
    `${process.pid}: sent result ${result} for message ${payload.message}`,
  );
});
// TODO: processo ainda fica enviando as mensagens, mas elas deveria ir, majoritariamente pra uma fila e somente sumirem ao serem consumidas!!!!!
