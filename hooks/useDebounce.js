// hooks/useDebounce.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounces a reactive state value.
 * Automatically clears delay when value is empty to keep search resets instant.
 *
 * @param {*} value - The input value to debounce.
 * @param {number} [delay=400] - The debounce duration in milliseconds.
 * @returns {*} The debounced value.
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Instant update on empty string for snappy query resets
    if (value === '') {
      setDebouncedValue('');
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounces an imperative callback function (e.g., auto-save, search API triggers).
 *
 * @param {Function} callback - The function to debounce.
 * @param {number} [delay=400] - The debounce duration in milliseconds.
 * @returns {Function} The memoized debounced callback.
 */
export function useDebouncedCallback(callback, delay = 400) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback reference updated without re-creating the timer
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

export default useDebounce;