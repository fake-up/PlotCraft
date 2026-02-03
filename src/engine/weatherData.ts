import { useNodeStore } from '../store/nodeStore';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  cloudCover: number;
  uvIndex: number;
}

interface CacheEntry {
  data: WeatherData;
  latitude: number;
  longitude: number;
  refreshKey: number;
  fetchedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_DATA: WeatherData = {
  temperature: 0,
  humidity: 0,
  windSpeed: 0,
  precipitation: 0,
  cloudCover: 0,
  uvIndex: 0,
};

// Module-level cache keyed by nodeId
const cache = new Map<string, CacheEntry>();
const pendingFetches = new Set<string>();

function isCacheValid(entry: CacheEntry, latitude: number, longitude: number, refreshKey: number): boolean {
  if (entry.latitude !== latitude) return false;
  if (entry.longitude !== longitude) return false;
  if (entry.refreshKey !== refreshKey) return false;
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return false;
  return true;
}

async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,cloud_cover,uv_index&temperature_unit=fahrenheit&wind_speed_unit=mph`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const json = await response.json();
  const current = json.current;

  if (!current) {
    throw new Error('No current weather data returned');
  }

  return {
    temperature: current.temperature_2m ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    precipitation: current.precipitation ?? 0,
    cloudCover: current.cloud_cover ?? 0,
    uvIndex: current.uv_index ?? 0,
  };
}

/**
 * Get weather data for a node. Returns cached data synchronously.
 * If cache is stale or missing, starts an async fetch and returns
 * last-known or default values.
 */
export function getWeatherData(
  nodeId: string,
  latitude: number,
  longitude: number,
  refreshKey: number
): WeatherData {
  const entry = cache.get(nodeId);

  // Return cached data if valid
  if (entry && isCacheValid(entry, latitude, longitude, refreshKey)) {
    return entry.data;
  }

  // Start async fetch if not already in progress
  const fetchId = `${nodeId}:${latitude}:${longitude}:${refreshKey}`;
  if (!pendingFetches.has(fetchId)) {
    pendingFetches.add(fetchId);

    fetchWeatherData(latitude, longitude)
      .then((data) => {
        cache.set(nodeId, {
          data,
          latitude,
          longitude,
          refreshKey,
          fetchedAt: Date.now(),
        });
        // Trigger re-execution so the node picks up the new data
        useNodeStore.getState().triggerExecution();
      })
      .catch((err) => {
        console.warn('Weather data fetch failed:', err);
        // On error, cache defaults so we don't spam retries
        // (cache will expire after TTL and retry)
        if (!cache.has(nodeId)) {
          cache.set(nodeId, {
            data: DEFAULT_DATA,
            latitude,
            longitude,
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
