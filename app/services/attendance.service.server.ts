import { getDataSource } from "~/db/data-source.server";
import {
    DailyAttendanceEntity,
    EmployeeEntity,
    type AttendanceStatus,
    type DailyAttendance,
} from "~/db/entities.server";
import { AppServiceError } from "./employee.service.server";

export async function listAttendances(): Promise<DailyAttendance[]> {
    const ds = await getDataSource();
    return ds.getRepository(DailyAttendanceEntity).find({
        relations: { workShift: true, employee: true },
        order: { id: "DESC" },
    });
}

export interface AttendanceInput {
    workShiftId: number;
    employeeId: number;
    attendanceDate: string;
    status: AttendanceStatus;
    note: string;
}

export async function createAttendanceWithLock(
  input: AttendanceInput
): Promise<DailyAttendance> {
  const ds = await getDataSource();

  try {
    return await ds.transaction(async (manager) => {
        const employee = await manager
            .createQueryBuilder(EmployeeEntity, "emp")
            .setLock("pessimistic_write")
            .where("emp.id = :id AND emp.workShiftId = :workShiftId", {
            id: input.employeeId,
            workShiftId: input.workShiftId,
            })
            .getOne();

        if (!employee) {
            throw new AppServiceError("Employee tidak ditemukan pada work shift yang dipilih",400);
        }

        const attendanceRepo = manager.getRepository(DailyAttendanceEntity);

        const existing = await attendanceRepo.findOne({
            where: {
            employeeId: input.employeeId,
            attendanceDate: input.attendanceDate,
            },
        });

        if (existing) {
            throw new AppServiceError(
            `${employee.name} sudah tercatat absen pada tanggal ${input.attendanceDate}`,
            409
            );
        }

        return attendanceRepo.save({
            workShiftId: input.workShiftId,
            employeeId: input.employeeId,
            attendanceDate: input.attendanceDate,
            status: input.status,
            note: input.note.trim(),
        });
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new AppServiceError(
        "Employee sudah tercatat absen pada tanggal tersebut",
        409
      );
    }
    throw error;
  }
}

export async function updateAttendanceWithLock(
    id: number,
    input: AttendanceInput
): Promise<DailyAttendance> {
  const ds = await getDataSource();

    return ds.transaction(async (manager) => {
        const attendanceRepo = manager.getRepository(DailyAttendanceEntity);
        const existing = await attendanceRepo.findOne({ where: { id } });
        if (!existing) {
            throw new AppServiceError("Data absensi tidak ditemukan", 404);
        }

        const employee = await manager
        .createQueryBuilder(EmployeeEntity, "emp")
        .setLock("pessimistic_write")
        .where("emp.id = :id AND emp.workShiftId = :workShiftId", {
            id: input.employeeId,
            workShiftId: input.workShiftId,
        })
        .getOne();

        if (!employee) {
            throw new AppServiceError("Employee tidak sesuai dengan work shift yang dipilih", 400);
        }

        const duplicate = await attendanceRepo.findOne({
        where: {
            employeeId: input.employeeId,
            attendanceDate: input.attendanceDate,
        },
        });

        if (duplicate && duplicate.id !== id) {
        throw new AppServiceError(
            `${employee.name} sudah tercatat absen pada tanggal ${input.attendanceDate}`,409);
        }

        existing.workShiftId = input.workShiftId;
        existing.employeeId = input.employeeId;
        existing.attendanceDate = input.attendanceDate;
        existing.status = input.status;
        existing.note = input.note.trim();

        return attendanceRepo.save(existing);
    });
}

export async function deleteAttendance(id: number): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(DailyAttendanceEntity);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
        throw new AppServiceError("Data absensi tidak ditemukan", 404);
    }
    await repo.remove(existing);
}
