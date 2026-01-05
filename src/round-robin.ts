import logger from './logger';

export const roundRobin = <Collection>(collection: Collection[], index = 0) => {
  return function () {
    logger.balancer(
      `Current index: ${index}, Collection length: ${collection.length}`,
    );
    if (!collection?.length) {
      throw new Error('Cannot balance over empty collection');
    }
    const item = collection[index];
    index = (index + 1) % collection.length;

    logger.balancer(
      `Current index: ${index}, Collection length: ${collection.length}`,
    );
    return item;
  };
};
