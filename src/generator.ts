import ConfigGenerator from './generators/config';
import AutoGenerator from './generators/auto';
import ClassGenerator from './generators/class';
import CustomGenerator from './generators/custom';
import EggGenerator from './generators/egg';
import ExtendGenerator from './generators/extend';
import FunctionGenerator from './generators/function';
import ObjectGenerator from './generators/object';
import PluginGenerator from './generators/plugin';
import { BaseGenerator } from './generators/base';
import * as utils from './utils';
import path from 'path';
import assert = require('assert');
type GeneratorKlass = { new (...args: any[]): BaseGenerator };

export const generators = {
  auto: AutoGenerator,
  config: ConfigGenerator,
  class: ClassGenerator,
  custom: CustomGenerator,
  egg: EggGenerator,
  extend: ExtendGenerator,
  function: FunctionGenerator,
  object: ObjectGenerator,
  plugin: PluginGenerator,
};

export function registerGenerator(name: string, generator: GeneratorKlass) {
  generators[name] = generator;
}

export function isPrivateGenerator(name: string) {
  return !!getGenerator(name)?.isPrivate;
}

export function getGenerator(name: string) {
  return formatGenerator(generators[name]);
}

export function loadGenerator(name: any, option: { cwd: string; }) {
  const type = typeof name;
  const typeIsString = type === 'string';
  let generator = typeIsString ? getGenerator(name) : name;

  if (!generator && typeIsString) {
    // try to load generator as module path
    const generatorPath = utils.resolveModule(name.startsWith('.')
      ? path.join(option.cwd, name)
      : name,
    );

    if (generatorPath) {
      generator = require(generatorPath);
    }
  }

  generator = formatGenerator(generator);
  assert(typeof generator === 'function', `generator: ${name} not exist!!`);
  return generator;
}

export function formatGenerator(generator) {
  // check esm default
  if (generator && typeof generator.default === 'function') {
    generator.default.defaultConfig = generator.defaultConfig || generator.default.defaultConfig;
    generator.default.isPrivate = generator.isPrivate || generator.default.isPrivate;
    generator = generator.default;
  }
  return generator;
}

export {
  BaseGenerator,
  AutoGenerator,
  ConfigGenerator,
  ClassGenerator,
  CustomGenerator,
  EggGenerator,
  ExtendGenerator,
  FunctionGenerator,
  ObjectGenerator,
  PluginGenerator,
};
