type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

export type FirebaseUserLike = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type FirebaseModules = {
  auth: import('firebase/auth').Auth;
  firebase: typeof import('firebase/auth');
};

let modulesPromise: Promise<FirebaseModules | null> | null = null;

function getFirebaseConfig(): FirebaseConfig | null {
  const values = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  };
  if (!values.apiKey || !values.authDomain || !values.projectId || !values.appId) return null;
  return values as FirebaseConfig;
}

export function isFirebaseAuthConfigured(): boolean {
  return Boolean(getFirebaseConfig());
}

async function loadFirebase(): Promise<FirebaseModules | null> {
  const config = getFirebaseConfig();
  if (!config) return null;
  if (!modulesPromise) {
    modulesPromise = Promise.all([import('firebase/app'), import('firebase/auth')]).then(([appModule, authModule]) => {
      const app = appModule.getApps().length > 0
        ? appModule.getApps()[0]
        : appModule.initializeApp(config);
      return { auth: authModule.getAuth(app), firebase: authModule };
    }).catch((error) => {
      modulesPromise = null;
      throw error;
    });
  }
  return modulesPromise;
}

function toUser(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): FirebaseUserLike {
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const modules = await loadFirebase();
  const user = modules?.auth.currentUser;
  return user ? user.getIdToken(false) : null;
}

export async function signInWithFirebaseGoogle(): Promise<FirebaseUserLike> {
  const modules = await loadFirebase();
  if (!modules) throw new Error('Firebase Auth n’est pas configuré.');
  const provider = new modules.firebase.GoogleAuthProvider();
  return toUser((await modules.firebase.signInWithPopup(modules.auth, provider)).user);
}

export async function signInWithFirebaseGithub(): Promise<FirebaseUserLike> {
  const modules = await loadFirebase();
  if (!modules) throw new Error('Firebase Auth n’est pas configuré.');
  const provider = new modules.firebase.GithubAuthProvider();
  return toUser((await modules.firebase.signInWithPopup(modules.auth, provider)).user);
}

export async function signInWithFirebaseEmail(email: string, password: string): Promise<FirebaseUserLike> {
  const modules = await loadFirebase();
  if (!modules) throw new Error('Firebase Auth n’est pas configuré.');
  return toUser((await modules.firebase.signInWithEmailAndPassword(modules.auth, email, password)).user);
}

export async function signUpWithFirebaseEmail(email: string, password: string): Promise<FirebaseUserLike> {
  const modules = await loadFirebase();
  if (!modules) throw new Error('Firebase Auth n’est pas configuré.');
  return toUser((await modules.firebase.createUserWithEmailAndPassword(modules.auth, email, password)).user);
}

export async function signOutFirebase(): Promise<void> {
  const modules = await loadFirebase();
  if (modules) await modules.firebase.signOut(modules.auth);
}

export async function getFirebaseCurrentUser(): Promise<FirebaseUserLike | null> {
  const modules = await loadFirebase();
  return modules?.auth.currentUser ? toUser(modules.auth.currentUser) : null;
}

export async function subscribeFirebaseAuth(listener: (user: FirebaseUserLike | null) => void): Promise<() => void> {
  const modules = await loadFirebase();
  if (!modules) return () => undefined;
  return modules.firebase.onAuthStateChanged(modules.auth, (user) => listener(user ? toUser(user) : null));
}
