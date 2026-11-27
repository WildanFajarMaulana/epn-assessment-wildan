import { Form, useActionData, useLoaderData } from "react-router";
import { listEmployees } from "~/services/employee.service.server";
import type { Route } from "./+types/_app.cached";

const CACHE_KEY = "epn_employees_cache";
const CACHE_TTL_MS = 60_000;

interface CachedEntry {
    expiresAt: number;
    data: {
        employees: Array<{
        id: number;
        name: string;
        email: string;
        position: string;
        workShiftName: string;
        }>;
        fetchedAt: string;
    };
}

export function meta() {
    return [{ title: "Direktori Karyawan - HR App" }];
}

export async function loader() {
    const employees = await listEmployees();

    return {
        employees: employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        position: emp.position,
        workShiftName: emp.workShift?.name ?? "-",
        })),
        fetchedAt: new Date().toLocaleTimeString("id-ID"),
    };
}

export async function action() {
    return { ok: true };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
    const rawCache = localStorage.getItem(CACHE_KEY);

    if (rawCache) {
        try {
        const parsed: CachedEntry = JSON.parse(rawCache);
        if (Date.now() < parsed.expiresAt) {
            return { ...parsed.data, fromCache: true };
        }
        } catch {
        localStorage.removeItem(CACHE_KEY);
        }
    }

    const fresh = await serverLoader();
    const entry: CachedEntry = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: fresh,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));

    return { ...fresh, fromCache: false };
}
clientLoader.hydrate = true;

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
    localStorage.removeItem(CACHE_KEY);
    await serverAction();
    return { refreshed: true };
}

export function HydrateFallback() {
    return <div className="box muted">Memuat data karyawan...</div>;
}

export default function CachedDirectoryPage() {
    const { employees, fetchedAt, fromCache } = useLoaderData<typeof clientLoader>();
    const actionData = useActionData<typeof clientAction>();

    return (
        <div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <div>
            <h2 style={{ margin: 0 }}>Direktori Karyawan</h2>
            <span className="muted">
                {fromCache ? "Dimuat dari cache lokal" : "Data terbaru dari server"} •{" "}
                {fetchedAt}
            </span>
            </div>

            <Form method="post">
            <button type="submit" className="btn-light">
                Refresh Data
            </button>
            </Form>
        </div>

        {actionData?.refreshed && (
            <div className="msg-ok">Cache diperbarui. Menampilkan data terbaru.</div>
        )}

        <table>
            <thead>
            <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Jabatan</th>
                <th>Shift Kerja</th>
            </tr>
            </thead>
            <tbody>
            {employees.map((emp) => (
                <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.email}</td>
                <td>{emp.position}</td>
                <td>{emp.workShiftName}</td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    );
}