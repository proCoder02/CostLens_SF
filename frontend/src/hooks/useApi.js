import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic async data-fetching hook.
 * Usage:
 *   const { data, loading, error, refetch } = useApi(dashboardAPI.getSummary, [30]);
 */
export function useApi(apiFn, args = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const execute = useCallback(
    async (...overrideArgs) => {
      setLoading(true);
      setError(null);
      try {
        const callArgs = overrideArgs.length > 0 ? overrideArgs : args;
        const result = await apiFn(...callArgs);
        if (mountedRef.current) {
          setData(result);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err.response?.data?.detail || err.message || 'Something went wrong');
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFn, ...args]
  );

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [execute, immediate]);

  return { data, loading, error, refetch: execute, setData };
}

/**
 * Hook for mutations (POST/PUT/DELETE) — does not auto-execute.
 */
export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        return result;
      } catch (err) {
        const msg = err.response?.data?.detail || err.message;
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  return { mutate, loading, error };
}
