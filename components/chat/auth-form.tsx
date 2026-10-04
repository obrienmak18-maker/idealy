import Form from "next/form";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useTranslation } from "@/lib/i18n/provider";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  onEmailChange,
  passwordAutoComplete = "current-password",
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  onEmailChange?: (email: string) => void;
  passwordAutoComplete?: "current-password" | "new-password";
}) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="font-normal text-muted-foreground" htmlFor="email">
          {t("auth.emailLabel", "Adresse e-mail")}
        </Label>
        <Input
          autoComplete="email"
          autoFocus
          className="h-10 rounded-lg border-border/50 bg-muted/50 text-sm transition-colors focus:border-foreground/20 focus:bg-muted"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          onChange={(event) => onEmailChange?.(event.target.value)}
          placeholder={t("auth.emailPlaceholder", "vous@exemple.com")}
          required
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="font-normal text-muted-foreground" htmlFor="password">
          {t("auth.passwordLabel", "Mot de passe")}
        </Label>
        <div className="relative">
          <Input
            autoComplete={passwordAutoComplete}
            className="h-11 rounded-xl border-border/50 bg-muted/50 pr-12 text-sm transition-colors focus:border-foreground/20 focus:bg-muted"
            id="password"
            name="password"
            placeholder="••••••••"
            required
            minLength={6}
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? t("auth.hidePassword", "Masquer le mot de passe") : t("auth.showPassword", "Afficher le mot de passe")}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        </div>
      </div>

      {children}
    </Form>
  );
}
