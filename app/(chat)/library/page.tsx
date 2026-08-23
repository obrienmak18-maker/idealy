import {
  ArrowLeftIcon,
  BookOpenIcon,
  FileTextIcon,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";

const resources = [
  {
    icon: FileTextIcon,
    name: "Ressources de mission",
    type: "Documents et fichiers",
  },
  {
    icon: ImageIcon,
    name: "Aperçus générés",
    type: "Interfaces et prototypes",
  },
];

export default function LibraryPage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-4" /> Retour au workspace
        </Link>
        <div className="mb-8">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <BookOpenIcon className="size-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Bibliothèque
          </h1>
          <p className="mt-2 text-muted-foreground">
            Retrouvez les ressources importées et créées dans vos discussions.
          </p>
        </div>
        <div className="grid gap-3">
          {resources.map(({ name, type, icon: Icon }) => (
            <div
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-5"
              key={name}
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="font-medium">{name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
