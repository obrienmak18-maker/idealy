import Link from "next/link";
import { cookies } from "next/headers";
import { IdealyLogo } from "@/components/branding/idealy-logo";

export const metadata = {
  title: "Confirmation d’e-mail | Idealy",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string | string[] }>;
}) {
  const params = await searchParams;
  const verified = params.verified === "1";
  const cookieStore = await cookies();
  const localeValue = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeValue === "en" || localeValue === "es" ? localeValue : "fr";
  const copy = locale === "en"
    ? {
        title: verified ? "Email address confirmed" : "Check your email",
        description: verified
          ? "Your email address has been confirmed. You can safely return to Idealy and sign in."
          : "Open the confirmation link from your email to finish verifying your address.",
        action: "Continue to sign in",
        note: "Firebase completes the verification before redirecting you to this page.",
      }
    : locale === "es"
      ? {
          title: verified ? "Correo electrónico confirmado" : "Revisa tu correo",
          description: verified
            ? "Tu correo está confirmado. Puedes volver a Idealy e iniciar sesión."
            : "Abre el enlace de confirmación del correo para verificar tu dirección.",
          action: "Continuar al inicio de sesión",
          note: "Firebase completa la verificación antes de redirigirte a esta página.",
        }
      : {
          title: verified ? "Adresse e-mail confirmée" : "Consultez votre e-mail",
          description: verified
            ? "Votre adresse e-mail est confirmée. Vous pouvez revenir sur Idealy et vous connecter."
            : "Ouvrez le lien de confirmation reçu par e-mail pour terminer la vérification.",
          action: "Continuer vers la connexion",
          note: "Firebase termine la vérification avant de vous rediriger vers cette page.",
        };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#09090d] px-5 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.16),transparent_58%)]" />
      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.035] p-7 shadow-[0_24px_80px_-34px_rgba(124,58,237,0.32)] sm:p-10">
        <Link href="/" aria-label="Idealy" className="mb-8 inline-flex items-center gap-3">
          <IdealyLogo compact size={36} />
          <span className="text-base font-semibold tracking-tight">Idealy</span>
        </Link>
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-200">
          <span aria-hidden="true" className="text-xl">{verified ? "✓" : "✉"}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">{copy.description}</p>
        <Link href="/login" className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#101014] transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60">
          {copy.action}
        </Link>
        <p className="mt-5 text-xs leading-5 text-white/35">{copy.note}</p>
      </section>
    </main>
  );
}
