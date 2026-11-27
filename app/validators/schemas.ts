import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
});

export const employeeSchema = z.object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120, "Nama maksimal 120 karakter"),
    email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
    position: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(120, "Jabatan maksimal 120 karakter"),
    departmentId: z.coerce
        .number({ error: "Department wajib dipilih" })
        .int()
        .positive("Department wajib dipilih"),
});

export const employeeUpdateSchema = employeeSchema.extend({
    id: z.coerce.number().int().positive("ID employee tidak valid"),
});


export const departmentSchema = z.object({
    name: z.string().trim().min(2, "Nama department minimal 2 karakter").max(120),
});

export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export const uploadFileMetaSchema = z.object({
    name: z
        .string()
        .min(1, "Nama file tidak valid")
        .refine(
        (name) => {
            const lower = name.toLowerCase();
            return ALLOWED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
        },
        { message: "Ekstensi file harus .jpg, .jpeg, .png, atau .webp" }
        ),
    type: z.enum(ALLOWED_IMAGE_MIMES, {
        error: "Tipe file harus gambar (JPG, PNG, atau WEBP)",
    }),
    size: z
        .number()
        .positive("File tidak boleh kosong")
        .max(MAX_UPLOAD_SIZE_BYTES, "Ukuran file maksimal 2 MB"),
});

export const attendanceSchema = z.object({
    departmentId: z.coerce.number().int().positive("Department wajib dipilih"),
    employeeId: z.coerce.number().int().positive("Employee wajib dipilih"),
    attendanceDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
    status: z.enum(["Hadir", "Izin", "Sakit"], {
        error: "Status harus Hadir, Izin, atau Sakit",
    }),
    note: z.string().trim().min(3, "Catatan minimal 3 karakter").max(255),
});

export const attendanceUpdateSchema = attendanceSchema.extend({
    id: z.coerce.number().int().positive("ID absensi tidak valid"),
});

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
