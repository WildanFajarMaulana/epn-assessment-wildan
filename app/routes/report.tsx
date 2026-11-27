import { Link, useLoaderData } from "react-router";
import { userContext } from "~/lib/context";
import { authMiddleware } from "~/middleware/middlewares.server";
import { getReportSummary } from "~/services/employee.service.server";
import type { Route } from "./+types/report";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export function meta() {
  return [{ title: "Laporan Rekap HR - Standalone Layout" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  const summary = await getReportSummary();
  return {
    user,
    generatedAt: new Date().toLocaleString("id-ID"),
    ...summary,
  };
}

export default function ReportPage() {
  const { rows, totalEmployees, totalQuota } =
    useLoaderData<typeof loader>();

  return (
    <div className="container" style={{ background: "#fff", minHeight: "100vh" }}>
      <header
        className="row"
        style={{
          justifyContent: "space-between",
          borderBottom: "2px solid #111",
          paddingBottom: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Laporan Rekap Karyawan &amp; Kuota</h2>
        </div>

        <div className="row">
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
          <Link to="/employees">← Dashboard</Link>
        </div>
      </header>

      <p>
        Total Department: <strong>{rows.length}</strong> | Total Karyawan:{" "}
        <strong>{totalEmployees}</strong> | Total Sisa Kuota:{" "}
        <strong>{totalQuota}</strong>
      </p>

      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Jumlah Karyawan</th>
            <th>Sisa Kuota</th>
            <th>Anggota</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.name}</strong>
              </td>
              <td>{row.employeeCount}</td>
              <td>{row.quota}</td>
              <td>
                {row.employees.length > 0
                  ? row.employees.map((e) => e.name).join(", ")
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
