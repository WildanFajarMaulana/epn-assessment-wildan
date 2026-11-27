import bcrypt from "bcryptjs";
import type { DataSource } from "typeorm";
import {
    DepartmentEntity,
    EmployeeEntity,
    UserEntity,
} from "./entities.server";

export async function seedInitialData(dataSource: DataSource) {
    const userRepo = dataSource.getRepository(UserEntity);
    const deptRepo = dataSource.getRepository(DepartmentEntity);
    const empRepo = dataSource.getRepository(EmployeeEntity);

    const userCount = await userRepo.count();
    if (userCount === 0) {
        const adminHash = await bcrypt.hash("admin123", 10);
        const staffHash = await bcrypt.hash("staff123", 10);

        await userRepo.save([
        {
            name: "Admin HR",
            email: "admin@epn.test",
            passwordHash: adminHash,
            role: "admin",
        },
        {
            name: "Staff Biasa",
            email: "staff@epn.test",
            passwordHash: staffHash,
            role: "staff",
        },
        ]);
    }

    const deptCount = await deptRepo.count();
    if (deptCount === 0) {
        const [it, hr, finance] = await deptRepo.save([
            { name: "IT" },
            { name: "HR" },
            { name: "Finance" },
        ]);

        await empRepo.save([
        {
            name: "Angga Marta",
            email: "angga@epn.test",
            position: "Senior Software Engineer",
            departmentId: it.id,
            photoPath: null,
        },
        {
            name: "Budi Santoso",
            email: "budi@epn.test",
            position: "Backend Developer",
            departmentId: it.id,
            photoPath: null,
        },
        {
            name: "Siti Rahma",
            email: "siti@epn.test",
            position: "HR Specialist",
            departmentId: hr.id,
            photoPath: null,
        },
        {
            name: "Dewi Lestari",
            email: "dewi@epn.test",
            position: "Finance Analyst",
            departmentId: finance.id,
            photoPath: null,
        },
        ]);
    }
}
