"use client";

import { getAuth } from "firebase/auth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getFirebaseSupabaseClient } from "@/lib/firebase/supabase-client";

type PresenceState = Record<
  string,
  Array<{ userId?: string; connectedAt?: string }>
>;

export function RealtimePresence({ roomId }: { roomId: string | null }) {
  const [count, setCount] = useState(0);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setCount(0);
      setAvailable(false);
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    async function connect() {
      try {
        const user = getAuth().currentUser;
        if (!user) {
          if (!cancelled) {
            setCount(0);
            setAvailable(false);
          }
          return;
        }

        const supabase = getFirebaseSupabaseClient();
        channel = supabase.channel(`idealy-presence:${roomId}`, {
          config: {
            private: true,
            presence: { key: user.uid },
          },
        });

        const updateCount = () => {
          if (!channel || cancelled) return;
          const state = channel.presenceState() as PresenceState;
          const keys = new Set(Object.keys(state));
          setCount(keys.size);
          setAvailable(true);
        };

        channel
          .on("presence", { event: "sync" }, updateCount)
          .on("presence", { event: "join" }, updateCount)
          .on("presence", { event: "leave" }, updateCount);

        channel.subscribe(async (status) => {
          if (cancelled || !channel) return;
          if (status !== "SUBSCRIBED") {
            setAvailable(false);
            return;
          }

          const result = await channel.track({
            userId: user.uid,
            connectedAt: new Date().toISOString(),
          });

          if (result !== "ok") {
            setAvailable(false);
            return;
          }

          updateCount();
        });
      } catch {
        if (!cancelled) {
          setCount(0);
          setAvailable(false);
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (channel) {
        void channel.untrack();
        void channel.unsubscribe();
      }
    };
  }, [roomId]);

  if (!roomId || !available) return null;

  return (
    <div
      aria-label={`${count} utilisateur${count > 1 ? "s" : ""} actif${count > 1 ? "s" : ""}`}
      className="pointer-events-none fixed right-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-xl"
      title="Présence temps réel"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
      <UsersRound className="size-3.5" aria-hidden="true" />
      <span>{count} actif{count > 1 ? "s" : ""}</span>
    </div>
  );
}
