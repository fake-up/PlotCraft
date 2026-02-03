import type { NodeDefinition, ParameterDefinition, DataType } from '../store/nodeStore';
import { moduleRegistry } from '../modules/registry';
import type { ModuleDefinition, ParameterConfig } from '../types';

// Convert module parameter to node parameter definition
function convertParameter(
  name: string,
  config: ParameterConfig
): ParameterDefinition {
  const base: ParameterDefinition = {
    name,
    label: config.label,
    default: config.default,
    type: config.type as 'number' | 'select' | 'boolean',
  };

  if (config.type === 'number') {
    base.min = config.min;
    base.max = config.max;
    base.step = config.step;
    base.dataType = 'number'; // Can be driven by number connection
  }

  if (config.type === 'boolean') {
    base.dataType = 'boolean'; // Can be driven by boolean connection
  }

  if (config.type === 'select' && config.options) {
    base.options = config.options.map((opt) =>
      typeof opt === 'string'
        ? { value: opt, label: opt }
        : { value: opt.value, label: opt.label }
    );
  }

  if (config.showWhen) {
    base.showWhen = config.showWhen;
  }

  return base;
}

// Convert existing module to node definition
function moduleToNodeDefinition(module: ModuleDefinition): NodeDefinition {
  const category = module.type === 'generator' ? 'generator' : 'modifier';

  const parameters: ParameterDefinition[] = [];
  for (const [name, config] of Object.entries(module.parameters)) {
    parameters.push(convertParameter(name, config));
  }

  const inputs: NodeDefinition['inputs'] =
    category === 'modifier' ? [{ name: 'paths', type: 'paths' as DataType }] : [];

  // Add additional inputs if defined
  if (module.additionalInputs) {
    for (const additionalInput of module.additionalInputs) {
      inputs.push({
        name: additionalInput.name,
        type: additionalInput.type as DataType,
      });
    }
  }

  const outputs: NodeDefinition['outputs'] = [
    { name: 'paths', type: 'paths' as DataType },
  ];

  return {
    type: module.id,
    category,
    name: module.name,
    inputs,
    outputs,
    parameters,
  };
}

