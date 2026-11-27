import { ILike } from "typeorm";
import { getDataSource } from "~/db/data-source.server";
import {
    EmployeeEntity,
    WorkShiftEntity,
    type WorkShift,
    type Employee,
} from "~/db/entities.server";
import {
    deleteUploadedFile,
    saveUploadedFile,
} from "~/lib/upload.server";

export interface CreateEmployeeInput {
    name: string;
    email: string;
    position: string;
    workShiftId: number;
}

export class AppServiceError extends Error {
    status: number;
    fieldErrors?: Record<string, string>;

  constructor(
        message: string,
        status = 400,
        fieldErrors?: Record<string, string>
  ) {
        super(message);
        this.name = "AppServiceError";
        this.status = status;
        this.fieldErrors = fieldErrors;
  }
}

export async function listWorkShifts(): Promise<WorkShift[]> {
    const ds = await getDataSource();
    return ds.getRepository(WorkShiftEntity).find({
        order: { id: "ASC" },
    });
}

export async function listEmployees(filters?: {
    search?: string;
    workShiftId?: number;
}): Promise<Employee[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(EmployeeEntity);

    const search = filters?.search?.trim();
    const workShiftId = filters?.workShiftId;

    if (search && workShiftId) {
        return repo.find({
        where: [
            { name: ILike(`%${search}%`), workShiftId },
            { email: ILike(`%${search}%`), workShiftId },
            { position: ILike(`%${search}%`), workShiftId },
        ],
        relations: { workShift: true },
        order: { id: "DESC" },
        });
    }

    if (search) {
        return repo.find({
        where: [
            { name: ILike(`%${search}%`) },
            { email: ILike(`%${search}%`) },
            { position: ILike(`%${search}%`) },
        ],
        relations: { workShift: true },
        order: { id: "DESC" },
        });
    }

    if (workShiftId) {
        return repo.find({
            where: { workShiftId },
            relations: { workShift: true },
            order: { name: "ASC" },
        });
    }

    return repo.find({
        relations: { workShift: true },
        order: { id: "DESC" },
    });
}


export async function createEmployeeWithPhoto(
    input: CreateEmployeeInput,
    photoFile?: File | null,
    testHooks?: {
        simulateUploadFailure?: boolean;
        simulatePostUploadDbFailure?: boolean;
    }
): Promise<Employee> {
    const ds = await getDataSource();
    let uploadedFilename: string | null = null;

    try {
        return await ds.transaction(async (manager) => {
            const empRepo = manager.getRepository(EmployeeEntity);
            const deptRepo = manager.getRepository(WorkShiftEntity);

            const dept = await deptRepo.findOne({ where: { id: input.workShiftId } });
            if (!dept) {
                throw new AppServiceError("Work Shift tidak ditemukan", 404, {
                workShiftId: "Work Shift tidak ditemukan",
                });
            }

            const normalizedEmail = input.email.trim().toLowerCase();
            const existing = await empRepo.findOne({ where: { email: normalizedEmail } });
            if (existing) {
                throw new AppServiceError("Email employee sudah terdaftar", 409, {
                email: "Email sudah digunakan employee lain",
                });
            }

            const created = await empRepo.save({
                name: input.name.trim(),
                email: normalizedEmail,
                position: input.position.trim(),
                workShiftId: input.workShiftId,
                photoPath: null as string | null,
            });

            if (photoFile && photoFile.size > 0) {
                    uploadedFilename = await saveUploadedFile(photoFile, {
                    simulateFailure: testHooks?.simulateUploadFailure,
                });

                if (testHooks?.simulatePostUploadDbFailure) {
                    throw new Error("Simulasi gagal update DB setelah upload file");
                }

                created.photoPath = uploadedFilename;
                await empRepo.save(created);
            }

            return created;
        });
    } catch (error) {
        if (uploadedFilename) {
            await deleteUploadedFile(uploadedFilename);
        }
        throw error;
    }
}

