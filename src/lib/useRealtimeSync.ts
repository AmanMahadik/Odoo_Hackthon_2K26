import { useEffect } from 'react';
import { supabase } from './supabase';
import { db } from './db';

export function useRealtimeSync(table: string, onUpdate: () => void) {
  useEffect(() => {
    // Only attempt real-time if we are using the live DB
    const mode = db.getMode();
    if (mode.includes('Live')) {
      const channel = supabase
        .channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          (payload) => {
            console.log(`Real-time change received on ${table}:`, payload);
            onUpdate();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [table, onUpdate]);
}
