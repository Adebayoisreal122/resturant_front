"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

/** Runs an async loader and tracks loading/error. Re-runs when `key` changes; skips when key is null. */
export function useApi<T>(loader: () => Promise<T>, key: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(key !== null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key === null) { setLoading(false); return; }
    run();
  }, [key, run]);

  return { data, setData, error, loading, reload: run };
}
