import type { GraphNode, Connection } from '../store/nodeStore';
import type { Layer, Path, CanvasSettings, OutputLayer } from '../types';
import { nodeDefinitions, getDefaultParams } from './nodeDefinitions';
import { moduleRegistry } from '../modules/registry';
import { createSeededRng } from './rng';

interface ExecutionContext {
  canvas: CanvasSettings;
  seed: number;
  rng: () => number;
}

interface NodeResult {
  paths?: Layer[];
  number?: number;
  vector?: { x: number; y: number };
  boolean?: boolean;
}

// Execution cache to avoid re-computing nodes
const executionCache = new Map<string, NodeResult>();
let lastExecutionVersion = -1;

// Execute a single node
function executeNode(
  node: GraphNode,
  nodes: GraphNode[],
  connections: Connection[],
  ctx: ExecutionContext,
  visited: Set<string>
): NodeResult {
  // Check cache
  if (executionCache.has(node.id)) {
    return executionCache.get(node.id)!;
  }

  // Cycle detection
  if (visited.has(node.id)) {
    console.warn(`Cycle detected at node ${node.id}`);
    return {};
  }
  visited.add(node.id);

  const def = nodeDefinitions.get(node.type);
  if (!def) {
    console.warn(`Unknown node type: ${node.type}`);
    return {};
  }

  // Get merged parameters (defaults + stored values)
  const params = { ...getDefaultParams(node.type), ...node.params };

  // Resolve input connections
  const inputValues: Record<string, NodeResult> = {};

  for (const input of def.inputs) {
    const conn = connections.find(
      (c) => c.toNode === node.id && c.toPort === input.name
    );

    if (conn) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNode);
      if (sourceNode) {
        inputValues[input.name] = executeNode(
          sourceNode,
          nodes,
          connections,
          ctx,
          new Set(visited)
        );
      }
    }
  }

  // Resolve parameter connections (promoted params driven by connections)
  for (const param of def.parameters) {
    if (!param.dataType) continue;

    const conn = connections.find(
      (c) => c.toNode === node.id && c.toPort === `param:${param.name}`
    );

    if (conn) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNode);
      if (sourceNode) {
        const result = executeNode(
          sourceNode,
          nodes,
          connections,
          ctx,
          new Set(visited)
        );

        // Handle type coercion based on parameter dataType
        switch (param.dataType) {
          case 'number':
            if (result.number !== undefined) {
              params[param.name] = result.number;
            } else if (result.vector !== undefined) {
              // Extract x component from vector for number params
              params[param.name] = result.vector.x;
            } else if (result.boolean !== undefined) {
              // Convert boolean to 0/1
              params[param.name] = result.boolean ? 1 : 0;
            }
            break;

          case 'boolean':
            if (result.boolean !== undefined) {
              params[param.name] = result.boolean;
            } else if (result.number !== undefined) {
              // Non-zero number is truthy
              params[param.name] = result.number !== 0;
            }
            break;

          case 'vector':
            if (result.vector !== undefined) {
              params[param.name] = result.vector;
            }
            break;
        }
      }
    }
  }

  let result: NodeResult = {};

  try {
    // Execute based on node category/type
    switch (node.type) {
      // Value nodes
      case 'number':
        result = { number: params.value as number };
        break;

      case 'random':
        result = {
          number:
            (params.min as number) +
            ctx.rng() * ((params.max as number) - (params.min as number)),
        };
        break;

      case 'math': {
        let a = params.aDefault as number;
        let b = params.bDefault as number;

        if (inputValues.a?.number !== undefined) a = inputValues.a.number;
        if (inputValues.b?.number !== undefined) b = inputValues.b.number;

        let value: number;
        switch (params.operation) {
          case 'add':
            value = a + b;
            break;
          case 'subtract':
            value = a - b;
            break;
          case 'multiply':
            value = a * b;
            break;
          case 'divide':
            value = b !== 0 ? a / b : 0;
            break;
          case 'min':
            value = Math.min(a, b);
            break;
          case 'max':
            value = Math.max(a, b);
            break;
          case 'modulo':
            value = b !== 0 ? a % b : 0;
            break;
          case 'power':
            value = Math.pow(a, b);
            break;
          default:
            value = a;
        }
        result = { number: value };
        break;
      }

      case 'vector': {
        // Use input connections if available, otherwise use params
        let x = params.x as number;
        let y = params.y as number;
        if (inputValues.x?.number !== undefined) x = inputValues.x.number;
        if (inputValues.y?.number !== undefined) y = inputValues.y.number;
        result = { vector: { x, y } };
        break;
      }

      case 'boolean':
        result = { boolean: params.value as boolean };
        break;

      // Output node - just pass through paths (metadata handled in executeGraph)
      case 'output': {
        const inputPaths = inputValues.paths?.paths || [];
        result = { paths: inputPaths };
        break;
      }

      // Merge node
      case 'merge': {
        const allPaths: Path[] = [];

        for (const inputName of ['paths1', 'paths2', 'paths3', 'paths4']) {
          const inputLayers = inputValues[inputName]?.paths;
          if (inputLayers) {
            for (const layer of inputLayers) {
              allPaths.push(...layer.paths);
            }
          }
        }

        result = {
          paths: [
            {
              id: 'merged',
              paths: allPaths,
            },
          ],
        };
        break;
      }

      // Generator and modifier nodes (use existing module system)
      default: {
        const moduleDef = moduleRegistry.get(node.type);
        if (moduleDef) {
          // Build additional inputs object for modules that need them
          const additionalInputs: Record<string, Layer[]> = {};
          if (moduleDef.additionalInputs) {
            for (const inputDef of moduleDef.additionalInputs) {
              const inputResult = inputValues[inputDef.name];
              if (inputResult?.paths) {
                additionalInputs[inputDef.name] = inputResult.paths;
              }
            }
          }

          // Build module execution context
          const moduleCtx = {
            canvas: ctx.canvas,
            seed: ctx.seed,
            rng: ctx.rng,
            inputs: additionalInputs,
          };

          // Get input layers for modifiers
          let inputLayers: Layer[] = [];
          if (def.category === 'modifier') {
            inputLayers = inputValues.paths?.paths || [];
          }

          // Execute the module
          const outputLayers = moduleDef.execute(params, inputLayers, moduleCtx);
          result = { paths: outputLayers };
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Error executing node ${node.id} (${node.type}):`, error);
    result = {};
  }

  // Cache the result
  executionCache.set(node.id, result);

  return result;
}

// Execute the full graph starting from output nodes
export function executeGraph(
  nodes: GraphNode[],
  connections: Connection[],
  canvas: CanvasSettings,
  seed: number,
  executionVersion: number
): OutputLayer[] {
  // Clear cache if execution version changed
  if (executionVersion !== lastExecutionVersion) {
    executionCache.clear();
    lastExecutionVersion = executionVersion;
  }

  // Find all output nodes
  const outputNodes = nodes.filter((n) => n.type === 'output');

  if (outputNodes.length === 0) {
    return [];
  }

  // Create execution context
  const ctx: ExecutionContext = {
    canvas,
    seed,
    rng: createSeededRng(seed),
  };

  // Execute each output node and collect results
  const outputLayers: OutputLayer[] = [];

  for (const outputNode of outputNodes) {
    // Get output node parameters with defaults
    const nodeParams = { ...getDefaultParams('output'), ...outputNode.params };
    const layerName = (nodeParams.layerName as string) || 'Layer 1';
    const layerColor = (nodeParams.layerColor as string) || '#000000';
    const penNumber = (nodeParams.penNumber as number) || 1;
    const enabled = nodeParams.enabled !== false;

    // Skip disabled output nodes
    if (!enabled) continue;

    const result = executeNode(
      outputNode,
      nodes,
      connections,
      ctx,
      new Set()
    );

    // Collect all paths from the result
    const allPaths: Path[] = [];
    if (result.paths) {
      for (const layer of result.paths) {
        allPaths.push(...layer.paths);
      }
    }

    outputLayers.push({
      id: outputNode.id,
      name: layerName,
      color: layerColor,
      penNumber,
      enabled,
      paths: allPaths,
    });
  }

  // Sort by pen number
  outputLayers.sort((a, b) => a.penNumber - b.penNumber);

  return outputLayers;
}

// Get the value of a number output from a node
export function getNodeNumberOutput(
  nodeId: string,
  nodes: GraphNode[],
  connections: Connection[],
  canvas: CanvasSettings,
  seed: number
): number | undefined {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;

  const ctx: ExecutionContext = {
    canvas,
    seed,
    rng: createSeededRng(seed),
  };

  const result = executeNode(node, nodes, connections, ctx, new Set());
  return result.number;
}

// Clear execution cache
export function clearExecutionCache(): void {
  executionCache.clear();
  lastExecutionVersion = -1;
}
