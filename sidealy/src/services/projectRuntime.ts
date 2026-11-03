import {
  WebContainer,
  type FileSystemTree,
  type WebContainerProcess,
} from "@webcontainer/api";
import type { MissionWorkspaceFile } from "../types";

export type ProjectRuntimeState =
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "stopped"
  | "error";

export type ProjectRuntimeCallbacks = {
  onOutput: (text: string) => void;
  onState: (state: ProjectRuntimeState) => void;
};

let containerPromise: Promise<WebContainer> | null = null;
let activeProcess: WebContainerProcess | null = null;
let runSequence = 0;

function getContainer(): Promise<WebContainer> {
  if (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
    throw new Error(
      "Le runtime du navigateur nécessite l’isolation sécurisée. Rechargez la page après le redémarrage du serveur local.",
    );
  }
  containerPromise ??= WebContainer.boot({
    coep: "credentialless",
    workdirName: "idealy",
  }).catch((error: unknown) => {
    containerPromise = null;
    throw error;
  });
  return containerPromise;
}

function createFileTree(files: MissionWorkspaceFile[]): FileSystemTree {
  const tree: FileSystemTree = {};
  const currentFiles = new Map<string, MissionWorkspaceFile>();

  for (const file of files) {
    if (file.status && !["saved", "validated"].includes(file.status)) continue;
    const path = file.path.replaceAll("\\", "/").replace(/^\/+/, "");
    const segments = path.split("/").filter(Boolean);
    if (
      segments.length === 0 ||
      segments.some((segment) => segment === "." || segment === "..")
    ) {
      throw new Error(`Chemin de fichier non valide : ${file.path}`);
    }
    if (segments.some((segment) => ["node_modules", ".git"].includes(segment)))
      continue;

    const previous = currentFiles.get(path);
    if (!previous || (file.version ?? 0) >= (previous.version ?? 0))
      currentFiles.set(path, file);
  }

  for (const [path, file] of currentFiles) {
    const segments = path.split("/");
    let cursor = tree;
    for (const segment of segments.slice(0, -1)) {
      const existing = cursor[segment];
      if (existing && !("directory" in existing))
        throw new Error(`Le chemin ${segment} est déjà utilisé comme fichier.`);
      if (!existing) cursor[segment] = { directory: {} };
      cursor = (cursor[segment] as { directory: FileSystemTree }).directory;
    }
    const fileName = segments.at(-1)!;
    if (cursor[fileName] && "directory" in cursor[fileName]!)
      throw new Error(`Le chemin ${path} est déjà utilisé comme dossier.`);
    cursor[fileName] = { file: { contents: file.content } };
  }
  return tree;
}

function normalizeWorkspacePath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        segment === "." || segment === ".." || ["node_modules", ".git"].includes(segment),
    )
  ) {
    throw new Error(`Chemin de fichier non valide : ${path}`);
  }
  return `workspace/${segments.join("/")}`;
}

export async function updateProjectPreviewFile(
  path: string,
  content: string,
): Promise<boolean> {
  const processAtStart = activeProcess;
  if (!processAtStart) return false;
  const container = await getContainer();
  if (processAtStart !== activeProcess) return false;
  await container.fs.writeFile(normalizeWorkspacePath(path), content);
  return processAtStart === activeProcess;
}

function streamOutput(
  process: WebContainerProcess,
  onOutput: (text: string) => void,
): Promise<void> {
  return (async () => {
    const reader = process.output.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) onOutput(value);
      }
    } finally {
      reader.releaseLock();
    }
  })();
}

