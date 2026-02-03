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
};

// Category colors
export const categoryColors: Record<NodeDefinition['category'], string> = {
  generator: '#10B981', // Green
  modifier: '#F59E0B', // Orange
  value: '#8B5CF6', // Purple
  output: '#EF4444', // Red
};
