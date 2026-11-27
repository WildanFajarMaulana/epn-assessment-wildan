import {EntitySchema} from "typeorm"

export type UserRole = "admin" | "staff"

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
    quota: number;
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

export interface QuotaClaim {
    id: number;
    departmentId: number;
    employeeId: number;
    amount: number;
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
        quota: { type: "int", default: 5 },
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

export const QuotaClaimEntity = new EntitySchema<QuotaClaim>({
    name: "QuotaClaim",
    tableName: "quota_claims",
    columns: {
        id: { type: "int", primary: true, generated: true },
        departmentId: { type: "int" },
        employeeId: { type: "int" },
        amount: { type: "int", default: 1 },
        note: { type: "varchar", length: 255 },
        createdAt: { type: "timestamp", createDate: true },
    },
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