/**
 * collabService.ts
 * Système de collaboration temps réel via Yjs + y-webrtc.
 * Permet à plusieurs utilisateurs de modifier le même projet simultanément.
 */
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface CollabState {
  doc: Y.Doc;
  provider: WebrtcProvider;
  users: Map<string, CollabUser>;
  awareness: WebrtcProvider['awareness'];
}

const SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

let activeCollab: CollabState | null = null;

/**
 * Crée ou rejoins une room de collaboration.
 * @param roomId - Identifiant unique de la room (ex: ID de la mission)
 * @param user - Informations sur l'utilisateur local
 */
export function joinCollabRoom(
  roomId: string,
  user: { name: string; color: string }
): CollabState {
  // Détruire la session précédente si elle existe
  if (activeCollab) {
    leaveCollabRoom();
  }

  const doc = new Y.Doc();
  const provider = new WebrtcProvider(`idealy-${roomId}`, doc, {
    signaling: SIGNALING_SERVERS,
    password: `idealy-secure-${roomId}`,
    awareness: undefined,
    maxConns: 20,
    filterBcConns: true,
    peerOpts: {},
  });

  // Définir les métadonnées locales (apparaissent pour les autres)
  const localUserId = `user-${Math.random().toString(36).slice(2, 9)}`;
  provider.awareness.setLocalStateField('user', {
    id: localUserId,
    name: user.name,
    color: user.color,
  });

  const users = new Map<string, CollabUser>();

  // Écouter les changements de présence
  provider.awareness.on('change', () => {
    users.clear();
    provider.awareness.getStates().forEach((state, clientId) => {
      if (state.user && clientId !== provider.awareness.clientID) {
        users.set(String(clientId), state.user as CollabUser);
      }
    });
  });

  activeCollab = { doc, provider, users, awareness: provider.awareness };
  return activeCollab;
}

/**
 * Quitte la room de collaboration active.
 */
export function leaveCollabRoom(): void {
  if (activeCollab) {
    activeCollab.provider.disconnect();
    activeCollab.provider.destroy();
    activeCollab.doc.destroy();
    activeCollab = null;
  }
}

/**
 * Obtient le document Y partagé pour synchroniser un champ spécifique.
 */
export function getSharedText(fieldName: string): Y.Text | null {
  if (!activeCollab) return null;
  return activeCollab.doc.getText(fieldName);
}

/**
 * Obtient le Map Y partagé pour les données structurées (ex: schéma IUPS).
 */
export function getSharedMap(mapName: string): Y.Map<unknown> | null {
  if (!activeCollab) return null;
  return activeCollab.doc.getMap(mapName);
}

/**
 * Retourne la session de collaboration active.
 */
export function getActiveCollab(): CollabState | null {
  return activeCollab;
}
