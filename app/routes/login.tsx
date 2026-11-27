import { data, Form, redirect, useActionData, useNavigation } from "react-router";
import { userContext } from "~/lib/context";
import { createUserSessionCookie } from "~/lib/session.server";
import { authenticateUser } from "~/services/auth.service.server";
import { formatZodErrors, loginSchema } from "~/validators/schemas";
import type { Route } from "./+types/login";

export function meta() {
  return [{ title: "Login - HR App" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (user) {
    throw redirect("/employees");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawEmail = String(formData.get("email") ?? "");
  const rawPassword = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/employees");

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!parsed.success) {
    return data(
      {
        error: "Periksa kembali input login Anda.",
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return data(
      {
        error: "Email atau password salah.",
        fieldErrors: {} as Record<string, string>,
      },
      { status: 401 }
    );
  }

  const cookie = await createUserSessionCookie(user);
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/employees";
  return redirect(safeRedirect, {
    headers: { "Set-Cookie": cookie },
  });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="container" style={{ maxWidth: 420, marginTop: 48 }}>
      <div className="box">
        <h2>Login HR App</h2>

        {actionData?.error && <div className="msg-err">{actionData.error}</div>}

        <Form method="post">
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="admin@epn.test" />
            {actionData?.fieldErrors?.email && (
              <small className="err">{actionData.fieldErrors.email}</small>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="******" />
            {actionData?.fieldErrors?.password && (
              <small className="err">{actionData.fieldErrors.password}</small>
            )}
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </Form>

        <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid #eee" }} />
        <p className="muted">
          <strong>Admin:</strong> admin@epn.test / admin123
          <br />
          <strong>Staff:</strong> staff@epn.test / staff123
        </p>
      </div>
    </main>
  );
}
