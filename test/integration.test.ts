import { RouterContextProvider } from "react-router";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDataSource, getDataSource } from "~/db/data-source.server";
import {
    DailyAttendanceEntity,
    EmployeeEntity,
    UserEntity,
    WorkShiftEntity,
} from "~/db/entities.server";
import { seedInitialData } from "~/db/seed.server";
import { userContext, type SessionUser } from "~/lib/context";
import {
    authMiddleware,
    requireAdminMiddleware,
} from "~/middleware/middlewares.server";
import {
    action as absensiAction,
    loader as absensiLoader,
} from "~/routes/_app.absensi";
import {
    action as employeesAction,
    loader as employeesLoader,
} from "~/routes/_app.employees";
import { action as loginAction } from "~/routes/login";

const ADMIN_USER: SessionUser = {
  id: 1,
  name: "Admin HR",
  email: "admin@epn.test",
  role: "admin",
};

const STAFF_USER: SessionUser = {
  id: 2,
  name: "Staff Biasa",
  email: "staff@epn.test",
  role: "staff",
};

function makeArgs(
  urlStr: string,
  user: SessionUser | null,
  init?: RequestInit,
  pattern = "/"
) {
  const request = new Request(urlStr, init);
  const context = new RouterContextProvider();
  context.set(userContext, user);
  return {
    request,
    url: new URL(request.url),
    pattern,
    params: {},
    context,
  };
}

async function resetTestDatabase() {
  const ds = await getDataSource();
  await ds.getRepository(DailyAttendanceEntity).createQueryBuilder().delete().execute();
  await ds.getRepository(EmployeeEntity).createQueryBuilder().delete().execute();
  await ds.getRepository(WorkShiftEntity).createQueryBuilder().delete().execute();
  await ds.getRepository(UserEntity).createQueryBuilder().delete().execute();
  await seedInitialData(ds);
}

function unwrapDataResult(result: unknown): { status: number; body: any } {
  if (result && typeof result === "object" && "init" in result && "data" in result) {
    const r = result as { data: unknown; init?: { status?: number } | null };
    return { status: r.init?.status ?? 200, body: r.data };
  }
  return { status: 200, body: result };
}

