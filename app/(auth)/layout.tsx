import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

const authShellCopy = {
  en: {
    back: "Back to Idealy",
    notice: "AI can make mistakes. Verify important information before acting.",
  },
  es: {
    back: "Volver a Idealy",
    notice:
      "La IA puede cometer errores. Verifica la información importante antes de actuar.",
  },
  fr: {
    back: "Retour à Idealy",
    notice:
      "L’IA peut se tromper. Vérifiez les informations importantes avant d’agir.",
  },
} as const;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthShellFallback />}>
      <AuthShell>{children}</AuthShell>
    </Suspense>
  );
}

async function AuthShell({ children }: { children: React.ReactNode }) {
  await connection();
  const locale = (await cookies()).get("NEXT_LOCALE")?.value;
  const copy =
    authShellCopy[locale === "en" || locale === "es" ? locale : "fr"];

  return (
    <AuthPageShell
      backHref="/welcome"
      backLabel={copy.back}
      notice={copy.notice}
    >
      {children}
    </AuthPageShell>
  );
}

function AuthShellFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Chargement de la page de connexion"
      className="idealy-auth-page"
      role="status"
    >
      <div className="idealy-auth-page__inner">
        <div className="idealy-auth-skeleton" />
      </div>
    </main>
  );
}
