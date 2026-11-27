import { data, Form, useActionData, useLoaderData } from "react-router";
import { requireAdminMiddleware } from "~/middleware/middlewares.server";
import {
  AppServiceError,
  createWorkShift,
  listWorkShifts,
  updateWorkShift,
} from "~/services/employee.service.server";
import { workShiftSchema, formatZodErrors } from "~/validators/schemas";
import type { Route } from "./+types/_app.admin-shifts";

export const middleware: Route.MiddlewareFunction[] = [requireAdminMiddleware];

export function meta() {
  return [{ title: "Admin Work Shifts (RBAC) - HR App" }];
}

export async function loader() {
  const workShifts = await listWorkShifts();
  return { workShifts };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  const parsed = workShiftSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return data(
      {
        ok: false,
        message: "Validasi work shift gagal.",
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    if (intent === "create") {
      await createWorkShift(parsed.data.name);
      return data({
        ok: true,
        message: `Work Shift "${parsed.data.name}" berhasil ditambahkan.`,
        fieldErrors: {} as Record<string, string>,
      });
    }

    if (intent === "update") {
      const id = Number(formData.get("id"));
      await updateWorkShift(id, parsed.data.name);
      return data({
        ok: true,
        message: `Work Shift "${parsed.data.name}" berhasil diperbarui.`,
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
        message: "Gagal memproses work shift.",
        fieldErrors: {} as Record<string, string>,
      },
      { status: 500 }
    );
  }
}

export default function AdminWorkShiftsPage() {
  const { workShifts } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Kelola Work Shifts (Admin RBAC)</h2>

      {actionData?.message && (
        <div className={actionData.ok ? "msg-ok" : "msg-err"}>
          {actionData.message}
        </div>
      )}

      <section className="box">
        <strong>Tambah Work Shift</strong>
        <Form method="post" className="row" style={{ marginTop: 8 }}>
          <input type="hidden" name="intent" value="create" />
          <div style={{ flex: 1 }}>
            <input name="name" placeholder="Nama Work Shift" />
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
          {workShifts.map((shift, index) => (
            <tr key={shift.id}>
              <td>{index + 1}</td>
              <td>
                <Form method="post" className="row">
                  <input type="hidden" name="intent" value="update" />
                  <input type="hidden" name="id" value={shift.id} />
                  <input name="name" defaultValue={shift.name} style={{ width: 200 }} />
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
