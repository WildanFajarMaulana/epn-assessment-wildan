import {EntitySchema} from "typeorm"

export type UserRole = "admin" | "staff"
export type AttendanceStatus = "Hadir" | "Izin" | "Sakit"

export interface User {
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
}

export interface Department {
    id: number;
    name: string;
    createdAt: Date;
    employees?: Employee[];
}

export interface Employee {
    id: number;
    name: string;
    email: string;
    position: string;
    departmentId: number;
    photoPath: string | null;
    createdAt: Date;
    department?: Department;
}

export interface DailyAttendance {
    id: number;
    departmentId: number;
    employeeId: number;
    attendanceDate: string; 
    status: AttendanceStatus;
    note: string;
    createdAt: Date;
    department?: Department;
    employee?: Employee;
}

export const UserEntity = new EntitySchema<User>({
    name: "User",
    tableName: "users",
    columns: {
        id: { type: "int", primary: true, generated: true },
        name: { type: "varchar", length: 120 },
        email: { type: "varchar", length: 160, unique: true },
        passwordHash: { type: "varchar", length: 255 },
        role: { type: "varchar", length: 20, default: "staff" },
        createdAt: { type: "timestamp", createDate: true },
    }
})

export const DepartmentEntity = new EntitySchema<Department>({
    name: "Department",
    tableName: "departments",
    columns: {
        id: { type: "int", primary: true, generated: true },
        name: { type: "varchar", length: 120, unique: true },
        createdAt: { type: "timestamp", createDate: true },
    },
    relations: {
        employees: {
            type: "one-to-many",
            target: "Employee",
            inverseSide: "department",
        },
    },
})

export const EmployeeEntity = new EntitySchema<Employee>({
    name: "Employee",
    tableName: "employees",
    columns: {
        id: { type: "int", primary: true, generated: true },
        name: { type: "varchar", length: 120 },
        email: { type: "varchar", length: 160, unique: true },
        position: { type: "varchar", length: 120 },
        departmentId: { type: "int" },
        photoPath: { type: "varchar", length: 255, nullable: true },
        createdAt: { type: "timestamp", createDate: true },
    },
    relations: {
        department: {
            type: "many-to-one",
            target: "Department",
            joinColumn: { name: "departmentId" },
            onDelete: "RESTRICT",
        },
    },
});

export const DailyAttendanceEntity = new EntitySchema<DailyAttendance>({
    name: "DailyAttendance",
    tableName: "daily_attendances",
    columns: {
        id: { type: "int", primary: true, generated: true },
        departmentId: { type: "int" },
        employeeId: { type: "int" },
        attendanceDate: { type: "varchar", length: 10 },
        status: { type: "varchar", length: 20, default: "Hadir" },
        note: { type: "varchar", length: 255 },
        createdAt: { type: "timestamp", createDate: true },
    },
    uniques: [
        {
            name: "UQ_attendance_employee_date",
            columns: ["employeeId", "attendanceDate"],
        },
    ],
    relations: {
        department: {
            type: "many-to-one",
            target: "Department",
            joinColumn: { name: "departmentId" },
            onDelete: "CASCADE",
        },
        employee: {
            type: "many-to-one",
            target: "Employee",
            joinColumn: { name: "employeeId" },
            onDelete: "CASCADE",
        },
    },
});