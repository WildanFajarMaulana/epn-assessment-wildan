import { ILike } from "typeorm";
import { getDataSource } from "~/db/data-source.server";
import {
    DepartmentEntity,
    EmployeeEntity,
    type Department,
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
    departmentId: number;
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

export async function listDepartments(): Promise<Department[]> {
    const ds = await getDataSource();
    return ds.getRepository(DepartmentEntity).find({
        order: { name: "ASC" },
    });
}

export async function listEmployees(filters?: {
    search?: string;
    departmentId?: number;
}): Promise<Employee[]> {
    const ds = await getDataSource();
    const repo = ds.getRepository(EmployeeEntity);

    const search = filters?.search?.trim();
    const departmentId = filters?.departmentId;

    if (search && departmentId) {
        return repo.find({
        where: [
            { name: ILike(`%${search}%`), departmentId },
            { email: ILike(`%${search}%`), departmentId },
            { position: ILike(`%${search}%`), departmentId },
        ],
        relations: { department: true },
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
        relations: { department: true },
        order: { id: "DESC" },
        });
    }

    if (departmentId) {
        return repo.find({
            where: { departmentId },
            relations: { department: true },
            order: { name: "ASC" },
        });
    }

    return repo.find({
        relations: { department: true },
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
            const deptRepo = manager.getRepository(DepartmentEntity);

            const dept = await deptRepo.findOne({ where: { id: input.departmentId } });
            if (!dept) {
                throw new AppServiceError("Department tidak ditemukan", 404, {
                departmentId: "Department tidak ditemukan",
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
                departmentId: input.departmentId,
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
            const deptRepo = manager.getRepository(DepartmentEntity);

            const employee = await empRepo.findOne({ where: { id } });
            if (!employee) {
                throw new AppServiceError("Employee tidak ditemukan", 404);
            }

            const dept = await deptRepo.findOne({ where: { id: input.departmentId } });
            if (!dept) {
                throw new AppServiceError("Department tidak ditemukan", 404, {
                departmentId: "Department tidak ditemukan",
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
            employee.departmentId = input.departmentId;

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

export async function createDepartment(name: string, quota: number): Promise<Department> {
    const ds = await getDataSource();
    const repo = ds.getRepository(DepartmentEntity);

    const existing = await repo.findOne({ where: { name: name.trim() } });
    if (existing) {
        throw new AppServiceError("Nama department sudah ada", 409, {
        name: "Nama department sudah terdaftar",
        });
    }

    return repo.save({ name: name.trim(), quota });
}

export async function updateDepartmentQuota(
    id: number,
    name: string,
    quota: number
): Promise<Department> {
    const ds = await getDataSource();
    const repo = ds.getRepository(DepartmentEntity);

    const dept = await repo.findOne({ where: { id } });
    if (!dept) {
        throw new AppServiceError("Department tidak ditemukan", 404);
    }

    const duplicate = await repo.findOne({ where: { name: name.trim() } });
    if (duplicate && duplicate.id !== id) {
        throw new AppServiceError("Nama department sudah ada", 409, {
        name: "Nama department sudah digunakan",
        });
    }

    dept.name = name.trim();
    dept.quota = quota;
    return repo.save(dept);
}

export async function getReportSummary() {
    const ds = await getDataSource();
    const departments = await ds.getRepository(DepartmentEntity).find({
        relations: { employees: true },
        order: { name: "ASC" },
    });

    const rows = departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        quota: dept.quota,
        employeeCount: dept.employees?.length ?? 0,
        employees: dept.employees ?? [],
    }));

    const totalEmployees = rows.reduce((sum, item) => sum + item.employeeCount, 0);
    const totalQuota = rows.reduce((sum, item) => sum + item.quota, 0);

    return { rows, totalEmployees, totalQuota };
}
