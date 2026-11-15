import { Mail, MailCheck } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

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
        back: "Back to Idealy",
      }
    : locale === "es"
      ? {
          title: verified ? "Correo electrónico confirmado" : "Revisa tu correo",
          description: verified
            ? "Tu correo está confirmado. Puedes volver a Idealy e iniciar sesión."
            : "Abre el enlace de confirmación del correo para verificar tu dirección.",
          action: "Continuar al inicio de sesión",
          note: "Firebase completa la verificación antes de redirigirte a esta página.",
          back: "Volver a Idealy",
        }
      : {
          title: verified ? "Adresse e-mail confirmée" : "Consultez votre e-mail",
          description: verified
            ? "Votre adresse e-mail est confirmée. Vous pouvez revenir sur Idealy et vous connecter."
            : "Ouvrez le lien de confirmation reçu par e-mail pour terminer la vérification.",
          action: "Continuer vers la connexion",
          note: "Firebase termine la vérification avant de vous rediriger vers cette page.",
          back: "Retour à Idealy",
        };

  const StateIcon = verified ? MailCheck : Mail;

  return (
    <AuthPageShell
      backHref="/welcome"
      backLabel={copy.back}
      notice={copy.note}
    >
      <div className="idealy-auth-state-icon">
        <StateIcon aria-hidden="true" className="size-6" />
      </div>
      <h1>{copy.title}</h1>
      <p className="idealy-auth-description">{copy.description}</p>
      <Link className="idealy-auth-primary-link" href="/login">
        {copy.action}
      </Link>
    </AuthPageShell>
  );
}