// Value node definitions
const numberNode: NodeDefinition = {
  type: 'number',
  category: 'value',
  name: 'Number',
  description: 'Outputs a constant number value',
  inputs: [],
  outputs: [{ name: 'value', type: 'number' }],
  parameters: [
    {
      name: 'value',
      type: 'number',
      label: 'Value',
      default: 50,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
  ],
};

const mathNode: NodeDefinition = {
  type: 'math',
  category: 'value',
  name: 'Math',
  description: 'Performs math operations on two numbers',
  inputs: [
    { name: 'a', type: 'number' },
    { name: 'b', type: 'number' },
  ],
  outputs: [{ name: 'result', type: 'number' }],
  parameters: [
    {
      name: 'operation',
      type: 'select',
      label: 'Operation',
      default: 'add',
      options: [
        { value: 'add', label: 'Add (+)' },
        { value: 'subtract', label: 'Subtract (-)' },
        { value: 'multiply', label: 'Multiply (×)' },
        { value: 'divide', label: 'Divide (÷)' },
        { value: 'min', label: 'Min' },
        { value: 'max', label: 'Max' },
        { value: 'modulo', label: 'Modulo (%)' },
        { value: 'power', label: 'Power (^)' },
      ],
      // select type is not promotable (no dataType)
    },
    {
      name: 'aDefault',
      type: 'number',
      label: 'A (default)',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'bDefault',
      type: 'number',
      label: 'B (default)',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
  ],
};

const randomNode: NodeDefinition = {
  type: 'random',
  category: 'value',
  name: 'Random',
  description: 'Outputs a random number within a range',
  inputs: [],
  outputs: [{ name: 'value', type: 'number' }],
  parameters: [
    {
      name: 'min',
      type: 'number',
      label: 'Min',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'max',
      type: 'number',
      label: 'Max',
      default: 100,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
  ],
};

const vectorNode: NodeDefinition = {
  type: 'vector',
  category: 'value',
  name: 'Vector',
  description: 'Creates a 2D vector from X and Y values',
  inputs: [
    { name: 'x', type: 'number' },
    { name: 'y', type: 'number' },
  ],
  outputs: [{ name: 'vector', type: 'vector' }],
  parameters: [
    {
      name: 'x',
      type: 'number',
      label: 'X',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'y',
      type: 'number',
      label: 'Y',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
  ],
};

const booleanNode: NodeDefinition = {
  type: 'boolean',
  category: 'value',
  name: 'Boolean',
  description: 'Outputs a true/false value',
  inputs: [],
  outputs: [{ name: 'value', type: 'boolean' }],
  parameters: [
    {
      name: 'value',
      type: 'boolean',
      label: 'Value',
      default: true,
      dataType: 'boolean',
    },
  ],
};

// Data node definitions
const bitcoinDataNode: NodeDefinition = {
  type: 'bitcoinData',
  category: 'data',
  name: 'Bitcoin Data',
  description: 'Fetches historical Bitcoin price data from CoinGecko',
  inputs: [],
  outputs: [
    { name: 'value', type: 'number' },
    { name: 'high', type: 'number' },
    { name: 'low', type: 'number' },
    { name: 'current', type: 'number' },
    { name: 'volume', type: 'number' },
    { name: 'change', type: 'number' },
    { name: 'history', type: 'numberArray' },
  ],
  parameters: [
    {
      name: 'days',
      type: 'number',
      label: 'Days',
      default: 7,
      min: 1,
      max: 90,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'dataPoint',
      type: 'select',
      label: 'Data Point',
      default: 'high',
      options: [
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
        { value: 'open', label: 'Open' },
        { value: 'close', label: 'Close' },
        { value: 'volume', label: 'Volume' },
      ],
    },
    {
      name: 'refresh',
      type: 'button',
      label: 'Refresh Data',
      default: 0,
    },
  ],
};

const weatherDataNode: NodeDefinition = {
  type: 'weatherData',
  category: 'data',
  name: 'Weather Data',
  description: 'Fetches current weather data from Open-Meteo',
  inputs: [],
  outputs: [
    { name: 'temperature', type: 'number' },
    { name: 'humidity', type: 'number' },
    { name: 'windSpeed', type: 'number' },
    { name: 'precipitation', type: 'number' },
    { name: 'cloudCover', type: 'number' },
    { name: 'uvIndex', type: 'number' },
  ],
  parameters: [
    {
      name: 'latitude',
      type: 'number',
      label: 'Latitude',
      default: 40.7128,
      min: -90,
      max: 90,
      step: 0.0001,
      dataType: 'number',
    },
    {
      name: 'longitude',
      type: 'number',
      label: 'Longitude',
      default: -74.006,
      min: -180,
      max: 180,
      step: 0.0001,
      dataType: 'number',
    },
    {
      name: 'refresh',
      type: 'button',
      label: 'Refresh Data',
      default: 0,
    },
  ],
};

const earthquakeDataNode: NodeDefinition = {
  type: 'earthquakeData',
  category: 'data',
  name: 'Earthquake Data',
  description: 'Fetches recent earthquake data from USGS',
  inputs: [],
  outputs: [
    { name: 'count', type: 'number' },
    { name: 'maxMagnitude', type: 'number' },
    { name: 'avgMagnitude', type: 'number' },
    { name: 'avgDepth', type: 'number' },
    { name: 'latestLat', type: 'number' },
    { name: 'latestLon', type: 'number' },
    { name: 'latestMag', type: 'number' },
  ],
  parameters: [
    {
      name: 'timePeriod',
      type: 'select',
      label: 'Time Period',
      default: 'day',
      options: [
        { value: 'hour', label: 'Past Hour' },
        { value: 'day', label: 'Past Day' },
        { value: 'week', label: 'Past Week' },
        { value: 'month', label: 'Past Month' },
      ],
    },
    {
      name: 'minMagnitude',
      type: 'number',
      label: 'Min Magnitude',
      default: 2.5,
      min: 0,
      max: 10,
      step: 0.1,
      dataType: 'number',
    },
    {
      name: 'refresh',
      type: 'button',
      label: 'Refresh Data',
      default: 0,
    },
  ],
};

const mapRangeNode: NodeDefinition = {
  type: 'mapRange',
  category: 'value',
  name: 'Map Range',
  description: 'Remaps an input value from one range to another',
  inputs: [
    { name: 'inputValue', type: 'number' },
  ],
  outputs: [{ name: 'result', type: 'number' }],
  parameters: [
    {
      name: 'inputValue',
      type: 'number',
      label: 'Input Value',
      default: 0,
      min: -10000,
      max: 10000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'inputMin',
      type: 'number',
      label: 'Input Min',
      default: 0,
      min: -10000,
      max: 10000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'inputMax',
      type: 'number',
      label: 'Input Max',
      default: 100,
      min: -10000,
      max: 10000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'outputMin',
      type: 'number',
      label: 'Output Min',
      default: 0,
      min: -10000,
      max: 10000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'outputMax',
      type: 'number',
      label: 'Output Max',
      default: 100,
      min: -10000,
      max: 10000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'clamp',
      type: 'boolean',
      label: 'Clamp',
      default: true,
      dataType: 'boolean',
    },
  ],
};

// Data Points node - plots number arrays as points or paths
const dataPointsNode: NodeDefinition = {
  type: 'dataPoints',
  category: 'generator',
  name: 'Data Points',
  description: 'Plots an array of numbers as points or a connected path',
  inputs: [
    { name: 'data', type: 'numberArray' },
  ],
  outputs: [{ name: 'paths', type: 'paths' }],
  parameters: [
    {
      name: 'layout',
      type: 'select',
      label: 'Layout',
      default: 'horizontal',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'circular', label: 'Circular' },
      ],
    },
    {
      name: 'mode',
      type: 'select',
      label: 'Mode',
      default: 'line',
      options: [
        { value: 'line', label: 'Connected Line' },
        { value: 'points', label: 'Points' },
        { value: 'bars', label: 'Bars' },
      ],
    },
    {
      name: 'normalize',
      type: 'boolean',
      label: 'Normalize',
      default: true,
      dataType: 'boolean',
    },
    {
      name: 'width',
      type: 'number',
      label: 'Width',
      default: 80,
      min: 10,
      max: 100,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'height',
      type: 'number',
      label: 'Height',
      default: 60,
      min: 10,
      max: 100,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'pointSize',
      type: 'number',
      label: 'Point Size',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
      dataType: 'number',
      showWhen: { param: 'mode', value: 'points' },
    },
    {
      name: 'margin',
      type: 'number',
      label: 'Margin',
      default: 10,
      min: 0,
      max: 50,
      step: 1,
      dataType: 'number',
    },
  ],
};

// Select node definitions
const randomSelectNode: NodeDefinition = {
  type: 'randomSelect',
  category: 'select',
  name: 'Random Select',
  description: 'Randomly splits paths into two groups',
  inputs: [
    { name: 'paths', type: 'paths' },
  ],
  outputs: [
    { name: 'selected', type: 'paths' },
    { name: 'unselected', type: 'paths' },
  ],
  parameters: [
    {
      name: 'percentage',
      type: 'number',
      label: 'Percentage',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'selectSeed',
      type: 'number',
      label: 'Seed',
      default: 12345,
      min: 0,
      max: 99999,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'mode',
      type: 'select',
      label: 'Mode',
      default: 'paths',
      options: [
        { value: 'paths', label: 'Paths' },
        { value: 'points', label: 'Points' },
      ],
    },
  ],
};

const indexSelectNode: NodeDefinition = {
  type: 'indexSelect',
  category: 'select',
  name: 'Index Select',
  description: 'Selects paths based on their index position',
  inputs: [
    { name: 'paths', type: 'paths' },
  ],
  outputs: [
    { name: 'selected', type: 'paths' },
    { name: 'unselected', type: 'paths' },
  ],
  parameters: [
    {
      name: 'mode',
      type: 'select',
      label: 'Mode',
      default: 'everyNth',
      options: [
        { value: 'everyNth', label: 'Every Nth' },
        { value: 'range', label: 'Range' },
        { value: 'firstN', label: 'First N' },
        { value: 'lastN', label: 'Last N' },
        { value: 'even', label: 'Even' },
        { value: 'odd', label: 'Odd' },
      ],
    },
    {
      name: 'nValue',
      type: 'number',
      label: 'N Value',
      default: 2,
      min: 1,
      max: 100,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'mode', value: 'everyNth' },
    },
    {
      name: 'nValueFirstN',
      type: 'number',
      label: 'N Value',
      default: 2,
      min: 1,
      max: 100,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'mode', value: 'firstN' },
    },
    {
      name: 'nValueLastN',
      type: 'number',
      label: 'N Value',
      default: 2,
      min: 1,
      max: 100,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'mode', value: 'lastN' },
    },
    {
      name: 'rangeStart',
      type: 'number',
      label: 'Range Start',
      default: 0,
      min: 0,
      max: 1000,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'mode', value: 'range' },
    },
    {
      name: 'rangeEnd',
      type: 'number',
      label: 'Range End',
      default: 10,
      min: 0,
      max: 1000,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'mode', value: 'range' },
    },
    {
      name: 'invert',
      type: 'boolean',
      label: 'Invert',
      default: false,
      dataType: 'boolean',
    },
  ],
};

