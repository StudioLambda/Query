import { useMemo, useRef } from 'react'

function keysEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false
  }

  return arr1.every((value, index) => value === arr2[index])
}

export function useStableKeys(keys: string[]) {
  const prevKeysRef = useRef<string[]>([])

  function stableKeysHandler() {
    if (!keysEqual(prevKeysRef.current, keys)) {
      prevKeysRef.current = keys
    }

    return prevKeysRef.current
  }

  return useMemo(stableKeysHandler, [keys])
}
