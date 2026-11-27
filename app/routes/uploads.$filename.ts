import fs from "node:fs/promises";
import path from "node:path";
import { getUploadDir } from "~/lib/upload.server";
import type { Route } from "./+types/uploads.$filename";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function loader({ params }: Route.LoaderArgs) {
    const safeName = path.basename(params.filename || "");
    if (!safeName) {
        throw new Response("File tidak ditemukan", { status: 404 });
    }

    const fullPath = path.join(getUploadDir(), safeName);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    try {
        const fileBuffer = await fs.readFile(fullPath);
        return new Response(fileBuffer, {
        status: 200,
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
        },
        });
    } catch {
        throw new Response("File tidak ditemukan", { status: 404 });
    }
}
