import { useCallback, useEffect, useState } from 'react'

/**
 * Generic async resource loader for pages.
 * status: 'idle' | 'loading' | 'success' | 'error'
 *
 * Pass `enabled: false` to stay idle (e.g. Trade quote with no symbol).
 * Prefer a stable `loader` (useCallback) so fetches are not re-triggered every render.
 */
export default function useResource(loader, { enabled = true } = {}) {
  const [reloadKey, setReloadKey] = useState(0)
  const [snapshot, setSnapshot] = useState({
    reloadKey: -1,
    loader: null,
    data: null,
    error: null,
  })

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false
    const capturedKey = reloadKey
    const capturedLoader = loader

    Promise.resolve()
      .then(() => capturedLoader())
      .then((data) => {
        if (cancelled) return
        setSnapshot({
          reloadKey: capturedKey,
          loader: capturedLoader,
          data,
          error: null,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setSnapshot({
          reloadKey: capturedKey,
          loader: capturedLoader,
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        })
      })

    return () => {
      cancelled = true
    }
  }, [enabled, reloadKey, loader])

  const isCurrent =
    enabled &&
    snapshot.reloadKey === reloadKey &&
    snapshot.loader === loader

  let status
  if (!enabled) {
    status = 'idle'
  } else if (!isCurrent) {
    status = 'loading'
  } else if (snapshot.error) {
    status = 'error'
  } else {
    status = 'success'
  }

  return {
    data: isCurrent ? snapshot.data : null,
    status,
    error: isCurrent ? snapshot.error : null,
    reload,
  }
}
