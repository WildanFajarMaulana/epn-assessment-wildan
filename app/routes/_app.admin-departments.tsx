import { data, Form, useActionData, useLoaderData } from "react-router";
import { requireAdminMiddleware } from "~/middleware/middlewares.server";
import {
  AppServiceError,
  createDepartment,
  listDepartments,
  updateDepartment,
} from "~/services/employee.service.server";
import { departmentSchema, formatZodErrors } from "~/validators/schemas";
import type { Route } from "./+types/_app.admin-departments";

export const middleware: Route.MiddlewareFunction[] = [requireAdminMiddleware];

export function meta() {
  return [{ title: "Admin Departments (RBAC) - HR App" }];
}

export async function loader() {
  const departments = await listDepartments();
  return { departments };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return data(
      {
        ok: false,
        message: "Validasi department gagal.",
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    if (intent === "create") {
      await createDepartment(parsed.data.name);
      return data({
        ok: true,
        message: `Department "${parsed.data.name}" berhasil ditambahkan.`,
        fieldErrors: {} as Record<string, string>,
      });
    }

    if (intent === "update") {
      const id = Number(formData.get("id"));
      await updateDepartment(id, parsed.data.name);
      return data({
        ok: true,
        message: `Department "${parsed.data.name}" berhasil diperbarui.`,
        fieldErrors: {} as Record<string, string>,
      });
    }

    return data(
      {
        ok: false,
        message: "Intent tidak valid.",
        fieldErrors: {} as Record<string, string>,
      },
      { status: 400 }
    );
  } catch (error) {
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
    return data(
      {
        ok: false,
        message: "Gagal memproses department.",
        fieldErrors: {} as Record<string, string>,
      },
      { status: 500 }
    );
  }
}

export default function AdminDepartmentsPage() {
  const { departments } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Kelola Departments (Admin RBAC)</h2>

      {actionData?.message && (
        <div className={actionData.ok ? "msg-ok" : "msg-err"}>
          {actionData.message}
        </div>
      )}

      <section className="box">
        <strong>Tambah Department</strong>
        <Form method="post" className="row" style={{ marginTop: 8 }}>
          <input type="hidden" name="intent" value="create" />
          <div style={{ flex: 1 }}>
            <input name="name" placeholder="Nama Department" />
            {actionData?.fieldErrors?.name && (
              <small className="err">{actionData.fieldErrors.name}</small>
            )}
          </div>
          <button type="submit">Tambah</button>
        </Form>
      </section>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama &amp; Kuota</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, index) => (
            <tr key={dept.id}>
              <td>{index + 1}</td>
              <td>
                <Form method="post" className="row">
                  <input type="hidden" name="intent" value="update" />
                  <input type="hidden" name="id" value={dept.id} />
                  <input name="name" defaultValue={dept.name} style={{ width: 200 }} />
                  <button type="submit" className="btn-light">
                    Update
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
