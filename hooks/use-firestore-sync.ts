"use client";

import { useEffect, useState } from "react";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";

export type FirestoreProjectData = {
  projectId: string;
  title: string;
  files: Array<{
    path: string;
    content?: string;
    type?: string;
  }>;
  fileCount: number;
  metadata?: Record<string, unknown>;
  userId: string;
  updatedAt?: unknown;
};

export function useFirestoreProjectSync(projectId: string | null | undefined) {
  const [project, setProject] = useState<FirestoreProjectData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !isFirebaseConfigured() || typeof window === "undefined") {
      setIsLive(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { getFirestore, doc, onSnapshot } = await import("firebase/firestore");
        const auth = getFirebaseAuth();
        const db = getFirestore(auth.app);
        const docRef = doc(db, "idealy_projects", projectId);

        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as FirestoreProjectData;
              setProject(data);
              setLastSyncedAt(new Date());
              setIsLive(true);
              setError(null);
            }
          },
          (err) => {
            console.warn("[Firestore Realtime Sync]", err.message);
            setError(err.message);
            setIsLive(false);
          }
        );
      } catch (err) {
        console.warn("[Firestore Hook Fallback]", err);
        setIsLive(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId]);

  return { project, isLive, lastSyncedAt, error };
}
