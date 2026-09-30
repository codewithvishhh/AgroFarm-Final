import { useCallback, useEffect, useState } from "react";

import { readCache, writeCache } from "../services/cache";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  reload: () => Promise<void>;
  setData: (value: T) => void;
}

/**
 * Request hook with an optional offline cache.
 *
 * Pass `cacheKey` for data the dashboard should still show when the API is
 * unreachable. A failed request never throws into the component tree.
 */
export function useFetch<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
): FetchState<T> {
  const [data, setData] = useState<T | null>(() =>
    cacheKey ? (readCache<T>(cacheKey)?.value ?? null) : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const value = await loader();
      setData(value);
      setFromCache(false);
      setError(null);
      if (cacheKey) writeCache(cacheKey, value);
    } catch (exception) {
      const cached = cacheKey ? readCache<T>(cacheKey) : null;
      if (cached) {
        setData(cached.value);
        setFromCache(true);
      }
      setError((exception as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, fromCache, reload: run, setData };
}
