import bcrypt from "bcryptjs";
import type { DataSource } from "typeorm";
import {
    WorkShiftEntity,
    EmployeeEntity,
    UserEntity,
} from "./entities.server";

export async function seedInitialData(dataSource: DataSource) {
    const userRepo = dataSource.getRepository(UserEntity);
    const shiftRepo = dataSource.getRepository(WorkShiftEntity);
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

    const shiftCount = await shiftRepo.count();
    if (shiftCount === 0) {
        const [pagi, siang, malam] = await shiftRepo.save([
            { name: "Shift Pagi (08:00-17:00)" },
            { name: "Shift Siang (13:00-22:00)" },
            { name: "Shift Malam (21:00-06:00)" },
        ]);

        await empRepo.save([
        {
            name: "Angga Marta",
            email: "angga@epn.test",
            position: "Senior Software Engineer",
            workShiftId: pagi.id,
            photoPath: null,
        },
        {
            name: "Budi Santoso",
            email: "budi@epn.test",
            position: "Backend Developer",
            workShiftId: pagi.id,
            photoPath: null,
        },
        {
            name: "Siti Rahma",
            email: "siti@epn.test",
            position: "HR Specialist",
            workShiftId: siang.id,
            photoPath: null,
        },
        {
            name: "Dewi Lestari",
            email: "dewi@epn.test",
            position: "Finance Analyst",
            workShiftId: siang.id,
            photoPath: null,
        },
        ]);
    }
}