export async function updateEmployeeWithPhoto(
    id: number,
    input: CreateEmployeeInput,
    photoFile?: File | null
): Promise<Employee> {
    const ds = await getDataSource();
    let newlyUploadedFile: string | null = null;
    let oldPhotoToDelete: string | null = null;

    try {
        const updated = await ds.transaction(async (manager) => {
            const empRepo = manager.getRepository(EmployeeEntity);
            const workShiftRepo = manager.getRepository(WorkShiftEntity);

            const employee = await empRepo.findOne({ where: { id } });
            if (!employee) {
                throw new AppServiceError("Employee tidak ditemukan", 404);
            }

            const workShift = await workShiftRepo.findOne({ where: { id: input.workShiftId } });
            if (!workShift) {
                throw new AppServiceError("Work Shift tidak ditemukan", 404, {
                workShiftId: "Work Shift tidak ditemukan",
                });
            }

            const normalizedEmail = input.email.trim().toLowerCase();
            const duplicate = await empRepo.findOne({ where: { email: normalizedEmail } });
            if (duplicate && duplicate.id !== id) {
                throw new AppServiceError("Email employee sudah terdaftar", 409, {
                email: "Email sudah digunakan employee lain",
                });
            }

            employee.name = input.name.trim();
            employee.email = normalizedEmail;
            employee.position = input.position.trim();
            employee.workShiftId = input.workShiftId;

            if (photoFile && photoFile.size > 0) {
                newlyUploadedFile = await saveUploadedFile(photoFile);
                oldPhotoToDelete = employee.photoPath;
                employee.photoPath = newlyUploadedFile;
            }

            return empRepo.save(employee);
        });

        if (oldPhotoToDelete) {
            await deleteUploadedFile(oldPhotoToDelete);
        }

        return updated;
    } catch (error) {
        if (newlyUploadedFile) {
            await deleteUploadedFile(newlyUploadedFile);
        }
        throw error;
    }
}

export async function deleteEmployee(id: number): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(EmployeeEntity);

    const employee = await repo.findOne({ where: { id } });
    if (!employee) {
        throw new AppServiceError("Employee tidak ditemukan", 404);
    }

    const photoToDelete = employee.photoPath;
    await repo.remove(employee);

    if (photoToDelete) {
        await deleteUploadedFile(photoToDelete);
    }
}

export async function createWorkShift(name: string): Promise<WorkShift> {
    const ds = await getDataSource();
    const repo = ds.getRepository(WorkShiftEntity);

    const existing = await repo.findOne({ where: { name: name.trim() } });
    if (existing) {
        throw new AppServiceError("Nama work shift sudah ada", 409, {
        name: "Nama work shift sudah terdaftar",
        });
    }

    return repo.save({ name: name.trim() });
}

export async function updateWorkShift(
    id: number,
    name: string
): Promise<WorkShift> {
    const ds = await getDataSource();
    const repo = ds.getRepository(WorkShiftEntity);

    const workShift = await repo.findOne({ where: { id } });
    if (!workShift) {
        throw new AppServiceError("Work Shift tidak ditemukan", 404);
    }

    const duplicate = await repo.findOne({ where: { name: name.trim() } });
    if (duplicate && duplicate.id !== id) {
        throw new AppServiceError("Nama work shift sudah ada", 409, {
        name: "Nama work shift sudah digunakan",
        });
    }

    workShift.name = name.trim();
    return repo.save(workShift);
}

export async function getReportSummary() {
    const ds = await getDataSource();
    const shifts = await ds.getRepository(WorkShiftEntity).find({
        relations: { employees: true },
        order: { id: "ASC" },
    });

    const rows = shifts.map((shift) => ({
        id: shift.id,
        name: shift.name,
        employeeCount: shift.employees?.length ?? 0,
        employees: shift.employees ?? [],
    }));

    const totalEmployees = rows.reduce((sum, item) => sum + item.employeeCount, 0);

    return { rows, totalEmployees };
}
