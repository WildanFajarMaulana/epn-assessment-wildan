import crypto from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { data, useFetcher, useLoaderData } from "react-router";
import { toast } from "sonner";
import { LoadingBar } from "~/components/LoadingBar";
import {
    createAttendanceWithLock,
    deleteAttendance,
    listAttendances,
    updateAttendanceWithLock,
} from "~/services/attendance.service.server";
import {
    AppServiceError,
    listWorkShifts,
    listEmployees,
} from "~/services/employee.service.server";
import {
    attendanceSchema,
    attendanceUpdateSchema,
    formatZodErrors,
} from "~/validators/schemas";
import type { Route } from "./+types/_app.absensi";

export function meta() {
    return [{ title: "Absensi Harian - HR App" }];
}

export async function loader({ request }: Route.LoaderArgs) {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    if (mode === "list") {
        const attendances = await listAttendances();
        return { mode: "list" as const, attendances };
    }

    if (mode === "employees") {
        const workShiftId = Number(url.searchParams.get("workShiftId"));
        const employees =
        Number.isInteger(workShiftId) && workShiftId > 0
            ? await listEmployees({ workShiftId })
            : [];
        return {
        mode: "employees" as const,
        employees: employees.map((e) => ({
            id: e.id,
            name: e.name,
            position: e.position,
            workShiftId: e.workShiftId,
        })),
        };
    }

    const workShifts = await listWorkShifts();
    return { mode: "init" as const, workShifts };
}