export async function startProjectPreview(
  files: MissionWorkspaceFile[],
  callbacks: ProjectRuntimeCallbacks,
): Promise<string> {
  let cleanupReadyWait = () => {};
  const thisRun = ++runSequence;
  activeProcess?.kill();
  activeProcess = null;
  const log = (text: string) => {
    if (thisRun === runSequence && text) callbacks.onOutput(text);
  };

  try {
    callbacks.onState("booting");
    log("Préparation du runtime Node.js dans ce navigateur…\n");
    const container = await getContainer();
    if (thisRun !== runSequence) return "";

    const currentFiles = files.filter(
      (file) => !file.status || ["saved", "validated"].includes(file.status),
    );
    const manifest = currentFiles.find(
      (file) => file.path.replaceAll("\\", "/").replace(/^\/+/, "") === "package.json",
    );
    if (!manifest)
      throw new Error("Le projet ne contient pas de package.json à la racine.");

    const packageJson = JSON.parse(manifest.content) as {
      scripts?: Record<string, unknown>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const startScript =
      typeof packageJson.scripts?.dev === "string"
        ? "dev"
        : typeof packageJson.scripts?.start === "string"
          ? "start"
          : null;
    if (!startScript)
      throw new Error(
        "Ajoutez un script « dev » ou « start » dans package.json pour lancer l’application.",
      );

    await container.fs.rm("workspace", { force: true, recursive: true });
    await container.mount(createFileTree(currentFiles), {
      mountPoint: "workspace",
    });

    callbacks.onState("installing");
    const hasNpmLock = currentFiles.some((file) =>
      ["package-lock.json", "npm-shrinkwrap.json"].includes(
        file.path.replaceAll("\\", "/").replace(/^\/+/, ""),
      ),
    );
    const installArgs = hasNpmLock ? ["ci"] : ["install"];
    log(`\n$ npm ${installArgs.join(" ")}\n`);
    const installProcess = await container.spawn("npm", installArgs, {
      cwd: "workspace",
      terminal: { cols: 84, rows: 18 },
    });
    activeProcess = installProcess;
    const installOutput = streamOutput(installProcess, log);
    const installCode = await installProcess.exit;
    await installOutput;
    if (thisRun !== runSequence) return "";
    if (installCode !== 0)
      throw new Error(`npm ${installArgs[0]} s’est terminé avec le code ${installCode}.`);

    callbacks.onState("starting");
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const serverArgs = dependencies.next
      ? ["--", "--hostname", "0.0.0.0"]
      : dependencies.vite || dependencies.astro
        ? ["--", "--host", "0.0.0.0"]
        : [];
    log(`\n$ npm run ${startScript}${serverArgs.join(" ")}\n`);

    let serverReady = false;
    let rejectReady: (error: Error) => void = () => {};
    const ready = new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanupReadyWait();
        reject(new Error("Le serveur n’a pas ouvert de port après deux minutes. Consultez la sortie du terminal."));
      }, 120_000);
      rejectReady = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        cleanupReadyWait();
        reject(error);
      };
      const unsubscribe = container.on("server-ready", (_port, url) => {
        if (settled || thisRun !== runSequence) return;
        settled = true;
        serverReady = true;
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(url);
      });
      cleanupReadyWait = () => {
        window.clearTimeout(timeout);
        unsubscribe();
      };
    });

    const devProcess = await container.spawn(
      "npm",
      ["run", startScript, ...serverArgs],
      { cwd: "workspace", terminal: { cols: 84, rows: 18 } },
    );
    activeProcess = devProcess;
    void streamOutput(devProcess, log).catch((error: unknown) =>
      log(`\n${error instanceof Error ? error.message : "Erreur de lecture du terminal."}\n`),
    );
    void devProcess.exit.then((code) => {
      if (thisRun !== runSequence) return;
      if (activeProcess === devProcess) activeProcess = null;
      if (!serverReady) {
        rejectReady(
          new Error(
            `Le serveur s’est arrêté avant l’ouverture de l’aperçu (code ${code}).`,
          ),
        );
        return;
      }
      callbacks.onState(code === 0 ? "stopped" : "error");
      log(
        code === 0
          ? "\nLe serveur du projet s’est arrêté.\n"
          : `\nLe serveur du projet s’est arrêté avec le code ${code}.\n`,
      );
    });

    const url = await ready;
    if (thisRun !== runSequence) return "";
    callbacks.onState("ready");
    log(`\nAperçu disponible : ${url}\n`);
    return url;
  } catch (error) {
    cleanupReadyWait();
    if (thisRun !== runSequence) {
      callbacks.onState("stopped");
      return "";
    }
    callbacks.onState("error");
    throw error;
  }
}

export function stopProjectPreview(): void {
  runSequence += 1;
  activeProcess?.kill();
  activeProcess = null;
}
