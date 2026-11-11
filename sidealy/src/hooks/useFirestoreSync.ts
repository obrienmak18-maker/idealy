import { useEffect, useState } from "react";
import { ensureFirebaseConfigured, getFirebaseAuth } from "../services/firebase";

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
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      if (!projectId || typeof window === "undefined") {
        setIsLive(false);
        return;
      }

      try {
        // Sidealy's Firebase web config is fetched from the existing API project.
        // Wait for it before initializing Firebase after a hard page refresh.
        const configured = await ensureFirebaseConfigured();
        if (!active || !configured) {
          setIsLive(false);
          return;
        }

        const { getFirestore, doc, onSnapshot } = await import("firebase/firestore");
        const firebaseAuth = getFirebaseAuth();
        await firebaseAuth.authStateReady();
        if (!active) return;
        if (!firebaseAuth.currentUser) {
          setIsLive(false);
          return;
        }

        const db = getFirestore(firebaseAuth.app);
        const docRef = doc(db, "idealy_projects", projectId);

        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (!active) return;
            if (docSnap.exists()) {
              const data = docSnap.data() as FirestoreProjectData;
              setProject(data);
              setLastSyncedAt(new Date());
              setIsLive(true);
              setError(null);
            } else {
              setProject(null);
              setIsLive(false);
            }
          },
          (err) => {
            if (!active) return;
            console.warn("[Firestore Realtime Sync]", err.message);
            setError(err.message);
            setIsLive(false);
          }
        );
      } catch (err) {
        if (!active) return;
        console.warn("[Firestore Hook Fallback]", err);
        setIsLive(false);
      }
    };

    void setupListener();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [projectId]);

  return { project, isLive, lastSyncedAt, error };
}
