import type { GraphNode, Connection } from '../store/nodeStore';
import type { Layer, Path, CanvasSettings, OutputLayer } from '../types';
import { nodeDefinitions, getDefaultParams } from './nodeDefinitions';
import { moduleRegistry } from '../modules/registry';
import { createSeededRng } from './rng';
import { noise2D } from './geometry';
import { getBitcoinData } from './bitcoinData';
import { getWeatherData } from './weatherData';
import { getEarthquakeData } from './earthquakeData';

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
  numberArray?: number[];
  // Named outputs for nodes with multiple output ports of the same type
  namedOutputs?: Record<string, number | boolean | { x: number; y: number } | number[] | Layer[]>;
}

// Execution cache to avoid re-computing nodes
const executionCache = new Map<string, NodeResult>();
let lastExecutionVersion = -1;

// Resolve a named output from a node result.
// If the source node has namedOutputs and the fromPort matches one,
// return a NodeResult containing just that value.
function resolveNamedOutput(result: NodeResult, fromPort: string): NodeResult {
  if (!result.namedOutputs || !(fromPort in result.namedOutputs)) {
    return result;
  }
  const val = result.namedOutputs[fromPort];
  if (typeof val === 'number') {
    return { number: val };
  }
  if (typeof val === 'boolean') {
    return { boolean: val };
  }
  if (Array.isArray(val)) {
    // Distinguish Layer[] from number[]
    // Layer[] elements are objects with a 'paths' property; number[] elements are primitives
    if (val.length === 0) {
      // Empty array: check the result's paths field to infer the intended type
      // If the result already has paths, treat empty arrays as Layer[]
      if (result.paths !== undefined) {
        return { paths: val as Layer[] };
      }
      return { numberArray: val as number[] };
    }
    if (typeof val[0] === 'object' && val[0] !== null && 'paths' in val[0]) {
      return { paths: val as Layer[] };
    }
    return { numberArray: val as number[] };
  }
  if (val && typeof val === 'object' && 'x' in val && 'y' in val) {
    return { vector: val as { x: number; y: number } };
  }
  return result;
}

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
        const sourceResult = executeNode(
          sourceNode,
          nodes,
          connections,
          ctx,
          new Set(visited)
        );
        // Check for named outputs on the source node
        inputValues[input.name] = resolveNamedOutput(sourceResult, conn.fromPort);
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
        const rawResult = executeNode(
          sourceNode,
          nodes,
          connections,
          ctx,
          new Set(visited)
        );
        // Resolve named outputs for the specific fromPort
        const result = resolveNamedOutput(rawResult, conn.fromPort);

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

      case 'bitcoinData': {
        const days = params.days as number;
        const dataPoint = params.dataPoint as string;
        const refreshKey = (params.refresh as number) ?? 0;

        const data = getBitcoinData(node.id, days, refreshKey);

        // Select primary output based on dataPoint dropdown
        const dataPointMap: Record<string, number> = {
          high: data.high,
          low: data.low,
          open: data.open,
          close: data.close,
          volume: data.volume,
        };
        const primaryValue = dataPointMap[dataPoint] ?? data.high;

        result = {
          number: primaryValue,
          numberArray: data.history,
          namedOutputs: {
            value: primaryValue,
            high: data.high,
            low: data.low,
            current: data.current,
            volume: data.volume,
            change: data.change,
            history: data.history,
          },
        };
        break;
      }

      case 'weatherData': {
        const latitude = params.latitude as number;
        const longitude = params.longitude as number;
        const refreshKey = (params.refresh as number) ?? 0;

        const data = getWeatherData(node.id, latitude, longitude, refreshKey);

        result = {
          number: data.temperature,
          namedOutputs: {
            temperature: data.temperature,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            precipitation: data.precipitation,
            cloudCover: data.cloudCover,
            uvIndex: data.uvIndex,
          },
        };
        break;
      }

      case 'earthquakeData': {
        const timePeriod = params.timePeriod as string;
        const minMagnitude = params.minMagnitude as number;
        const refreshKey = (params.refresh as number) ?? 0;

        const data = getEarthquakeData(node.id, timePeriod, minMagnitude, refreshKey);

        result = {
          number: data.count,
          namedOutputs: {
            count: data.count,
            maxMagnitude: data.maxMagnitude,
            avgMagnitude: data.avgMagnitude,
            avgDepth: data.avgDepth,
            latestLat: data.latestLat,
            latestLon: data.latestLon,
            latestMag: data.latestMag,
          },
        };
        break;
      }

      case 'mapRange': {
        let inputValue = params.inputValue as number;
        if (inputValues.inputValue?.number !== undefined) inputValue = inputValues.inputValue.number;

        const inputMin = params.inputMin as number;
        const inputMax = params.inputMax as number;
        const outputMin = params.outputMin as number;
        const outputMax = params.outputMax as number;
        const clamp = params.clamp as boolean;

        let mapped: number;
        if (inputMax === inputMin) {
          mapped = outputMin;
        } else {
          mapped = outputMin + ((inputValue - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin);
        }

        if (clamp) {
          const lo = Math.min(outputMin, outputMax);
          const hi = Math.max(outputMin, outputMax);
          mapped = Math.max(lo, Math.min(hi, mapped));
        }

        result = { number: mapped };
        break;
      }

      // Data Points - plot number array as points/path
      case 'dataPoints': {
        const dataArray = inputValues.data?.numberArray || [];
        const layout = params.layout as string;
        const mode = params.mode as string;
        const normalize = params.normalize as boolean;
        const widthPct = params.width as number;
        const heightPct = params.height as number;
        const pointSize = params.pointSize as number;
        const margin = params.margin as number;

        const plotPaths: Path[] = [];

        if (dataArray.length > 0) {
          // Calculate plot area in canvas coordinates
          const plotW = (ctx.canvas.width * widthPct) / 100;
          const plotH = (ctx.canvas.height * heightPct) / 100;
          const offsetX = (ctx.canvas.width - plotW) / 2;
          const offsetY = (ctx.canvas.height - plotH) / 2;
          const innerW = plotW - margin * 2;
          const innerH = plotH - margin * 2;

          // Normalize values to 0-1 range or use raw values
          let values = [...dataArray];
          let minVal = Math.min(...values);
          let maxVal = Math.max(...values);

          if (normalize && maxVal !== minVal) {
            values = values.map((v) => (v - minVal) / (maxVal - minVal));
            minVal = 0;
            maxVal = 1;
          } else if (!normalize) {
            // Scale raw values into 0-1 range for plotting
            if (maxVal !== minVal) {
              values = values.map((v) => (v - minVal) / (maxVal - minVal));
            } else {
              values = values.map(() => 0.5);
            }
          } else {
            values = values.map(() => 0.5);
          }

          if (layout === 'horizontal') {
            const points = values.map((v, i) => ({
              x: offsetX + margin + (values.length > 1 ? (i / (values.length - 1)) * innerW : innerW / 2),
              y: offsetY + margin + (1 - v) * innerH,
            }));

            if (mode === 'line') {
              plotPaths.push({ points, closed: false });
            } else if (mode === 'points') {
              // Draw small circles at each point
              for (const pt of points) {
                const segments = 12;
                const circlePoints = [];
                for (let s = 0; s <= segments; s++) {
                  const angle = (s / segments) * Math.PI * 2;
                  circlePoints.push({
                    x: pt.x + Math.cos(angle) * pointSize,
                    y: pt.y + Math.sin(angle) * pointSize,
                  });
                }
                plotPaths.push({ points: circlePoints, closed: true });
              }
            } else if (mode === 'bars') {
              const barWidth = innerW / values.length * 0.8;
              const barGap = innerW / values.length * 0.2;
              const baseline = offsetY + margin + innerH;
              for (let i = 0; i < values.length; i++) {
                const bx = offsetX + margin + (i / values.length) * innerW + barGap / 2;
                const by = offsetY + margin + (1 - values[i]) * innerH;
                plotPaths.push({
                  points: [
                    { x: bx, y: baseline },
                    { x: bx, y: by },
                    { x: bx + barWidth, y: by },
                    { x: bx + barWidth, y: baseline },
                  ],
                  closed: false,
                });
              }
            }
          } else if (layout === 'vertical') {
            const points = values.map((v, i) => ({
              x: offsetX + margin + v * innerW,
              y: offsetY + margin + (values.length > 1 ? (i / (values.length - 1)) * innerH : innerH / 2),
            }));

            if (mode === 'line') {
              plotPaths.push({ points, closed: false });
            } else if (mode === 'points') {
              for (const pt of points) {
                const segments = 12;
                const circlePoints = [];
                for (let s = 0; s <= segments; s++) {
                  const angle = (s / segments) * Math.PI * 2;
                  circlePoints.push({
                    x: pt.x + Math.cos(angle) * pointSize,
                    y: pt.y + Math.sin(angle) * pointSize,
                  });
                }
                plotPaths.push({ points: circlePoints, closed: true });
              }
            } else if (mode === 'bars') {
              const barHeight = innerH / values.length * 0.8;
              const barGap = innerH / values.length * 0.2;
              const baseline = offsetX + margin;
              for (let i = 0; i < values.length; i++) {
                const by = offsetY + margin + (i / values.length) * innerH + barGap / 2;
                const bx = offsetX + margin + values[i] * innerW;
                plotPaths.push({
                  points: [
                    { x: baseline, y: by },
                    { x: bx, y: by },
                    { x: bx, y: by + barHeight },
                    { x: baseline, y: by + barHeight },
                  ],
                  closed: false,
                });
              }
            }
          } else if (layout === 'circular') {
            const cx = ctx.canvas.width / 2;
            const cy = ctx.canvas.height / 2;
            const baseRadius = Math.min(innerW, innerH) / 2 * 0.5;
            const maxRadius = Math.min(innerW, innerH) / 2;

            const points = values.map((v, i) => {
              const angle = (i / values.length) * Math.PI * 2 - Math.PI / 2;
              const r = baseRadius + v * (maxRadius - baseRadius);
              return {
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r,
              };
            });

            if (mode === 'line') {
              plotPaths.push({ points, closed: true });
            } else if (mode === 'points') {
              for (const pt of points) {
                const segments = 12;
                const circlePoints = [];
                for (let s = 0; s <= segments; s++) {
                  const angle = (s / segments) * Math.PI * 2;
                  circlePoints.push({
                    x: pt.x + Math.cos(angle) * pointSize,
                    y: pt.y + Math.sin(angle) * pointSize,
                  });
                }
                plotPaths.push({ points: circlePoints, closed: true });
              }
            } else if (mode === 'bars') {
              // Bars as radial lines from base radius to data radius
              for (let i = 0; i < values.length; i++) {
                const angle = (i / values.length) * Math.PI * 2 - Math.PI / 2;
                const r = baseRadius + values[i] * (maxRadius - baseRadius);
                plotPaths.push({
                  points: [
                    { x: cx + Math.cos(angle) * baseRadius, y: cy + Math.sin(angle) * baseRadius },
                    { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r },
                  ],
                  closed: false,
                });
              }
            }
          }
        }

        result = {
          paths: [{ id: 'dataPoints', paths: plotPaths }],
        };
        break;
      }

      // Random Select - split paths into two groups
      case 'randomSelect': {
        const inputLayers = inputValues.paths?.paths || [];
        const percentage = params.percentage as number;
        const selectSeed = params.selectSeed as number;
        const mode = params.mode as string;

        // Flatten all input paths
        const allPaths: Path[] = [];
        for (const layer of inputLayers) {
          allPaths.push(...layer.paths);
        }

        const selectedPaths: Path[] = [];
        const unselectedPaths: Path[] = [];

        // Create a seeded RNG specific to this node
        const selectRng = createSeededRng(selectSeed);

        if (mode === 'paths') {
          // Whole-path selection: each path is randomly selected or not
          for (const path of allPaths) {
            if (selectRng() * 100 < percentage) {
              selectedPaths.push(path);
            } else {
              unselectedPaths.push(path);
            }
          }
        } else {
          // Points mode: split individual points within each path
          for (const path of allPaths) {
            const selPoints: { x: number; y: number }[] = [];
            const unselPoints: { x: number; y: number }[] = [];

            for (const pt of path.points) {
              if (selectRng() * 100 < percentage) {
                selPoints.push(pt);
              } else {
                unselPoints.push(pt);
              }
            }

            // Create path segments from consecutive selected/unselected points
            if (selPoints.length > 0) {
              selectedPaths.push({ points: selPoints, closed: false });
            }
            if (unselPoints.length > 0) {
              unselectedPaths.push({ points: unselPoints, closed: false });
            }
          }
        }

        const selectedLayers: Layer[] = [{ id: 'selected', paths: selectedPaths }];
        const unselectedLayers: Layer[] = [{ id: 'unselected', paths: unselectedPaths }];

        result = {
          paths: selectedLayers,
          namedOutputs: {
            selected: selectedLayers,
            unselected: unselectedLayers,
          },
        };
        break;
      }

      // Index Select - select paths by index position
      case 'indexSelect': {
        const idxInputLayers = inputValues.paths?.paths || [];
        const idxMode = params.mode as string;
        const invert = params.invert as boolean;

        // Flatten all input paths
        const idxAllPaths: Path[] = [];
        for (const layer of idxInputLayers) {
          idxAllPaths.push(...layer.paths);
        }

        // Determine which indices are selected
        const selectedIndices = new Set<number>();
        const total = idxAllPaths.length;

        switch (idxMode) {
          case 'everyNth': {
            const n = Math.max(1, params.nValue as number);
            for (let i = 0; i < total; i += n) {
              selectedIndices.add(i);
            }
            break;
          }
          case 'range': {
            const start = Math.max(0, Math.floor(params.rangeStart as number));
            const end = Math.min(total - 1, Math.floor(params.rangeEnd as number));
            for (let i = start; i <= end; i++) {
              selectedIndices.add(i);
            }
            break;
          }
          case 'firstN': {
            const n = Math.max(0, Math.floor(params.nValueFirstN as number));
            for (let i = 0; i < Math.min(n, total); i++) {
              selectedIndices.add(i);
            }
            break;
          }
          case 'lastN': {
            const n = Math.max(0, Math.floor(params.nValueLastN as number));
            for (let i = Math.max(0, total - n); i < total; i++) {
              selectedIndices.add(i);
            }
            break;
          }
          case 'even': {
            for (let i = 0; i < total; i += 2) {
              selectedIndices.add(i);
            }
            break;
          }
          case 'odd': {
            for (let i = 1; i < total; i += 2) {
              selectedIndices.add(i);
            }
            break;
          }
        }

        // Split paths based on selection, respecting invert
        const idxSelectedPaths: Path[] = [];
        const idxUnselectedPaths: Path[] = [];

        for (let i = 0; i < total; i++) {
          const isSelected = invert ? !selectedIndices.has(i) : selectedIndices.has(i);
          if (isSelected) {
            idxSelectedPaths.push(idxAllPaths[i]);
          } else {
            idxUnselectedPaths.push(idxAllPaths[i]);
          }
        }

        const idxSelLayers: Layer[] = [{ id: 'selected', paths: idxSelectedPaths }];
        const idxUnselLayers: Layer[] = [{ id: 'unselected', paths: idxUnselectedPaths }];

        result = {
          paths: idxSelLayers,
          namedOutputs: {
            selected: idxSelLayers,
            unselected: idxUnselLayers,
          },
        };
        break;
      }

      // Region Select - select paths by spatial region
      case 'regionSelect': {
        const regInputLayers = inputValues.paths?.paths || [];
        const regShape = params.shape as string;
        const regCenterX = (params.centerX as number) / 100 * ctx.canvas.width;
        const regCenterY = (params.centerY as number) / 100 * ctx.canvas.height;
        const regRadius = (params.regionRadius as number) / 100 * ctx.canvas.width;
        const regWidth = (params.regionWidth as number) / 100 * ctx.canvas.width;
        const regHeight = (params.regionHeight as number) / 100 * ctx.canvas.height;
        const regFalloffX = (params.falloff as number) / 100 * ctx.canvas.width;
        const regFalloffY = (params.falloff as number) / 100 * ctx.canvas.width;
        const regInvert = params.invert as boolean;
        const regSelectBy = params.selectBy as string;

        // Flatten all input paths
        const regAllPaths: Path[] = [];
        for (const layer of regInputLayers) {
          regAllPaths.push(...layer.paths);
        }

        // Compute weight for a single point (0 = outside, 1 = fully inside, between = falloff)
        const pointWeight = (px: number, py: number): number => {
          if (regShape === 'circle') {
            const dx = px - regCenterX;
            const dy = py - regCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= regRadius) return 1;
            if (regFalloffX <= 0) return 0;
            if (dist >= regRadius + regFalloffX) return 0;
            return 1 - (dist - regRadius) / regFalloffX;
          } else {
            const halfW = regWidth / 2;
            const halfH = regHeight / 2;
            const distX = Math.abs(px - regCenterX) - halfW;
            const distY = Math.abs(py - regCenterY) - halfH;
            if (distX <= 0 && distY <= 0) return 1;
            if (regFalloffX <= 0 || regFalloffY <= 0) {
              return (distX <= 0 && distY <= 0) ? 1 : 0;
            }
            if (distX > regFalloffX || distY > regFalloffY) return 0;
            const wx = distX <= 0 ? 1 : 1 - distX / regFalloffX;
            const wy = distY <= 0 ? 1 : 1 - distY / regFalloffY;
            return wx * wy;
          }
        };

        // Compute weight for a path based on selectBy mode
        const pathWeight = (path: Path): number => {
          if (path.points.length === 0) return 0;

          if (regSelectBy === 'center') {
            let cx = 0, cy = 0;
            for (const pt of path.points) {
              cx += pt.x;
              cy += pt.y;
            }
            cx /= path.points.length;
            cy /= path.points.length;
            return pointWeight(cx, cy);
          } else if (regSelectBy === 'any') {
            let maxW = 0;
            for (const pt of path.points) {
              const w = pointWeight(pt.x, pt.y);
              if (w > maxW) maxW = w;
              if (maxW >= 1) break;
            }
            return maxW;
          } else {
            // 'all' — use minimum weight
            let minW = 1;
            for (const pt of path.points) {
              const w = pointWeight(pt.x, pt.y);
              if (w < minW) minW = w;
              if (minW <= 0) break;
            }
            return minW;
          }
        };

        const regSelectedPaths: Path[] = [];
        const regUnselectedPaths: Path[] = [];
        const regWeights: number[] = [];

        for (const path of regAllPaths) {
          const w = pathWeight(path);
          const effectiveW = regInvert ? 1 - w : w;
          regWeights.push(effectiveW);
          if (effectiveW > 0) {
            regSelectedPaths.push(path);
          } else {
            regUnselectedPaths.push(path);
          }
        }

        const regSelLayers: Layer[] = [{ id: 'selected', paths: regSelectedPaths }];
        const regUnselLayers: Layer[] = [{ id: 'unselected', paths: regUnselectedPaths }];

        result = {
          paths: regSelLayers,
          numberArray: regWeights,
          namedOutputs: {
            selected: regSelLayers,
            unselected: regUnselLayers,
            weight: regWeights,
          },
        };
        break;
      }

      // Noise Select - select paths based on Perlin noise field
      case 'noiseSelect': {
        const nsInputLayers = inputValues.paths?.paths || [];
        const nsThreshold = params.threshold as number;
        const nsScale = params.noiseScale as number;
        const nsSeed = params.noiseSeed as number;
        const nsOffsetX = params.offsetX as number;
        const nsOffsetY = params.offsetY as number;
        const nsInvert = params.invert as boolean;
        const nsSelectBy = params.selectBy as string;

        // Flatten all input paths
        const nsAllPaths: Path[] = [];
        for (const layer of nsInputLayers) {
          nsAllPaths.push(...layer.paths);
        }

        // Frequency factor: smaller scale param = higher frequency noise
        const freq = 1 / Math.max(1, nsScale);

        // Sample noise at a point, returns 0-1
        const sampleNoise = (px: number, py: number): number => {
          return noise2D((px + nsOffsetX) * freq, (py + nsOffsetY) * freq, nsSeed);
        };

        // Compute noise weight for a path based on selectBy mode
        const nsPathWeight = (path: Path): number => {
          if (path.points.length === 0) return 0;

          if (nsSelectBy === 'center') {
            let cx = 0, cy = 0;
            for (const pt of path.points) {
              cx += pt.x;
              cy += pt.y;
            }
            cx /= path.points.length;
            cy /= path.points.length;
            return sampleNoise(cx, cy);
          } else if (nsSelectBy === 'any') {
            let maxW = 0;
            for (const pt of path.points) {
              const w = sampleNoise(pt.x, pt.y);
              if (w > maxW) maxW = w;
            }
            return maxW;
          } else {
            // 'all' — use minimum noise value
            let minW = 1;
            for (const pt of path.points) {
              const w = sampleNoise(pt.x, pt.y);
              if (w < minW) minW = w;
            }
            return minW;
          }
        };

        const nsSelectedPaths: Path[] = [];
        const nsUnselectedPaths: Path[] = [];
        const nsWeights: number[] = [];

        for (const path of nsAllPaths) {
          const w = nsPathWeight(path);
          const effectiveW = nsInvert ? 1 - w : w;
          nsWeights.push(effectiveW);
          const selected = effectiveW > nsThreshold;
          if (selected) {
            nsSelectedPaths.push(path);
          } else {
            nsUnselectedPaths.push(path);
          }
        }

        const nsSelLayers: Layer[] = [{ id: 'selected', paths: nsSelectedPaths }];
        const nsUnselLayers: Layer[] = [{ id: 'unselected', paths: nsUnselectedPaths }];

        result = {
          paths: nsSelLayers,
          numberArray: nsWeights,
          namedOutputs: {
            selected: nsSelLayers,
            unselected: nsUnselLayers,
            weight: nsWeights,
          },
        };
        break;
      }

      // Selection Merge - combine two path sets with boolean operations
      case 'selectionMerge': {
        const layersA = inputValues.pathsA?.paths || [];
        const layersB = inputValues.pathsB?.paths || [];

        // Flatten input paths
        const pathsA: Path[] = [];
        for (const layer of layersA) {
          pathsA.push(...layer.paths);
        }
        const pathsB: Path[] = [];
        for (const layer of layersB) {
          pathsB.push(...layer.paths);
        }

        const operation = params.operation as string;
        const TOLERANCE = 0.001;

        // Compare two paths by point coordinates within tolerance
        const pathsMatch = (a: Path, b: Path): boolean => {
          if (a.points.length !== b.points.length) return false;
          for (let i = 0; i < a.points.length; i++) {
            if (
              Math.abs(a.points[i].x - b.points[i].x) > TOLERANCE ||
              Math.abs(a.points[i].y - b.points[i].y) > TOLERANCE
            ) {
              return false;
            }
          }
          return true;
        };

        // Check if a path exists in a set
        const pathInSet = (path: Path, set: Path[]): boolean => {
          return set.some((s) => pathsMatch(path, s));
        };

        let resultPaths: Path[];

        switch (operation) {
          case 'union': {
            // All from A, plus anything in B not already in A
            resultPaths = [...pathsA];
            for (const pb of pathsB) {
              if (!pathInSet(pb, pathsA)) {
                resultPaths.push(pb);
              }
            }
            break;
          }
          case 'intersect': {
            // Only paths that appear in both A and B
            resultPaths = pathsA.filter((pa) => pathInSet(pa, pathsB));
            break;
          }
          case 'subtract': {
            // Paths from A that are NOT in B
            resultPaths = pathsA.filter((pa) => !pathInSet(pa, pathsB));
            break;
          }
          case 'difference': {
            // Paths in A or B but NOT both (XOR)
            const onlyA = pathsA.filter((pa) => !pathInSet(pa, pathsB));
            const onlyB = pathsB.filter((pb) => !pathInSet(pb, pathsA));
            resultPaths = [...onlyA, ...onlyB];
            break;
          }
          default:
            resultPaths = [...pathsA, ...pathsB];
        }

        result = {
          paths: [{ id: 'result', paths: resultPaths }],
        };
        break;
      }

      // Weighted Blend - blend between original and modified paths by weight
      case 'weightedBlend': {
        const origLayers = inputValues.original?.paths || [];
        const modLayers = inputValues.modified?.paths || [];
        const weightsArr = inputValues.weights?.numberArray || [];
        const defaultWeight = params.defaultWeight as number;
        const invertWeights = params.invertWeights as boolean;

        // Flatten paths
        const origPaths: Path[] = [];
        for (const layer of origLayers) {
          origPaths.push(...layer.paths);
        }
        const modPaths: Path[] = [];
        for (const layer of modLayers) {
          modPaths.push(...layer.paths);
        }

        const blendedPaths: Path[] = [];
        const count = Math.max(origPaths.length, modPaths.length);

        for (let i = 0; i < count; i++) {
          const orig = origPaths[i];
          const mod = modPaths[i];

          // Get weight for this path index
          let w = i < weightsArr.length ? weightsArr[i] : defaultWeight;
          w = Math.max(0, Math.min(1, w));
          if (invertWeights) w = 1 - w;

          if (!orig && mod) {
            // No original — use modified scaled by weight (or skip if w=0)
            if (w > 0) blendedPaths.push(mod);
          } else if (orig && !mod) {
            // No modified — use original
            blendedPaths.push(orig);
          } else if (orig && mod) {
            if (w === 0) {
              blendedPaths.push(orig);
            } else if (w === 1) {
              blendedPaths.push(mod);
            } else {
              // Interpolate point positions
              const blendedPoints: { x: number; y: number }[] = [];
              const len = orig.points.length;
              for (let j = 0; j < len; j++) {
                const op = orig.points[j];
                // If modified has fewer points, clamp to last modified point
                const mp = j < mod.points.length
                  ? mod.points[j]
                  : mod.points[mod.points.length - 1];
                blendedPoints.push({
                  x: op.x + (mp.x - op.x) * w,
                  y: op.y + (mp.y - op.y) * w,
                });
              }
              blendedPaths.push({ points: blendedPoints, closed: orig.closed });
            }
          }
        }

        result = {
          paths: [{ id: 'weightedBlend', paths: blendedPaths }],
        };
        break;
      }

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
