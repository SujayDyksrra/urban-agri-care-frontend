import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { LocalData } from '../../types/models';
import { emptyData } from '../../types/models';
import { parseLocalData } from './parse';

const KEY = 'urban-agri-care:week2:v1';
type Store = { data: LocalData; ready: boolean; error: string | null; update: (change: (data: LocalData) => LocalData) => Promise<void> };
const Context = createContext<Store | null>(null);
export function LocalStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LocalData>(emptyData());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<LocalData>(emptyData());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const blocked = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      const loaded = raw ? parseLocalData(raw) : emptyData();
      current.current = loaded; setData(loaded);
    }).catch((cause) => { blocked.current = true; setError(`Saved data could not be read. It was not overwritten. ${String(cause)}`); }).finally(() => setReady(true));
  }, []);
  const update: Store['update'] = useCallback((change) => {
    const action = queue.current.catch(() => {}).then(async () => {
      if (blocked.current) throw new Error('Saved data is unreadable; writes are blocked to protect it.');
      const next = change(current.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      current.current = next; setData(next); setError(null);
    });
    queue.current = action;
    return action.catch((cause) => { const message = `Save failed: ${String(cause)}`; setError(message); throw cause; });
  }, []);
  return <Context.Provider value={{ data, ready, error, update }}>{children}</Context.Provider>;
}
export function useLocalStore() { const value = useContext(Context); if (!value) throw new Error('LocalStoreProvider missing'); return value; }
