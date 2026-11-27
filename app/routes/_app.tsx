import { Form, Link, NavLink, Outlet, useLoaderData } from "react-router";
import { userContext } from "~/lib/context";
import { authMiddleware } from "~/middleware/middlewares.server";
import type { Route } from "./+types/_app";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  return { user };
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <strong>HR &amp; Absensi App</strong>
          <nav>
            <NavLink to="/employees">Employees</NavLink>
            <hr style={{ width: "100%", border: 0, borderTop: "1px solid #eee" }} />
            {user.role === "admin" && (
              <>
                <NavLink to="/admin/departments">Departments</NavLink>
                <hr style={{ width: "100%", border: 0, borderTop: "1px solid #eee" }} />
              </>
            )}
            <NavLink to="/parallel-api">5 API Paralel</NavLink>
            <hr style={{ width: "100%", border: 0, borderTop: "1px solid #eee" }} />
            <Link to="/report">Page Report</Link>
          </nav>
        </div>

        <div>
          <p className="muted" style={{ marginBottom: 8 }}>
            <strong>{user.name}</strong>
            <br />
            {user.email} ({user.role})
          </p>
          <Form method="post" action="/logout">
            <button type="submit" className="btn-light" style={{ width: "100%" }}>
              Logout
            </button>
          </Form>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
