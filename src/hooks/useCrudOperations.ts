import { useState, useCallback, useEffect } from 'react';
import { db } from '../db/database';

type CrudOperations<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  create: (item: Omit<T, 'id'>) => Promise<string | undefined>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => T | undefined;
  refresh: () => Promise<void>;
};

export function useCrudOperations<T extends { id?: string }>(
  tableName: 'storylets' | 'storyArcs' | 'characters' | 'clues',
  zustandStore?: {
    items: T[];
    add: (item: T) => void;
    update: (id: string, updates: Partial<T>) => void;
    remove: (id: string) => void;
  }
): CrudOperations<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db[tableName].toArray();
      const typedData = data as unknown as T[];
      setItems(typedData);
      
      // Sync with Zustand if store is provided
      if (zustandStore) {
        typedData.forEach(item => {
          if (!zustandStore.items.find(i => i.id === item.id)) {
            zustandStore.add(item);
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tableName, zustandStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const create = useCallback(async (item: Omit<T, 'id'>) => {
    try {
      const newItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as T;

      await db[tableName].add(newItem as any);
      setItems(prev => [...prev, newItem]);
      
      if (zustandStore) {
        zustandStore.add(newItem);
      }
      
      return newItem.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      throw err;
    }
  }, [tableName, zustandStore]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const updatedItem = {
        ...updates,
        id,
        updatedAt: new Date()
      };

      await (db[tableName] as any).update(id, updatedItem);
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      ));
      
      if (zustandStore) {
        zustandStore.update(id, updatedItem);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    }
  }, [tableName, zustandStore]);

  const remove = useCallback(async (id: string) => {
    try {
      await db[tableName].delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
      
      if (zustandStore) {
        zustandStore.remove(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    }
  }, [tableName, zustandStore]);

  const getById = useCallback((id: string) => {
    return items.find(item => item.id === id);
  }, [items]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    items,
    loading,
    error,
    create,
    update,
    remove,
    getById,
    refresh
  };
}