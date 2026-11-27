import { createCookieSessionStorage } from "react-router";
import type { SessionUser } from "./context";

const sessionSecret = process.env.SESSION_SECRET || "random213213";

export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: "__epn_session",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets: [sessionSecret],
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 8, // 8 jam
    },
});

export async function getSession(request: Request) {
    return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function getUserFromRequest(
    request: Request
): Promise<SessionUser | null> {
    const session = await getSession(request);
    const user = session.get("user") as SessionUser | undefined;
    if (!user || typeof user.id !== "number") {
        return null;
    }
    return user;
}

export async function createUserSessionCookie(user: SessionUser) {
    const session = await sessionStorage.getSession();
    session.set("user", user);
    return sessionStorage.commitSession(session);
}

export async function destroyUserSessionCookie(request: Request) {
    const session = await getSession(request);
    return sessionStorage.destroySession(session);
}
