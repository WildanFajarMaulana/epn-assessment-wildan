import fs from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDataSource, getDataSource } from "~/db/data-source.server";
import {
    DailyAttendanceEntity,
    EmployeeEntity,
    UserEntity,
    WorkShiftEntity,
} from "~/db/entities.server";
import { seedInitialData } from "~/db/seed.server";
import { getUploadDir } from "~/lib/upload.server";
import { createAttendanceWithLock } from "~/services/attendance.service.server";
import {
    AppServiceError,
    createEmployeeWithPhoto,
    listEmployees,
} from "~/services/employee.service.server";
import {
    employeeSchema,
    loginSchema,
    MAX_UPLOAD_SIZE_BYTES,
    uploadFileMetaSchema,
} from "~/validators/schemas";

async function resetTestDatabase() {
  const ds = await getDataSource();
  await ds.getRepository(DailyAttendanceEntity).createQueryBuilder().delete().execute();
  await ds.getRepository(EmployeeEntity).createQueryBuilder().delete().execute();
  await ds.getRepository(WorkShiftEntity).createQueryBuilder().delete().execute();
  await ds.getRepository(UserEntity).createQueryBuilder().delete().execute();
  await seedInitialData(ds);
}

describe("Unit Tests - Validasi Zod, Rollback Atomik & Concurrency Race Condition", () => {
  beforeAll(async () => {
    await getDataSource();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await resetTestDatabase();
    await closeDataSource();
  });

  describe("Validasi Input Zod", () => {
    it("menolak input kosong pada form login & employee", () => {
      const loginRes = loginSchema.safeParse({ email: "", password: "" });
      expect(loginRes.success).toBe(false);

      const empRes = employeeSchema.safeParse({
        name: "",
        email: "",
        position: "",
        workShiftId: "",
      });
      expect(empRes.success).toBe(false);
    });

    it("menolak format email tidak valid dan password terlalu pendek", () => {
      const loginRes = loginSchema.safeParse({
        email: "bukan-email",
        password: "123",
      });
      expect(loginRes.success).toBe(false);
    });

    it("menolak file upload dengan ekstensi non-gambar (.pdf) dan ukuran > 2MB", () => {
      const badExt = uploadFileMetaSchema.safeParse({
        name: "dokumen.pdf",
        type: "application/pdf",
        size: 1024,
      });
      expect(badExt.success).toBe(false);

      const tooBig = uploadFileMetaSchema.safeParse({
        name: "foto.png",
        type: "image/png",
        size: MAX_UPLOAD_SIZE_BYTES + 1,
      });
      expect(tooBig.success).toBe(false);

      const validImg = uploadFileMetaSchema.safeParse({
        name: "avatar.png",
        type: "image/png",
        size: 100 * 1024,
      });
      expect(validImg.success).toBe(true);
    });
  });

  describe("Employee Service & Atomic File/DB Rollback", () => {
    it("menolak insert data duplikat (email sudah terdaftar) dengan status 409", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      await expect(
        createEmployeeWithPhoto({
          name: "Duplikat Angga",
          email: "angga@epn.test",
          position: "QA",
          workShiftId: shiftPagi.id,
        })
      ).rejects.toMatchObject({ status: 409 });
    });

    it("ROLLBACK database jika upload file gagal setelah insert DB", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      const fakeImage = new File([new Uint8Array([137, 80, 78, 71])], "foto.png", {
        type: "image/png",
      });

      await expect(
        createEmployeeWithPhoto(
          {
            name: "Calon Rollback",
            email: "rollback@epn.test",
            position: "Tester",
            workShiftId: shiftPagi.id,
          },
          fakeImage,
          { simulateUploadFailure: true }
        )
      ).rejects.toThrow("Simulasi gagal menyimpan file");

      const found = await ds
        .getRepository(EmployeeEntity)
        .findOneBy({ email: "rollback@epn.test" });
      expect(found).toBeNull();
    });

    it("HAPUS file terupload jika DB gagal setelah file ditulis (anti orphan file)", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      const uploadDir = getUploadDir();
      await fs.mkdir(uploadDir, { recursive: true });
      const filesBefore = await fs.readdir(uploadDir);

      const fakeImage = new File([new Uint8Array([137, 80, 78, 71])], "orphan.png", {
        type: "image/png",
      });

      await expect(
        createEmployeeWithPhoto(
          {
            name: "Calon Orphan",
            email: "orphan@epn.test",
            position: "Tester",
            workShiftId: shiftPagi.id,
          },
          fakeImage,
          { simulatePostUploadDbFailure: true }
        )
      ).rejects.toThrow("Simulasi gagal update DB");

      const filesAfter = await fs.readdir(uploadDir);
      expect(filesAfter.length).toBe(filesBefore.length);

      const found = await ds
        .getRepository(EmployeeEntity)
        .findOneBy({ email: "orphan@epn.test" });
      expect(found).toBeNull();
    });

    it("berhasil search employee berdasarkan keyword nama", async () => {
      const results = await listEmployees({ search: "Angga" });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Angga Marta");
    });
  });

  describe("Mitigasi Concurrency & Race Condition (TypeORM Pessimistic Lock)", () => {
    it("mencegah double-absen saat 3 request bersamaan masuk untuk employee & tanggal yang sama", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });
      const angga = await ds
        .getRepository(EmployeeEntity)
        .findOneByOrFail({ email: "angga@epn.test" });

      const results = await Promise.allSettled([
        createAttendanceWithLock({
          workShiftId: shiftPagi.id,
          employeeId: angga.id,
          attendanceDate: "2026-11-27",
          status: "Hadir",
          note: "Concurrent Check-in #1",
        }),
        createAttendanceWithLock({
          workShiftId: shiftPagi.id,
          employeeId: angga.id,
          attendanceDate: "2026-11-27",
          status: "Hadir",
          note: "Concurrent Check-in #2",
        }),
        createAttendanceWithLock({
          workShiftId: shiftPagi.id,
          employeeId: angga.id,
          attendanceDate: "2026-11-27",
          status: "Hadir",
          note: "Concurrent Check-in #3",
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(2);

      for (const rej of rejected) {
        const reason = (rej as PromiseRejectedResult).reason;
        expect(reason).toBeInstanceOf(AppServiceError);
        expect(reason.status).toBe(409);
      }

      const count = await ds.getRepository(DailyAttendanceEntity).count({
        where: { employeeId: angga.id, attendanceDate: "2026-11-27" },
      });
      expect(count).toBe(1);
    });
  });
});
