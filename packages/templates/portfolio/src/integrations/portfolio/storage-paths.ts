import { resolve } from 'node:path';

export function portfolioStoragePaths(localDirectory = '.local/portfolio') {
  const directory = resolve(/* turbopackIgnore: true */ localDirectory);
  return {
    directory,
    filename: resolve(directory, 'portfolio.sqlite'),
    mediaDirectory: resolve(directory, 'media'),
  };
}