export async function action({ request }: Route.ActionArgs) {
    const requestId = crypto.randomUUID();
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "");

    try {
        if (intent === "create") {
            const parsed = attendanceSchema.safeParse({
                workShiftId: formData.get("workShiftId"),
                employeeId: formData.get("employeeId"),
                attendanceDate: formData.get("attendanceDate"),
                status: formData.get("status"),
                note: formData.get("note"),
            });

            if (!parsed.success) {
                const fieldErrors = formatZodErrors(parsed.error);
                const firstError = Object.values(fieldErrors)[0];
                return data(
                {
                    requestId,
                    ok: false,
                    message: firstError || "Validasi absensi gagal.",
                    fieldErrors,
                },
                { status: 400 });
            }

            const attendance = await createAttendanceWithLock(parsed.data);
            return data({
                requestId,
                ok: true,
                message: `Absensi (${parsed.data.status}) tanggal ${parsed.data.attendanceDate} berhasil disimpan.`,
                attendance,
                fieldErrors: {} as Record<string, string>,
            });
        }

        if (intent === "update") {
            const parsed = attendanceUpdateSchema.safeParse({
                id: formData.get("id"),
                workShiftId: formData.get("workShiftId"),
                employeeId: formData.get("employeeId"),
                attendanceDate: formData.get("attendanceDate"),
                status: formData.get("status"),
                note: formData.get("note"),
            });

            if (!parsed.success) {
                const fieldErrors = formatZodErrors(parsed.error);
                const firstError = Object.values(fieldErrors)[0];
                return data(
                {
                    requestId,
                    ok: false,
                    message: firstError || "Validasi update absensi gagal.",
                    fieldErrors,
                },
                { status: 400 });
            }

            const attendance = await updateAttendanceWithLock(parsed.data.id, parsed.data);
            return data({
                requestId,
                ok: true,
                message: `Absensi #${parsed.data.id} berhasil diperbarui.`,
                attendance,
                fieldErrors: {} as Record<string, string>,
            });
        }

        if (intent === "delete") {
            const id = Number(formData.get("id"));
            if (!Number.isInteger(id) || id <= 0) {
                return data(
                {
                    requestId,
                    ok: false,
                    message: "ID absensi tidak valid.",
                    fieldErrors: {} as Record<string, string>,
                },
                { status: 400 }
                );
            }

            await deleteAttendance(id);
            return data({
                requestId,
                ok: true,
                message: `Absensi #${id} berhasil dihapus.`,
                fieldErrors: {} as Record<string, string>,
            });
        }

        return data(
        {
            requestId,
            ok: false,
            message: "Intent tidak dikenali.",
            fieldErrors: {} as Record<string, string>,
        },
        { status: 400 });
    } catch (error) {
        if (error instanceof AppServiceError) {
        return data(
            {
            requestId,
            ok: false,
            message: error.message,
            fieldErrors: (error.fieldErrors ?? {}) as Record<string, string>,
            },
            { status: error.status }
        );
        }

        return data(
        {
            requestId,
            ok: false,
            message: error instanceof Error ? error.message : "Terjadi kesalahan server.",
            fieldErrors: {} as Record<string, string>,
        },
        { status: 500 }
        );
    }
}

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
    const initialData = useLoaderData<typeof loader>();
    const workShifts = initialData.mode === "init" ? initialData.workShifts : [];

    const listFetcher = useFetcher<typeof loader>({ key: "attendance-list" });
    const empFetcher = useFetcher<typeof loader>({ key: "workshift-employees" });
    const mutFetcher = useFetcher<typeof action>({ key: "attendance-mutation" });

    const [selectedWorkShiftId, setSelectedWorkShiftId] = useState("");
    const [selectedEmpId, setSelectedEmpId] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(getTodayDate);
    const [status, setStatus] = useState("Hadir");
    const [note, setNote] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);

    const didInitialLoadRef = useRef(false);
    const lastToastIdRef = useRef<string | null>(null);

    // load pertama kali
    useEffect(() => {
        if (didInitialLoadRef.current) return;
        didInitialLoadRef.current = true;
        listFetcher.load("/absensi?mode=list");
    }, [listFetcher]);

    useEffect(() => {
        const res = mutFetcher.data;
        if (mutFetcher.state !== "idle" || !res?.requestId) return;
        if (lastToastIdRef.current === res.requestId) return;

        lastToastIdRef.current = res.requestId;

        if (res.ok) {
            toast.success(res.message);
            setEditingId(null);
            setNote("");
            setStatus("Hadir");
            listFetcher.load("/absensi?mode=list");
        } else {
            toast.error(res.message);
        }
    }, [mutFetcher.state, mutFetcher.data, listFetcher]);

    function handleWorkShiftChange(workShiftId: string) {
        setSelectedWorkShiftId(workShiftId);
        setSelectedEmpId("");
        if (workShiftId) {
        empFetcher.load(`/absensi?mode=employees&workShiftId=${workShiftId}`);
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData();
        formData.set("intent", editingId ? "update" : "create");
        if (editingId) formData.set("id", String(editingId));
        formData.set("workShiftId", selectedWorkShiftId);
        formData.set("employeeId", selectedEmpId);
        formData.set("attendanceDate", attendanceDate);
        formData.set("status", status);
        formData.set("note", note);
        mutFetcher.submit(formData, { method: "post" });
    }

    function handleDelete(id: number) {
        const formData = new FormData();
        formData.set("intent", "delete");
        formData.set("id", String(id));
        mutFetcher.submit(formData, { method: "post" });
    }

    function startEdit(item: {
        id: number;
        workShiftId: number;
        employeeId: number;
        attendanceDate: string;
        status: string;
        note: string;
    }) {
        setEditingId(item.id);
        setSelectedWorkShiftId(String(item.workShiftId));
        setSelectedEmpId(String(item.employeeId));
        setAttendanceDate(item.attendanceDate);
        setStatus(item.status);
        setNote(item.note);
        empFetcher.load(`/absensi?mode=employees&workShiftId=${item.workShiftId}`);
    }

    const attendances =
        listFetcher.data?.mode === "list" ? listFetcher.data.attendances : [];
    const childEmployees =
        empFetcher.data?.mode === "employees" ? empFetcher.data.employees : [];

    const isLoadingList = listFetcher.state !== "idle";
    const isLoadingEmployees = empFetcher.state !== "idle";
    const isSubmitting = mutFetcher.state !== "idle";

    return (
        <div>
        <h2 style={{ marginBottom: 4 }}>Absensi Harian </h2>

        <section className="box">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <strong>{editingId ? `Edit Absensi #${editingId}` : "Catat Absensi Harian"}</strong>
            {editingId && (
                <button
                type="button"
                className="btn-light"
                onClick={() => {
                    setEditingId(null);
                    setNote("");
                    setStatus("Hadir");
                }}
                >
                Batal Edit
                </button>
            )}
            </div>

            <LoadingBar active={isSubmitting} label="Memproses submit ke PostgreSQL..." />

            <form onSubmit={handleSubmit} className="grid-2">
            <div>
                <label>1. Parent Dropdown: Work Shift</label>
                <select
                value={selectedWorkShiftId}
                onChange={(e) => handleWorkShiftChange(e.target.value)}
                >
                <option value="">-- Pilih Work Shift --</option>
                {workShifts.map((workShift) => (
                    <option key={workShift.id} value={workShift.id}>
                    {workShift.name}
                    </option>
                ))}
                </select>
            </div>

            <div>
                <label>2. Child Dropdown: Employee</label>
                <select
                value={selectedEmpId}
                disabled={!selectedWorkShiftId || isLoadingEmployees}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                >
                <option value="">
                    {isLoadingEmployees
                    ? "Memuat employee..."
                    : selectedWorkShiftId
                        ? "-- Pilih Employee --"
                        : "-- Pilih Work Shift dulu --"}
                </option>
                {childEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                    </option>
                ))}
                </select>
                <LoadingBar active={isLoadingEmployees} label="Loading child dropdown..." />
            </div>

            <div>
                <label>Tanggal Absensi</label>
                <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                />
            </div>

            <div>
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
                <label>Catatan</label>
                <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Hadir tepat waktu / WFO"
                />
            </div>

            <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
                <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingId ? "Update Absensi" : "Simpan Absensi"}
                </button>
            </div>
            </form>
        </section>

        <section className="box">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            </div>

            <LoadingBar active={isLoadingList} label="Memuat data absensi..." />

            <table>
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Tanggal</th>
                    <th>Work Shift</th>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Catatan</th>
                    <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {attendances.length === 0 ? (
                    <tr>
                        <td colSpan={7} style={{ textAlign: "center" }} className="muted">
                        {isLoadingList ? "Memuat..." : "Belum ada data absensi."}
                        </td>
                    </tr>
                    ) : (
                    attendances.map((item) => (
                        <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td>{item.attendanceDate}</td>
                        <td>{item.workShift?.name ?? item.workShiftId}</td>
                        <td>{item.employee?.name ?? item.employeeId}</td>
                        <td>{item.status}</td>
                        <td>{item.note}</td>
                        <td>
                            <div className="row">
                            <button
                                type="button"
                                className="btn-light"
                                onClick={() => startEdit(item)}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={isSubmitting}
                                onClick={() => handleDelete(item.id)}
                            >
                                Hapus
                            </button>
                            </div>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
            </table>
        </section>
        </div>
    );
    }
