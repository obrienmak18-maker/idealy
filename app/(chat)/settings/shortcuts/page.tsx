export default function ShortcutsPage() {
  const shortcuts = [
    { key: "Cmd/Ctrl + K",     action: "Recherche et palette de commandes" },
    { key: "Cmd/Ctrl + B",     action: "Afficher / masquer la barre latérale" },
    { key: "Cmd/Ctrl + S",     action: "Sauvegarder le code / fichier actif" },
    { key: "Cmd/Ctrl + Enter", action: "Envoyer le message en cours" },
    { key: "Shift + Escape",   action: "Nouvelle discussion" },
    { key: "Escape",           action: "Fermer les modales et tiroirs" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Raccourcis clavier</h3>
        <p className="mt-1 text-xs text-muted-foreground">Accélérez vos actions dans Idealy Studio.</p>
      </div>
      <div className="grid gap-2 text-xs">
        {shortcuts.map(({ key, action }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
          >
            <span className="text-muted-foreground">{action}</span>
            <kbd className="rounded border border-border/80 bg-background px-2 py-1 font-mono text-[11px] font-semibold text-foreground">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
