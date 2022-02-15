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