describe("Integration Tests - CRUD Route, Auth, RBAC, Validasi & Error Handling", () => {
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

  describe("CRUD Route /employees & /absensi", () => {
    it("melakukan Create, Read/Search, Update, dan Delete employee secara penuh", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      const createForm = new FormData();
      createForm.set("intent", "create");
      createForm.set("name", "Rina Kartika");
      createForm.set("email", "rina@epn.test");
      createForm.set("position", "Frontend Engineer");
      createForm.set("workShiftId", String(shiftPagi.id));
      createForm.set(
        "photo",
        new File([new Uint8Array([137, 80, 78, 71])], "rina.png", {
          type: "image/png",
        })
      );

      const createRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: createForm },
            "/employees"
          )
        )
      );
      expect(createRes.status).toBe(200);
      expect(createRes.body.ok).toBe(true);

      const loaderData = await employeesLoader(
        makeArgs("http://localhost/employees?q=Rina", ADMIN_USER, undefined, "/employees")
      );
      expect(loaderData.employees.length).toBe(1);
      const createdEmp = loaderData.employees[0];
      expect(createdEmp.email).toBe("rina@epn.test");
      expect(createdEmp.photoPath).toBeTruthy();

      const updateForm = new FormData();
      updateForm.set("intent", "update");
      updateForm.set("id", String(createdEmp.id));
      updateForm.set("name", "Rina Kartika Updated");
      updateForm.set("email", "rina@epn.test");
      updateForm.set("position", "Lead Frontend");
      updateForm.set("workShiftId", String(shiftPagi.id));

      const updateRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: updateForm },
            "/employees"
          )
        )
      );
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.ok).toBe(true);

      const deleteForm = new FormData();
      deleteForm.set("intent", "delete");
      deleteForm.set("id", String(createdEmp.id));

      const deleteRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: deleteForm },
            "/employees"
          )
        )
      );
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.ok).toBe(true);

      const afterDelete = await employeesLoader(
        makeArgs("http://localhost/employees?q=Rina", ADMIN_USER, undefined, "/employees")
      );
      expect(afterDelete.employees.length).toBe(0);
    });

    it("memuat child dropdown & CRUD absensi langsung di route /absensi", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      const empRes = await absensiLoader(
        makeArgs(
          `http://localhost/absensi?mode=employees&workShiftId=${shiftPagi.id}`,
          ADMIN_USER,
          undefined,
          "/absensi"
        )
      );
      expect(empRes.mode).toBe("employees");
      const angga =
        empRes.mode === "employees"
          ? empRes.employees.find((e: any) => e.name === "Angga Marta")
          : undefined;
      expect(angga).toBeDefined();

      const form = new FormData();
      form.set("intent", "create");
      form.set("workShiftId", String(shiftPagi.id));
      form.set("employeeId", String(angga!.id));
      form.set("attendanceDate", "2026-11-27");
      form.set("status", "Hadir");
      form.set("note", "Hadir WFO tepat waktu");

      const attRes = unwrapDataResult(
        await absensiAction(
          makeArgs(
            "http://localhost/absensi",
            ADMIN_USER,
            { method: "POST", body: form },
            "/absensi"
          )
        )
      );
      expect(attRes.body.ok).toBe(true);
      expect(attRes.body.requestId).toBeTruthy();

      const listRes = await absensiLoader(
        makeArgs("http://localhost/absensi?mode=list", ADMIN_USER, undefined, "/absensi")
      );
      expect(listRes.mode).toBe("list");
      if (listRes.mode === "list") {
        expect(listRes.attendances.length).toBe(1);
      }
    });
  });

  describe("Authentication & Authorization (RBAC)", () => {
    it("menolak akses tanpa login (redirect 302 ke /login)", async () => {
      try {
        await authMiddleware(
          makeArgs("http://localhost/employees", null, undefined, "/employees"),
          async () => new Response("ok")
        );
        expect.fail("Seharusnya throw redirect ke /login");
      } catch (err) {
        expect(err).toBeInstanceOf(Response);
        const res = err as Response;
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("/login");
      }
    });

    it("menolak login dengan password salah (401) dan menerima akun valid (302 + Cookie)", async () => {
      const badForm = new FormData();
      badForm.set("email", "admin@epn.test");
      badForm.set("password", "salah123");

      const badRes = unwrapDataResult(
        await loginAction(
          makeArgs(
            "http://localhost/login",
            null,
            { method: "POST", body: badForm },
            "/login"
          )
        )
      );
      expect(badRes.status).toBe(401);

      const goodForm = new FormData();
      goodForm.set("email", "admin@epn.test");
      goodForm.set("password", "admin123");

      const goodRes = (await loginAction(
        makeArgs(
          "http://localhost/login",
          null,
          { method: "POST", body: goodForm },
          "/login"
        )
      )) as Response;

      expect(goodRes.status).toBe(302);
      expect(goodRes.headers.get("Set-Cookie")).toContain("__epn_session=");
    });

    it("menolak user STAFF mengakses route & aksi khusus ADMIN (403 Forbidden)", async () => {
      try {
        await requireAdminMiddleware(
          makeArgs(
            "http://localhost/admin/shifts",
            STAFF_USER,
            undefined,
            "/admin/shifts"
          ),
          async () => new Response("ok")
        );
        expect.fail("Staff seharusnya ditolak dengan 403");
      } catch (err) {
        expect(err).toBeInstanceOf(Response);
        expect((err as Response).status).toBe(403);
      }

      const allowedRes = await requireAdminMiddleware(
        makeArgs(
          "http://localhost/admin/shifts",
          ADMIN_USER,
          undefined,
          "/admin/shifts"
        ),
        async () => new Response("allowed", { status: 200 })
      );
      expect((allowedRes as Response).status).toBe(200);

      const delForm = new FormData();
      delForm.set("intent", "delete");
      delForm.set("id", "1");

      const delRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            STAFF_USER,
            { method: "POST", body: delForm },
            "/employees"
          )
        )
      );
      expect(delRes.status).toBe(403);
      expect(delRes.body.ok).toBe(false);
    });
  });

  describe("Error Handling & Validasi Route", () => {
    it("mengembalikan 400 untuk input kosong/format salah & file non-gambar", async () => {
      const emptyForm = new FormData();
      emptyForm.set("intent", "create");
      emptyForm.set("name", "");
      emptyForm.set("email", "format-salah");
      emptyForm.set("position", "");
      emptyForm.set("workShiftId", "0");

      const res = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: emptyForm },
            "/employees"
          )
        )
      );
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.fieldErrors.name).toBeTruthy();
      expect(res.body.fieldErrors.email).toBeTruthy();

      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      const pdfForm = new FormData();
      pdfForm.set("intent", "create");
      pdfForm.set("name", "Test PDF");
      pdfForm.set("email", "pdf@epn.test");
      pdfForm.set("position", "Engineer");
      pdfForm.set("workShiftId", String(shiftPagi.id));
      pdfForm.set(
        "photo",
        new File(["%PDF-1.4"], "malware.pdf", { type: "application/pdf" })
      );

      const pdfRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: pdfForm },
            "/employees"
          )
        )
      );
      expect(pdfRes.status).toBe(400);
      expect(pdfRes.body.fieldErrors.photo).toBeTruthy();
    });

    it("mengembalikan 409 untuk email duplikat & 404 saat delete ID tidak ada", async () => {
      const ds = await getDataSource();
      const shiftPagi = await ds
        .getRepository(WorkShiftEntity)
        .findOneByOrFail({ name: "Shift Pagi (08:00-17:00)" });

      const dupForm = new FormData();
      dupForm.set("intent", "create");
      dupForm.set("name", "Angga Lain");
      dupForm.set("email", "angga@epn.test");
      dupForm.set("position", "Dev");
      dupForm.set("workShiftId", String(shiftPagi.id));

      const dupRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: dupForm },
            "/employees"
          )
        )
      );
      expect(dupRes.status).toBe(409);

      const notFoundForm = new FormData();
      notFoundForm.set("intent", "delete");
      notFoundForm.set("id", "999999");

      const nfRes = unwrapDataResult(
        await employeesAction(
          makeArgs(
            "http://localhost/employees",
            ADMIN_USER,
            { method: "POST", body: notFoundForm },
            "/employees"
          )
        )
      );
      expect(nfRes.status).toBe(404);
    });
  });
});
