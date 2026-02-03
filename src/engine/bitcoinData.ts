import { useNodeStore } from '../store/nodeStore';

export interface BitcoinData {
  high: number;
  low: number;
  open: number;
  close: number;
  current: number;
  volume: number;
  change: number; // percentage
  history: number[]; // raw price values over time
}

interface CacheEntry {
  data: BitcoinData;
  days: number;
  refreshKey: number;
  fetchedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_DATA: BitcoinData = {
  high: 0,
  low: 0,
  open: 0,
  close: 0,
  current: 0,
  volume: 0,
  change: 0,
  history: [],
};

// Module-level cache keyed by nodeId
const cache = new Map<string, CacheEntry>();
const pendingFetches = new Set<string>();

function getCacheKey(nodeId: string): string {
  return nodeId;
}

function isCacheValid(entry: CacheEntry, days: number, refreshKey: number): boolean {
  if (entry.days !== days) return false;
  if (entry.refreshKey !== refreshKey) return false;
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return false;
  return true;
}

async function fetchBitcoinData(days: number): Promise<BitcoinData> {
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const json = await response.json();
  const prices: [number, number][] = json.prices || [];
  const volumes: [number, number][] = json.total_volumes || [];

  if (prices.length === 0) {
    throw new Error('No price data returned');
  }

  const priceValues = prices.map(([, v]) => v);
  const high = Math.max(...priceValues);
  const low = Math.min(...priceValues);
  const open = priceValues[0];
  const close = priceValues[priceValues.length - 1];
  const current = close;
  const volume = volumes.length > 0 ? volumes[volumes.length - 1][1] : 0;
  const change = open !== 0 ? ((close - open) / open) * 100 : 0;

  return { high, low, open, close, current, volume, change, history: priceValues };
}

/**
 * Get Bitcoin data for a node. Returns cached data synchronously.
 * If cache is stale or missing, starts an async fetch and returns
 * last-known or default values.
 */
export function getBitcoinData(
  nodeId: string,
  days: number,
  refreshKey: number
): BitcoinData {
  const key = getCacheKey(nodeId);
  const entry = cache.get(key);

  // Return cached data if valid
  if (entry && isCacheValid(entry, days, refreshKey)) {
    return entry.data;
  }

  // Start async fetch if not already in progress
  const fetchId = `${key}:${days}:${refreshKey}`;
  if (!pendingFetches.has(fetchId)) {
    pendingFetches.add(fetchId);

    fetchBitcoinData(days)
      .then((data) => {
        cache.set(key, {
          data,
          days,
          refreshKey,
          fetchedAt: Date.now(),
        });
        // Trigger re-execution so the node picks up the new data
        useNodeStore.getState().triggerExecution();
      })
      .catch((err) => {
        console.warn('Bitcoin data fetch failed:', err);
        // On error, cache defaults so we don't spam retries
        // (cache will expire after TTL and retry)
        if (!cache.has(key)) {
          cache.set(key, {
            data: DEFAULT_DATA,
            days,
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

/**
 * Check if a fetch is currently in progress for a node.
 */
export function isBitcoinDataLoading(nodeId: string): boolean {
  for (const fetchId of pendingFetches) {
    if (fetchId.startsWith(getCacheKey(nodeId) + ':')) {
      return true;
    }
  }
  return false;
}
