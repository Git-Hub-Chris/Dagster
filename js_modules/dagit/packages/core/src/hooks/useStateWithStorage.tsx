import React from 'react';

export function getJSONForKey(key: string) {
  let stored = undefined;
  try {
    stored = window.localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    if (typeof stored === 'string') {
      // With useStateWithStorage, some values like timezone are moving from `UTC` to `"UTC"`
      // in LocalStorage. To read the old values, pass through raw string values. We can
      // remove this a few months after 0.14.1 is released.
      return stored;
    }
    return undefined;
  }
}

export function useStateWithStorage<T>(key: string, validate: (json: any) => T) {
  const [version, setVersion] = React.useState(0);

  // Note: This hook doesn't keep the loaded data in state -- instead it uses a version bit and
  // a ref to load the value from localStorage when the `key` changes or when the `version` changes.
  // This allows us to immediately return the saved value for `key` in the same render.

  const state = React.useMemo(() => {
    return validate(getJSONForKey(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validate, key, version]);

  const setState = React.useCallback(
    (input: React.SetStateAction<T>) => {
      const next = input instanceof Function ? input(validate(getJSONForKey(key))) : input;
      if (next === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      setVersion((v) => v + 1);
      return next;
    },
    [validate, key],
  );

  const value = React.useMemo(() => [state, setState], [state, setState]);
  return value as [T, React.Dispatch<React.SetStateAction<T | undefined>>];
}
