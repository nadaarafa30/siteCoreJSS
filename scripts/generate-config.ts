import * as fs from 'fs';
import * as path from 'path';
const packageConfig = require('../package.json');

/**
 * Generate config
 * The object returned from this function will be made available by importing src/environments/environment.ts.
 * This is executed prior to the build running, so it's a way to inject environment or build config-specific
 * settings as variables into the JSS app.
 * NOTE! Any configs returned here will be written into the client-side JS bundle. DO NOT PUT SECRETS HERE.
 */
export function generateConfig(configOverrides?: any, outputPath?: string) {
  const defaultConfig = {
    production: false,
    sitecoreApiHost: '',
    sitecoreApiKey: 'no-api-key-set',
    jssAppName: 'Unknown',
    sitecoreLayoutServiceConfig: 'jss',
    defaultLanguage: 'en',
    defaultServerRoute: '/',
  };

  if (!outputPath) {
    outputPath = 'src/environments/environment.ts';
  }

  // require + combine config sources
  const scjssConfig = transformScJssConfig();
  const packageJson = transformPackageConfig();

  // optional:
  // do any other dynamic config source (e.g. environment-specific config files)
  // Object.assign merges the objects in order, so the
  // package.json config can override the calculated config,
  // scjssconfig.json overrides it,
  // and finally config passed in the configOverrides param wins.
  const config = Object.assign(defaultConfig, scjssConfig, packageJson, configOverrides);

  // The GraphQL endpoint is an example of making a _computed_ config setting
  // based on other config settings.
  addGraphQLConfig(config);

  const configText = `/* tslint:disable */
// Do not edit this file, it is auto-generated at build time!
// See scripts/bootstrap.ts to modify the generation of this file.
export const environment = ${JSON.stringify(config, null, 2)};
`;

  const configPath = path.resolve(outputPath);

  console.log(`Writing runtime config to ${configPath}`);

  fs.writeFileSync(configPath, configText, { encoding: 'utf8' });
}

function transformScJssConfig() {
  // scjssconfig.json may not exist if you've never run setup
  // so if it doesn't we substitute a fake object
  let config;
  try {
    config = require('../scjssconfig.json');
  } catch (e) {
    return {};
  }

  if (!config) { return {}; }

  return {
    sitecoreApiKey: config.sitecore.apiKey,
    sitecoreApiHost: config.sitecore.layoutServiceHost,
  };
}

function transformPackageConfig() {
  const packageAny = packageConfig as any;

  if (!packageAny.config) { return {}; }

  return {
    jssAppName: packageAny.config.appName,
    defaultLanguage: packageAny.config.language || 'en',
    graphQLEndpointPath: packageAny.config.graphQLEndpointPath || null,
  };
}

/**
 * Adds the GraphQL endpoint URL to the config object, and ensures that components needed to calculate it are valid
 */
function addGraphQLConfig(baseConfig) {
  if (!baseConfig.graphQLEndpointPath || typeof baseConfig.sitecoreApiHost === 'undefined') {
    console.error(
      'The `graphQLEndpointPath` and/or `layoutServiceHost` configurations were not defined. You may need to run `jss setup`.'
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-param-reassign
  baseConfig.graphQLEndpoint = `${baseConfig.sitecoreApiHost}${
    baseConfig.graphQLEndpointPath
  }?sc_apikey=${baseConfig.sitecoreApiKey}`;
}
