import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { db } from './db';

/**
 * Live refresh for a table.
 * - Supabase realtime when in Live DB mode
 * - Custom events + light polling in sandbox so dispatch/maint show up immediately
 */
export function useRealtimeSync(table: string, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const fire = () => onUpdateRef.current();

    // Sandbox / cross-component live bus
    const onOps = (e: Event) => {
      const detail = (e as CustomEvent).detail as { table?: string } | undefined;
      if (!detail?.table || detail.table === table || detail.table === 'gps') {
        fire();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'transitops_ops_tick' ||
        e.key === `transitops_sandbox_${table}` ||
        e.key === 'transitops_live_dispatches'
      ) {
        fire();
      }
    };

    window.addEventListener('transitops:ops', onOps);
    window.addEventListener('storage', onStorage);

    // Light poll so multi-tab / missed events still refresh
    const poll = setInterval(fire, 5000);

    // Supabase realtime when available
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const mode = db.getMode();
    if (mode.includes('Live')) {
      channel = supabase
        .channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => fire()
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('transitops:ops', onOps);
      window.removeEventListener('storage', onStorage);
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [table]);
}
