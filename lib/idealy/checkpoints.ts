import type { MissionFile } from "./mission-files";

export type CheckpointSnapshot = {
  checksum?: string;
  id: string;
  missionId: string;
  name: string;
  description?: string;
  createdAt: string;
  fileCount: number;
  files: Array<{
    path: string;
    version: number;
    checksum?: string;
  }>;
};

export type GitHubSyncOptions = {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  commitMessage?: string;
  files: MissionFile[];
};

export type GitHubSyncResult = {
  success: boolean;
  branch: string;
  commitSha?: string;
  htmlUrl?: string;
  filesCount: number;
  error?: string;
};

/**
 * Pousse les fichiers d'une mission vers un dépôt GitHub réel via l'API REST GitHub.
 * Utilise le Personal Access Token (PAT) ou le token OAuth GitHub de l'utilisateur.
 */
export async function syncMissionToGitHub(
  options: GitHubSyncOptions
): Promise<GitHubSyncResult> {
  const {
    token,
    owner,
    repo,
    branch = "main",
    commitMessage = "feat(idealy): sync mission workspace files",
    files,
  } = options;

  if (!token) {
    throw new Error("Token GitHub manquant. Connectez votre compte GitHub ou fournissez un token.");
  }

  if (!owner || !repo) {
    throw new Error("Propriétaire (owner) ou nom de dépôt (repo) invalide.");
  }

  const validFiles = files.filter(
    (f) => typeof f.content === "string" && f.content.length > 0
  );

  if (validFiles.length === 0) {
    throw new Error("Aucun fichier valide à pousser vers GitHub.");
  }

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "Idealy-Studio",
  };

  // 1. Vérifier si le dépôt est accessible
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Dépôt ${owner}/${repo} introuvable ou non accessible avec ce token.`);
    }
    if (repoRes.status === 401) {
      throw new Error("Token GitHub non autorisé ou expiré.");
    }
    const errPayload = await repoRes.json().catch(() => ({}));
    throw new Error(errPayload.message || `Erreur GitHub HTTP ${repoRes.status}`);
  }

  // 2. Vérifier si la branche existe, sinon récupérer la branche par défaut pour créer la nouvelle
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    { headers }
  );

  let baseSha: string | null = null;
  if (!branchRes.ok) {
    // Si la branche demandée n'existe pas, récupérer le SHA de la branche par défaut
    const defaultBranchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );
    const repoInfo = await defaultBranchRes.json();
    const defaultBranchName = repoInfo.default_branch || "main";

    const defaultBranchRef = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(defaultBranchName)}`,
      { headers }
    );
    if (defaultBranchRef.ok) {
      const refData = await defaultBranchRef.json();
      baseSha = refData.object.sha;
      // Créer la nouvelle branche
      await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: baseSha,
        }),
        headers,
        method: "POST",
      });
    }
  }

  // 3. Pousser chaque fichier dans la branche
  let lastCommitSha: string | undefined;

  for (const file of validFiles) {
    const filePath = file.path.replace(/^\//, "");
    // Récupérer le SHA actuel du fichier s'il existe déjà sur la branche
    const existingFileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`,
      { headers }
    );

    let existingSha: string | undefined;
    if (existingFileRes.ok) {
      const existingData = await existingFileRes.json();
      existingSha = existingData.sha;
    }

    // Encoder le contenu en Base64
    const contentBase64 = Buffer.from(file.content || "", "utf8").toString("base64");

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
      {
        body: JSON.stringify({
          branch,
          content: contentBase64,
          message: `${commitMessage}: ${filePath}`,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
        headers,
        method: "PUT",
      }
    );

    if (putRes.ok) {
      const putData = await putRes.json();
      lastCommitSha = putData.commit?.sha;
    } else {
      const putError = await putRes.json().catch(() => ({}));
      console.warn(`Échec de commit pour ${filePath}:`, putError);
    }
  }

  return {
    branch,
    commitSha: lastCommitSha,
    filesCount: validFiles.length,
    htmlUrl: `https://github.com/owner/repo/tree/${branch}`.replace("owner/repo", `${owner}/${repo}`),
    success: true,
  };
}