const regionSelectNode: NodeDefinition = {
  type: 'regionSelect',
  category: 'select',
  name: 'Region Select',
  description: 'Selects paths based on a visual region on the canvas',
  inputs: [
    { name: 'paths', type: 'paths' },
  ],
  outputs: [
    { name: 'selected', type: 'paths' },
    { name: 'unselected', type: 'paths' },
  ],
  parameters: [
    {
      name: 'shape',
      type: 'select',
      label: 'Shape',
      default: 'circle',
      options: [
        { value: 'circle', label: 'Circle' },
        { value: 'rectangle', label: 'Rectangle' },
      ],
    },
    {
      name: 'centerX',
      type: 'number',
      label: 'Center X %',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'centerY',
      type: 'number',
      label: 'Center Y %',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'regionRadius',
      type: 'number',
      label: 'Radius %',
      default: 25,
      min: 1,
      max: 100,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'shape', value: 'circle' },
    },
    {
      name: 'regionWidth',
      type: 'number',
      label: 'Width %',
      default: 30,
      min: 1,
      max: 100,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'shape', value: 'rectangle' },
    },
    {
      name: 'regionHeight',
      type: 'number',
      label: 'Height %',
      default: 30,
      min: 1,
      max: 100,
      step: 1,
      dataType: 'number',
      showWhen: { param: 'shape', value: 'rectangle' },
    },
    {
      name: 'falloff',
      type: 'number',
      label: 'Falloff %',
      default: 0,
      min: 0,
      max: 50,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'invert',
      type: 'boolean',
      label: 'Invert',
      default: false,
      dataType: 'boolean',
    },
    {
      name: 'selectBy',
      type: 'select',
      label: 'Select By',
      default: 'center',
      options: [
        { value: 'center', label: 'Center Point' },
        { value: 'any', label: 'Any Point' },
        { value: 'all', label: 'All Points' },
      ],
    },
  ],
};

