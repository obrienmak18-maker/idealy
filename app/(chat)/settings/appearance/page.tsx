"use client";
import { MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Thème de l&apos;interface</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Personnalisez les tons et la luminosité d&apos;Idealy Studio.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: "light", label: "Clair",   Icon: SunIcon },
          { value: "dark",  label: "Sombre",  Icon: MoonIcon },
          { value: "system",label: "Système", Icon: PaletteIcon },
        ].map(({ value, label, Icon }) => (
          <button
            key={value}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-colors ${
              theme === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:bg-muted/50"
            }`}
            onClick={() => setTheme(value)}
            type="button"
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
