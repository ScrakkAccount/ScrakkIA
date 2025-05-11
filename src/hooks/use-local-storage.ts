"use client";

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with initialValue.
  // This ensures the server and the client's first render output are identical.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn(`Tried to set localStorage key "${key}" on the server.`);
        // Update React state if on server, but don't attempt localStorage interaction.
        setStoredValue(prevState => value instanceof Function ? value(prevState) : value);
        return;
      }
      try {
        // Use functional update for setStoredValue to ensure we're working with the latest state.
        setStoredValue(prevState => {
          const valueToStore = value instanceof Function ? value(prevState) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key] // `key` is stable. `setStoredValue` from `useState` is stable.
  );
  
  // Hydration effect: This runs once on the client after mount to sync with localStorage.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const itemStr = window.localStorage.getItem(key);
    if (itemStr !== null) {
      try {
        const parsedItem = JSON.parse(itemStr);
        setStoredValue(parsedItem); // Update state with value from localStorage
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}": "${itemStr}". Using initialValue.`, error);
        // If parsing fails, state remains initialValue, which was set by useState.
        // Optionally, correct the localStorage item if it was malformed,
        // but for now, just ensuring React state is consistent.
        // window.localStorage.setItem(key, JSON.stringify(initialValue)); 
      }
    }
    // If itemStr is null, `storedValue` (already initialized by useState with initialValue) remains.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Dependencies are stable (key, initialValue could be added but key is primary trigger for LS interaction).
              // initialValue is used by useState, this effect is for loading from LS.

  return [storedValue, setValue];
}

export default useLocalStorage;