const noiseSelectNode: NodeDefinition = {
  type: 'noiseSelect',
  category: 'select',
  name: 'Noise Select',
  description: 'Selects paths based on Perlin noise for organic selection patterns',
  inputs: [
    { name: 'paths', type: 'paths' },
  ],
  outputs: [
    { name: 'selected', type: 'paths' },
    { name: 'unselected', type: 'paths' },
  ],
  parameters: [
    {
      name: 'threshold',
      type: 'number',
      label: 'Threshold',
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      dataType: 'number',
    },
    {
      name: 'noiseScale',
      type: 'number',
      label: 'Scale',
      default: 50,
      min: 1,
      max: 500,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'noiseSeed',
      type: 'number',
      label: 'Seed',
      default: 12345,
      min: 0,
      max: 99999,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'offsetX',
      type: 'number',
      label: 'Offset X',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'offsetY',
      type: 'number',
      label: 'Offset Y',
      default: 0,
      min: -1000,
      max: 1000,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'invert',
      type: 'boolean',
      label: 'Invert',
      default: false,
      dataType: 'boolean',
    },
    {
      name: 'selectBy',
      type: 'select',
      label: 'Select By',
      default: 'center',
      options: [
        { value: 'center', label: 'Center Point' },
        { value: 'any', label: 'Any Point' },
        { value: 'all', label: 'All Points' },
      ],
    },
  ],
};

