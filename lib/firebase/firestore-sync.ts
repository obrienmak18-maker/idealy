/**
 * lib/firebase/firestore-sync.ts
 *
 * Cloud Firestore Additive Persistence & Live Sync.
 * Safely persists project file trees, metadata (.idealy/project.json, .idealy/rules.md),
 * and chat snapshots to Firestore alongside PostgreSQL.
 *
 * Designed to be 100% resilient: never throws or disrupts execution if Firebase
 * credentials are missing or the connection is offline.
 */

import { isFirebaseAdminConfigured } from "./admin";

export type FirestoreProjectSyncInput = {
  projectId: string;
  title: string;
  files: Array<{
    path: string;
    content?: string;
    type?: string;
  }>;
  metadata?: Record<string, unknown>;
  userId?: string;
};

export type FirestoreChatSyncInput = {
  chatId: string;
  title?: string;
  messages: Array<Record<string, unknown>>;
  userId?: string;
  metadata?: Record<string, unknown>;
};

export type FirestoreSyncResult = {
  success: boolean;
  syncedAt?: string;
  docId?: string;
  fileCount?: number;
  reason?: string;
};

/**
 * Server-side Firestore synchronization for project trees & artifacts.
 */
export async function syncProjectToFirestoreServer(
  input: FirestoreProjectSyncInput
): Promise<FirestoreSyncResult> {
  if (!isFirebaseAdminConfigured()) {
    return {
      success: false,
      reason: "firebase_admin_unconfigured",
    };
  }

  try {
    const { getAdminApp } = await import("./admin");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const projectRef = db.collection("idealy_projects").doc(input.projectId);

    // Filter files and create preview summary
    const fileSummary = input.files.map((f) => ({
      path: f.path,
      type: f.type || "file",
      size: typeof f.content === "string" ? f.content.length : 0,
    }));

    await projectRef.set(
      {
        projectId: input.projectId,
        title: input.title,
        files: input.files,
        fileSummary,
        fileCount: input.files.length,
        metadata: input.metadata ?? {},
        userId: input.userId ?? "anonymous",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      syncedAt: new Date().toISOString(),
      docId: input.projectId,
      fileCount: input.files.length,
    };
  } catch (error) {
    console.warn(
      "[Firestore Project Sync Fallback]",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

/**
 * Server-side Firestore synchronization for chat snapshots.
 */
export async function syncChatSnapshotToFirestoreServer(
  input: FirestoreChatSyncInput
): Promise<FirestoreSyncResult> {
  if (!isFirebaseAdminConfigured()) {
    return {
      success: false,
      reason: "firebase_admin_unconfigured",
    };
  }

  try {
    const { getAdminApp } = await import("./admin");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const chatRef = db.collection("idealy_chats").doc(input.chatId);

    await chatRef.set(
      {
        chatId: input.chatId,
        title: input.title ?? "Conversation",
        messagesCount: input.messages.length,
        messages: input.messages.slice(-50), // keep latest 50 messages snapshot
        userId: input.userId ?? "anonymous",
        metadata: input.metadata ?? {},
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      syncedAt: new Date().toISOString(),
      docId: input.chatId,
    };
  } catch (error) {
    console.warn(
      "[Firestore Chat Sync Fallback]",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
