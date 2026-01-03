import logger from './logger';

export const roundRobin = <Collection>(collection: Collection[], index = 0) => {
  return function () {
    logger.balancer(`Current index: ${index}, Collection length: ${collection.length}`);
    if (index >= collection.length) {
      index = 0;
    }
    const item = collection[index++];
    logger.balancer(`Current index: ${index}, Collection length: ${collection.length}`);
    return item;
  };
};
