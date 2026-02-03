import { useNodeStore } from '../store/nodeStore';

export interface EarthquakeData {
  count: number;
  maxMagnitude: number;
  avgMagnitude: number;
  avgDepth: number;
  latestLat: number;
  latestLon: number;
  latestMag: number;
}

interface CacheEntry {
  data: EarthquakeData;
  timePeriod: string;
  minMagnitude: number;
  refreshKey: number;
  fetchedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_DATA: EarthquakeData = {
  count: 0,
  maxMagnitude: 0,
  avgMagnitude: 0,
  avgDepth: 0,
  latestLat: 0,
  latestLon: 0,
  latestMag: 0,
};

// Module-level cache keyed by nodeId
const cache = new Map<string, CacheEntry>();
const pendingFetches = new Set<string>();

function isCacheValid(entry: CacheEntry, timePeriod: string, minMagnitude: number, refreshKey: number): boolean {
  if (entry.timePeriod !== timePeriod) return false;
  if (entry.minMagnitude !== minMagnitude) return false;
  if (entry.refreshKey !== refreshKey) return false;
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return false;
  return true;
}

// Map minMagnitude to the closest USGS feed threshold
function getMagnitudeThreshold(minMagnitude: number): string {
  if (minMagnitude >= 4.5) return '4.5';
  if (minMagnitude >= 2.5) return '2.5';
  if (minMagnitude >= 1.0) return '1.0';
  return 'all';
}

async function fetchEarthquakeData(timePeriod: string, minMagnitude: number): Promise<EarthquakeData> {
  const threshold = getMagnitudeThreshold(minMagnitude);
  const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${threshold}_${timePeriod}.geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS API error: ${response.status}`);
  }

  const json = await response.json();
  const features: Array<{
    properties: { mag: number; time: number };
    geometry: { coordinates: [number, number, number] };
  }> = json.features || [];

  // Filter by exact minMagnitude since the feed threshold is coarse
  const filtered = features.filter((f) => (f.properties.mag ?? 0) >= minMagnitude);

  if (filtered.length === 0) {
    return DEFAULT_DATA;
  }

  const magnitudes = filtered.map((f) => f.properties.mag ?? 0);
  const depths = filtered.map((f) => f.geometry.coordinates[2] ?? 0);

  const maxMagnitude = Math.max(...magnitudes);
  const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;

  // Find the most recent earthquake (highest timestamp)
  let latest = filtered[0];
  for (const f of filtered) {
    if (f.properties.time > latest.properties.time) {
      latest = f;
    }
  }

  return {
    count: filtered.length,
    maxMagnitude,
    avgMagnitude: Math.round(avgMagnitude * 100) / 100,
    avgDepth: Math.round(avgDepth * 100) / 100,
    latestLat: latest.geometry.coordinates[1],
    latestLon: latest.geometry.coordinates[0],
    latestMag: latest.properties.mag ?? 0,
  };
}

/**
 * Get earthquake data for a node. Returns cached data synchronously.
 * If cache is stale or missing, starts an async fetch and returns
 * last-known or default values.
 */
export function getEarthquakeData(
  nodeId: string,
  timePeriod: string,
  minMagnitude: number,
  refreshKey: number
): EarthquakeData {
  const entry = cache.get(nodeId);

  // Return cached data if valid
  if (entry && isCacheValid(entry, timePeriod, minMagnitude, refreshKey)) {
    return entry.data;
  }

  // Start async fetch if not already in progress
  const fetchId = `${nodeId}:${timePeriod}:${minMagnitude}:${refreshKey}`;
  if (!pendingFetches.has(fetchId)) {
    pendingFetches.add(fetchId);

    fetchEarthquakeData(timePeriod, minMagnitude)
      .then((data) => {
        cache.set(nodeId, {
          data,
          timePeriod,
          minMagnitude,
          refreshKey,
          fetchedAt: Date.now(),
        });
        // Trigger re-execution so the node picks up the new data
        useNodeStore.getState().triggerExecution();
      })
      .catch((err) => {
        console.warn('Earthquake data fetch failed:', err);
        // On error, cache defaults so we don't spam retries
        // (cache will expire after TTL and retry)
        if (!cache.has(nodeId)) {
          cache.set(nodeId, {
            data: DEFAULT_DATA,
            timePeriod,
            minMagnitude,
            refreshKey,
            fetchedAt: Date.now(),
          });
        }
      })
      .finally(() => {
        pendingFetches.delete(fetchId);
      });
  }

  // Return last-known data or defaults while loading
  return entry?.data ?? DEFAULT_DATA;
}
