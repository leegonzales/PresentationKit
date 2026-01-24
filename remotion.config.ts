/**
 * Remotion Configuration
 *
 * Configures the Remotion bundler to resolve .js imports to .ts/.tsx files.
 * This is necessary because TypeScript node16 module resolution requires .js extensions.
 */

import { Config } from '@remotion/cli/config';

Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      extensionAlias: {
        '.js': ['.js', '.ts', '.tsx'],
      },
    },
  };
});
