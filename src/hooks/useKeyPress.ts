import { useEffect, useRef } from 'react';

type KeyCallback = (event: KeyboardEvent) => void;

export function useKeyPress(targetKey: string, callback: KeyCallback) {
  const callbackRef = useRef<KeyCallback>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        event.preventDefault();
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetKey]);
}
