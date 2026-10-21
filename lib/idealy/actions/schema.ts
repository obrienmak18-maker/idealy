/**
 * Protocole d'actions Idealy — contrat Zod strict des actions émises par le modèle.
 *
 * Mécanisme inspiré du protocole d'actions typées du dépôt open-source StackBlitz
 * bolt.new (MIT, (c) 2024 StackBlitz, Inc.) : le modèle n'émet ni prose de code ni
 * JSON monolithique, mais une séquence d'actions structurées streamables.
 * Seule la RÈGLE (actions typées + conteneur) est reprise ; le format, les noms de
 * balises et les types sont intégralement réécrits pour Idealy.
 * Voir THIRD_PARTY_NOTICES.md.
 */

import { z } from "zod";

import {
  IDEALY_ACTION_CONTAINER_TAG,
  IDEALY_ACTION_ITEM_TAG,
} from "@/lib/idealy/prompts/build-system";

/** Types d'actions reconnues par le runner Idealy. */
export const IDEALY_ACTION_TYPES = [
  "file",
  "shell",
  "start",
  "delete",
  "rename",
] as const;

export const IdealyFileActionSchema = z.object({
  type: z.literal("file"),
  /** Chemin relatif à la racine du projet (jamais absolu, jamais d'échappement). */
  path: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/") && !p.includes(".."), {
      message: "Le chemin doit être relatif à la racine du projet (interdiction de « .. » et de « / » initial).",
    }),
  /** Contenu COMPLET du fichier. Rejeté si vide ou placeholder (voir B.4). */
  content: z.string(),
});

export const IdealyShellActionSchema = z.object({
  type: z.literal("shell"),
  command: z.string().min(1),
});

export const IdealyStartActionSchema = z.object({
  type: z.literal("start"),
});

export const IdealyDeleteActionSchema = z.object({
  type: z.literal("delete"),
  path: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/") && !p.includes(".."), {
      message: "Chemin relatif requis.",
    }),
});

export const IdealyRenameActionSchema = z.object({
  type: z.literal("rename"),
  from: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/") && !p.includes(".."), { message: "Chemin relatif requis." }),
  to: z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/") && !p.includes(".."), { message: "Chemin relatif requis." }),
});

/** Union stricte : toute action émise par le parseur passe par ce contrat. */
export const IdealyActionSchema = z.discriminatedUnion("type", [
  IdealyFileActionSchema,
  IdealyShellActionSchema,
  IdealyStartActionSchema,
  IdealyDeleteActionSchema,
  IdealyRenameActionSchema,
]);

export type IdealyActionType = (typeof IDEALY_ACTION_TYPES)[number];
export type IdealyAction = z.infer<typeof IdealyActionSchema>;
export type IdealyFileAction = z.infer<typeof IdealyFileActionSchema>;
export type IdealyShellAction = z.infer<typeof IdealyShellActionSchema>;

/** Conteneur d'actions (l'équivalent fonctionnel, mais réécrit, du bloc artifact). */
export const IdealyActionContainerSchema = z.object({
  tag: z.literal(IDEALY_ACTION_CONTAINER_TAG),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L'id du conteneur doit être en kebab-case."),
  title: z.string().min(1),
  actions: z.array(IdealyActionSchema).min(1),
});

export type IdealyActionContainer = z.infer<typeof IdealyActionContainerSchema>;

/* ── Règle B.4 : rejet explicite des fichiers vides / placeholders ─────────── */

/** Motifs de placeholder interdits dans un contenu d'action file. */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^\s*(\/\/|#|\/\*)\s*(rest(e|e of)?|le reste|todo|to do|FIXME|placeholder)/im,
  /(?:^|\n)\s*(\/\/|#|\/\*)?\s*\.\.\.\s*(?:rest|reste|code|suite|etc)?/i,
  /<!--\s*(placeholder|todo)\s*-->/i,
  /<-{1,2}\s*leave original code here\s*->{1,2}/i,
];

export interface ActionRejection {
  ok: false;
  reason: string;
}
export interface ActionAcceptance {
  ok: true;
  action: IdealyAction;
}

/**
 * Valide une action complète issue du parseur. Une action `file` au contenu vide
 * ou contenant un placeholder est REJETÉE avec un motif lisible — elle ne doit
 * JAMAIS être écrite silencieusement dans le conteneur.
 */
export function validateIdealyAction(action: unknown): ActionAcceptance | ActionRejection {
  const parsed = IdealyActionSchema.safeParse(action);
  if (!parsed.success) {
    return { ok: false, reason: `Action invalide : ${parsed.error.issues.map((i) => i.message).join("; ")}` };
  }
  if (parsed.data.type === "file") {
    const content = parsed.data.content.trim();
    if (content.length === 0) {
      return { ok: false, reason: `Action file rejetée : contenu vide pour « ${parsed.data.path} ».` };
    }
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(parsed.data.content)) {
        return {
          ok: false,
          reason: `Action file rejetée : placeholder détecté dans « ${parsed.data.path} ». Réécris le fichier complet.`,
        };
      }
    }
  }
  return { ok: true, action: parsed.data };
}

/** Erreur destinée au modèle : lui renvoyer le motif de rejet pour correction. */
export function formatActionRejectionForModel(rejection: ActionRejection): string {
  return `ERREUR SYSTEME (action rejetee) : ${rejection.reason} Reprends l'action corrigee, sans modifier les autres.`;
}