// Output node - represents a single layer/pen
const outputNode: NodeDefinition = {
  type: 'output',
  category: 'output',
  name: 'Layer Output',
  description: 'Output layer - each Output node represents one pen/layer',
  inputs: [{ name: 'paths', type: 'paths' }],
  outputs: [],
  parameters: [
    {
      name: 'layerName',
      type: 'select', // Using select as a workaround for text input
      label: 'Layer Name',
      default: 'Layer 1',
      options: [
        { value: 'Layer 1', label: 'Layer 1' },
        { value: 'Layer 2', label: 'Layer 2' },
        { value: 'Layer 3', label: 'Layer 3' },
        { value: 'Layer 4', label: 'Layer 4' },
        { value: 'Black', label: 'Black' },
        { value: 'Red', label: 'Red' },
        { value: 'Blue', label: 'Blue' },
        { value: 'Green', label: 'Green' },
      ],
      // select type is not promotable
    },
    {
      name: 'layerColor',
      type: 'select',
      label: 'Preview Color',
      default: '#000000',
      options: [
        { value: '#000000', label: 'Black' },
        { value: '#E53935', label: 'Red' },
        { value: '#1E88E5', label: 'Blue' },
        { value: '#43A047', label: 'Green' },
        { value: '#FB8C00', label: 'Orange' },
        { value: '#8E24AA', label: 'Purple' },
        { value: '#00ACC1', label: 'Cyan' },
        { value: '#F4511E', label: 'Deep Orange' },
      ],
      // select type is not promotable
    },
    {
      name: 'penNumber',
      type: 'number',
      label: 'Pen Number',
      default: 1,
      min: 1,
      max: 10,
      step: 1,
      dataType: 'number',
    },
    {
      name: 'enabled',
      type: 'boolean',
      label: 'Enabled',
      default: true,
      dataType: 'boolean',
    },
  ],
};

// Merge node - combines multiple path inputs
const mergeNode: NodeDefinition = {
  type: 'merge',
  category: 'modifier',
  name: 'Merge',
  description: 'Combines multiple path inputs into one',
  inputs: [
    { name: 'paths1', type: 'paths' },
    { name: 'paths2', type: 'paths' },
    { name: 'paths3', type: 'paths' },
    { name: 'paths4', type: 'paths' },
  ],
  outputs: [{ name: 'paths', type: 'paths' }],
  parameters: [],
};

// Build the node definitions registry
class NodeDefinitionRegistry {
  private definitions: Map<string, NodeDefinition> = new Map();

