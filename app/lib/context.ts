import { createContext } from "react-router";
import type { UserRole } from "~/db/entities.server";

export interface SessionUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
}

export const userContext = createContext<SessionUser | null>(null);
