import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadFileMetaSchema } from "~/validators/schemas";

export function getUploadDir() {
    return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");
}

export function validateImageFile(file: File) {
    const result = uploadFileMetaSchema.safeParse({
        name: file.name,
        type: file.type,
        size: file.size,
    });

    if (!result.success) {
        const message = result.error.issues[0]?.message || "File gambar tidak valid";
        throw new UploadValidationError(message);
    }
}

export async function saveUploadedFile(
    file: File,
    options?: { simulateFailure?: boolean }
): Promise<string> {
    validateImageFile(file);

    if (options?.simulateFailure) {
        throw new Error("Simulasi gagal menyimpan file ke storage");
    }

    const uploadDir = getUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const fullPath = path.join(uploadDir, uniqueName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    return uniqueName;
}

export async function deleteUploadedFile(filename: string | null | undefined) {
    if (!filename) return;
    const safeName = path.basename(filename);
    const fullPath = path.join(getUploadDir(), safeName);
    try {
        await fs.unlink(fullPath);
    } catch {
        return;
    }
}

export class UploadValidationError extends Error {
    status = 400;
    constructor(message: string) {
        super(message);
        this.name = "UploadValidationError";
    }
}