  constructor() {
    // Add value nodes
    this.register(numberNode);
    this.register(mathNode);
    this.register(randomNode);
    this.register(vectorNode);
    this.register(booleanNode);
    this.register(mapRangeNode);

    // Add data nodes
    this.register(bitcoinDataNode);
    this.register(weatherDataNode);
    this.register(earthquakeDataNode);

    // Add data points generator
    this.register(dataPointsNode);

    // Add select nodes
    this.register(randomSelectNode);
    this.register(indexSelectNode);
    this.register(regionSelectNode);
    this.register(noiseSelectNode);

    // Add output node
    this.register(outputNode);

    // Add merge node
    this.register(mergeNode);

    // Convert and add all existing modules
    const modules = moduleRegistry.getAll();
    for (const module of modules) {
      const nodeDef = moduleToNodeDefinition(module);
      this.register(nodeDef);
    }
  }

  register(def: NodeDefinition): void {
    this.definitions.set(def.type, def);
  }

  get(type: string): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  getByCategory(category: NodeDefinition['category']): NodeDefinition[] {
    return this.getAll().filter((d) => d.category === category);
  }

  getGenerators(): NodeDefinition[] {
    return this.getByCategory('generator');
  }

  getModifiers(): NodeDefinition[] {
    return this.getByCategory('modifier');
  }

  getValueNodes(): NodeDefinition[] {
    return this.getByCategory('value');
  }

  getSelectNodes(): NodeDefinition[] {
    return this.getByCategory('select');
  }

  getDataNodes(): NodeDefinition[] {
    return this.getByCategory('data');
  }

  getOutputNodes(): NodeDefinition[] {
    return this.getByCategory('output');
  }
}

export const nodeDefinitions = new NodeDefinitionRegistry();

// Get default parameter values for a node type
export function getDefaultParams(type: string): Record<string, unknown> {
  const def = nodeDefinitions.get(type);
  if (!def) return {};

  const params: Record<string, unknown> = {};
  for (const param of def.parameters) {
    params[param.name] = param.default;
  }
  return params;
}

// Check if a parameter can be promoted to an input port
export function isParamPromotable(param: ParameterDefinition): boolean {
  // Only parameters with dataType can be promoted
  return param.dataType !== undefined;
}

// Get abbreviated parameter name for port label (max 6 chars)
export function getParamPortLabel(param: ParameterDefinition): string {
  const label = param.label;
  // Common abbreviations
  const abbreviations: Record<string, string> = {
    'Amount': 'Amt',
    'Radius': 'Rad',
    'Spacing': 'Space',
    'Margin': 'Marg',
    'Columns': 'Cols',
    'Copies': 'Copy',
    'Angle': 'Ang',
    'Scale': 'Scl',
    'Width': 'W',
    'Height': 'H',
    'Rotation': 'Rot',
    'Minimum': 'Min',
    'Maximum': 'Max',
    'Enabled': 'On',
    'Offset': 'Off',
    'Count': 'Cnt',
    'Density': 'Dens',
    'Frequency': 'Freq',
    'Amplitude': 'Amp',
    'Wavelength': 'Wave',
    'Threshold': 'Thres',
    'Iterations': 'Iter',
    'Segments': 'Segs',
  };

  if (abbreviations[label]) {
    return abbreviations[label];
  }

  // Truncate if too long
  if (label.length > 6) {
    return label.slice(0, 5) + '.';
  }

  return label;
}

// Data type colors
export const dataTypeColors: Record<DataType, string> = {
  paths: '#3B82F6', // Blue
  number: '#22C55E', // Green
  vector: '#A855F7', // Purple
  boolean: '#F97316', // Orange
  numberArray: '#14B8A6', // Teal
};

// Category colors
export const categoryColors: Record<NodeDefinition['category'], string> = {
  generator: '#10B981', // Green
  modifier: '#F59E0B', // Orange
  select: '#F59E0B', // Amber
  value: '#8B5CF6', // Purple
  data: '#0EA5E9', // Sky blue
  output: '#EF4444', // Red
};
