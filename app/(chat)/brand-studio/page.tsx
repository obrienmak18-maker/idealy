import type { Metadata } from "next";
import { BrandStudio } from "@/components/brand/brand-studio";

export const metadata: Metadata = {
  description:
    "Explorez des noms, vérifiez leurs domaines et composez une première identité vectorielle.",
  title: "Studio de marque | Idealy",
};

export default function BrandStudioPage() {
  return <BrandStudio />;
}
