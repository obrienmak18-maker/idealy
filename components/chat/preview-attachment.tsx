import {
  FileArchive,
  FileAudio2,
  File as FileIcon,
  FileImage,
  FileVideo2,
} from "lucide-react";
import Image from "next/image";
import type { Attachment } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { CrossSmallIcon } from "./icons";

function attachmentIcon(name: string, contentType: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (contentType.startsWith("image/")) {
    return FileImage;
  }
  if (
    contentType.startsWith("video/") ||
    ["mp4", "mov", "webm"].includes(extension ?? "")
  ) {
    return FileVideo2;
  }
  if (
    contentType.startsWith("audio/") ||
    ["mp3", "wav", "m4a"].includes(extension ?? "")
  ) {
    return FileAudio2;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension ?? "")) {
    return FileArchive;
  }
  return FileIcon;
}

function attachmentKind(name: string, contentType: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  if (contentType.startsWith("image/")) {
    return "IMAGE";
  }
  if (
    contentType.startsWith("video/") ||
    ["MP4", "MOV", "WEBM"].includes(extension ?? "")
  ) {
    return "VIDÉO";
  }
  if (
    contentType.startsWith("audio/") ||
    ["MP3", "WAV", "M4A"].includes(extension ?? "")
  ) {
    return "AUDIO";
  }
  if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(extension ?? "")) {
    return "ARCHIVE";
  }
  if (extension === "PDF" || contentType === "application/pdf") {
    return "PDF";
  }
  return extension || "FICHIER";
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const isImage = contentType?.startsWith("image/") && Boolean(url);
  const TypeIcon = attachmentIcon(name ?? "", contentType ?? "");
  const shortName = name?.split("/").pop() ?? "Fichier";
  const kind = attachmentKind(shortName, contentType ?? "");

  return (
    <div
      className="group relative flex h-[68px] w-[188px] shrink-0 items-center gap-2.5 overflow-hidden rounded-xl border border-border/60 bg-card/90 p-2 shadow-sm transition-colors hover:border-primary/35"
      data-testid="input-attachment-preview"
      title={shortName}
    >
      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/70 text-muted-foreground">
        {isImage ? (
          <Image
            alt={shortName}
            className="size-full object-cover"
            height={48}
            src={url}
            width={48}
          />
        ) : (
          <TypeIcon aria-hidden="true" className="size-5" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[11px] font-medium text-foreground/85">
          {shortName}
        </span>
        <span className="text-[9px] font-semibold tracking-[0.12em] text-muted-foreground/75">
          {kind}
        </span>
      </div>

      {isUploading ? (
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 bg-background/85 text-xs text-muted-foreground backdrop-blur-sm"
          data-testid="input-attachment-loader"
        >
          <Spinner className="size-4" /> Importation…
        </div>
      ) : null}

      {onRemove && !isUploading ? (
        <button
          aria-label={`Retirer ${shortName}`}
          className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 group-hover:opacity-100"
          onClick={onRemove}
          type="button"
        >
          <CrossSmallIcon size={10} />
        </button>
      ) : null}
    </div>
  );
};
