import { useState } from "react";
import {
  data,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { WorkShiftDropdown } from "~/components/WorkShiftDropdown";
import { userContext } from "~/lib/context";
import { UploadValidationError } from "~/lib/upload.server";
import {
  AppServiceError,
  createEmployeeWithPhoto,
  deleteEmployee,
  listWorkShifts,
  listEmployees,
  updateEmployeeWithPhoto,
} from "~/services/employee.service.server";
import {
  employeeSchema,
  employeeUpdateSchema,
  formatZodErrors,
} from "~/validators/schemas";
import type { Route } from "./+types/_app.employees";

export function meta() {
  return [{ title: "Employees CRUDS - HR App" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const user = context.get(userContext)!;

  const [employees, workShifts] = await Promise.all([
    listEmployees({ search: q }),
    listWorkShifts(),
  ]);

  return { employees, workShifts, q, user };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) {
    return data(
      { ok: false, message: "Unauthorized", fieldErrors: {} as Record<string, string> },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "create") {
      const parsed = employeeSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        position: formData.get("position"),
        departmentId: formData.get("departmentId"),
      });

      if (!parsed.success) {
        return data(
          {
            ok: false,
            message: "Validasi gagal saat menambah employee.",
            fieldErrors: formatZodErrors(parsed.error),
          },
          { status: 400 }
        );
      }

      const rawFile = formData.get("photo");
      const photoFile = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

      await createEmployeeWithPhoto(parsed.data, photoFile);
      return data({
        ok: true,
        message: `Employee "${parsed.data.name}" berhasil ditambahkan.`,
        fieldErrors: {} as Record<string, string>,
      });
    }

    if (intent === "update") {
      const parsed = employeeUpdateSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        email: formData.get("email"),
        position: formData.get("position"),
        departmentId: formData.get("departmentId"),
      });

      if (!parsed.success) {
        return data(
          {
            ok: false,
            message: "Validasi gagal saat mengubah employee.",
            fieldErrors: formatZodErrors(parsed.error),
          },
          { status: 400 }
        );
      }

      const rawFile = formData.get("photo");
      const photoFile = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

      await updateEmployeeWithPhoto(parsed.data.id, parsed.data, photoFile);
      return data({
        ok: true,
        message: `Employee "${parsed.data.name}" berhasil diperbarui.`,
        fieldErrors: {} as Record<string, string>,
      });
    }

    if (intent === "delete") {
      if (user.role !== "admin") {
        return data(
          {
            ok: false,
            message: "Akses ditolak (403): Hanya ADMIN yang boleh menghapus employee.",
            fieldErrors: {} as Record<string, string>,
          },
          { status: 403 }
        );
      }

      const id = Number(formData.get("id"));
      if (!Number.isInteger(id) || id <= 0) {
        return data(
          {
            ok: false,
            message: "ID employee tidak valid.",
            fieldErrors: {} as Record<string, string>,
          },
          { status: 400 }
        );
      }

      await deleteEmployee(id);
      return data({
        ok: true,
        message: "Employee berhasil dihapus.",
        fieldErrors: {} as Record<string, string>,
      });
    }

    return data(
      {
        ok: false,
        message: "Intent tidak dikenali.",
        fieldErrors: {} as Record<string, string>,
      },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return data(
        {
          ok: false,
          message: error.message,
          fieldErrors: { photo: error.message } as Record<string, string>,
        },
        { status: 400 }
      );
    }

    if (error instanceof AppServiceError) {
      return data(
        {
          ok: false,
          message: error.message,
          fieldErrors: (error.fieldErrors ?? {}) as Record<string, string>,
        },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return data(
      { ok: false, message, fieldErrors: {} as Record<string, string> },
      { status: 500 }
    );
  }
}

export default function EmployeesPage() {
  const { employees, workShifts, q, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [editingId, setEditingId] = useState<number | null>(null);
  const editingEmployee = employees.find((e) => e.id === editingId) ?? null;

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Employees (CRUDS)</h2>
        </div>

        <Form method="get" className="row">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Cari nama/email/jabatan..."
            style={{ width: 220 }}
          />
          <button type="submit">Cari</button>
        </Form>
      </div>

      {actionData?.message && (
        <div className={actionData.ok ? "msg-ok" : "msg-err"}>
          {actionData.message}
        </div>
      )}

      <section className="box">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <strong>
            {editingEmployee ? `Edit: ${editingEmployee.name}` : "Tambah Employee"}
          </strong>
          {editingEmployee && (
            <button
              type="button"
              className="btn-light"
              onClick={() => setEditingId(null)}
            >
              Batal Edit
            </button>
          )}
        </div>

        <Form
          key={editingEmployee ? `edit-${editingEmployee.id}` : "create"}
          method="post"
          encType="multipart/form-data"
          className="grid-2"
        >
          <input
            type="hidden"
            name="intent"
            value={editingEmployee ? "update" : "create"}
          />
          {editingEmployee && (
            <input type="hidden" name="id" value={editingEmployee.id} />
          )}

          <div>
            <label>Nama</label>
            <input name="name" defaultValue={editingEmployee?.name ?? ""} />
            {actionData?.fieldErrors?.name && (
              <small className="err">{actionData.fieldErrors.name}</small>
            )}
          </div>

          <div>
            <label>Email</label>
            <input name="email" type="email" defaultValue={editingEmployee?.email ?? ""} />
            {actionData?.fieldErrors?.email && (
              <small className="err">{actionData.fieldErrors.email}</small>
            )}
          </div>

          <div>
            <label>Jabatan</label>
            <input name="position" defaultValue={editingEmployee?.position ?? ""} />
            {actionData?.fieldErrors?.position && (
              <small className="err">{actionData.fieldErrors.position}</small>
            )}
          </div>

          <div>
            <label>Department (FK Dropdown)</label>
            <WorkShiftDropdown
              name="workShiftId"
              workShifts={workShifts}
              defaultValue={editingEmployee?.workShiftId ?? ""}
              error={actionData?.fieldErrors?.workShiftId}
            />
          </div>

          <div>
            <label>Foto (JPG/PNG/WEBP, maks 2MB)</label>
            <input
              name="photo"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            />
            {actionData?.fieldErrors?.photo && (
              <small className="err">{actionData.fieldErrors.photo}</small>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Menyimpan..."
                : editingEmployee
                  ? "Simpan Perubahan"
                  : "Tambah Employee"}
            </button>
          </div>
        </Form>
      </section>

      <table>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nama</th>
            <th>Email</th>
            <th>Jabatan</th>
            <th>Department</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center" }} className="muted">
                Data tidak ditemukan.
              </td>
            </tr>
          ) : (
            employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  {emp.photoPath ? (
                    <img
                      src={`/uploads/${emp.photoPath}`}
                      alt={emp.name}
                      width={36}
                      height={36}
                      style={{ objectFit: "cover", border: "1px solid #ccc" }}
                    />
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td>{emp.name}</td>
                <td>{emp.email}</td>
                <td>{emp.position}</td>
                <td>{emp.workShift?.name ?? "-"}</td>
                <td>
                  <div className="row">
                    <button
                      type="button"
                      className="btn-light"
                      onClick={() => setEditingId(emp.id)}
                    >
                      Edit
                    </button>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={emp.id} />
                      <button
                        type="submit"
                        className="btn-danger"
                        title={user.role !== "admin" ? "Hanya Admin" : "Hapus"}
                      >
                        Hapus
                      </button>
                    </Form>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
