import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/(auth)/auth";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  normalizeAttachmentMediaType,
  safeAttachmentExtension,
} from "@/lib/chat-attachments";

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= CHAT_ATTACHMENT_MAX_BYTES, {
      message: "Le fichier doit faire 20 Mo maximum.",
    })
    .refine((file) => file.type.length <= 160, {
      message: "Le type de fichier est invalide.",
    }),
});

/** Upload via Supabase Storage if configured, otherwise use a base64 data-URL fallback. */
async function storeFile(
  fileBuffer: ArrayBuffer,
  pathname: string,
  contentType: string
): Promise<{ url: string; pathname: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "idealy-attachments";

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(pathname, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) throw new Error(error.message);

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: publicData.publicUrl, pathname: data.path };
  }

  // Fallback: encode as data URL (fine for dev / free tier)
  const base64 = Buffer.from(fileBuffer).toString("base64");
  const dataUrl = `data:${contentType};base64,${base64}`;
  return { url: dataUrl, pathname };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const originalFilename = file instanceof File ? file.name : "upload.bin";

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((error) => error.message)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const uploadedFile = validatedFile.data.file;
    const fileBuffer = await uploadedFile.arrayBuffer();
    const contentType = normalizeAttachmentMediaType(uploadedFile.type);

    const ownerSegment =
      session.user.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) ||
      "authenticated-user";
    const extension = safeAttachmentExtension(originalFilename);
    const pathname = `uploads/${ownerSegment}/${crypto.randomUUID()}.${extension}`;

    try {
      const { url, pathname: storedPath } = await storeFile(fileBuffer, pathname, contentType);
      return NextResponse.json({ url, pathname: storedPath, contentType });
    } catch {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
