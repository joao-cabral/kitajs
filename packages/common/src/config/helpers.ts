import deepmerge from 'deepmerge';
import path from 'node:path';
import { PartialDeep } from 'type-fest';
import { CannotReadConfigError, InvalidConfigError } from '../errors';
import { DefaultConfig } from './defaults';
import { KitaConfig } from './model';

/** Tries to import a config file from the given path. */
export function importConfig(path: string) {
  try {
    return mergeDefaults(require(path));
  } catch (e: any) {
    // The provided path is not a valid config file
    if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(`Cannot find module '${path}'`)) {
      return DefaultConfig;
    }

    throw new CannotReadConfigError(e.message);
  }
}

export function mergeDefaults(config: PartialDeep<KitaConfig> = {}, root?: string) {
  if (config?.controllers?.glob && !Array.isArray(config.controllers.glob)) {
    throw new InvalidConfigError('controllers.glob must be an array of strings', config);
  }

  if (config?.providers?.glob && !Array.isArray(config.providers.glob)) {
    throw new InvalidConfigError('providers.glob must be an array of strings', config);
  }

  // Removes additionalProperties property from schemas if this is the default value
  if (config.schema?.generator && config.schema.generator.additionalProperties !== false) {
    config.schema.generator.additionalProperties = undefined;
  }

  const cfg = deepmerge<KitaConfig>(
    DefaultConfig,
    // Validated config
    config as KitaConfig,
    { arrayMerge: (_, b) => b }
  );

  cfg.cwd = root ? path.resolve(root) : path.resolve(cfg.cwd);

  return cfg;
}
