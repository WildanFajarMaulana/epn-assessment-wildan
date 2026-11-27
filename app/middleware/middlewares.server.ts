import { redirect, type MiddlewareFunction } from "react-router";
import { userContext } from "~/lib/context";
import { getUserFromRequest } from "~/lib/session.server";


export const rootMiddleware: MiddlewareFunction<Response> = async (
    { request, context },
    next
) => {
    const start = performance.now();
    const user = await getUserFromRequest(request);
    context.set(userContext, user);

    const response = await next();

    const durationMs = Math.round(performance.now() - start);
    const url = new URL(request.url);
    console.log(`[ROOT MW] ${request.method} ${url.pathname} (${durationMs}ms)`);

    return response;
};

export const authMiddleware: MiddlewareFunction<Response> = async (
    { request, context },
    next
) => {
    const user = context.get(userContext);
    if (!user) {
        const url = new URL(request.url);
        const redirectTo = encodeURIComponent(url.pathname + url.search);
        throw redirect(`/login?redirectTo=${redirectTo}`);
    }
    return next();
};


export const requireAdminMiddleware: MiddlewareFunction<Response> = async (
    { context },
    next
) => {
    const user = context.get(userContext);
    if (!user) {
        throw redirect("/login");
    }
    if (user.role !== "admin") {
        throw new Response(
        "Forbidden: Hanya user dengan role ADMIN yang dapat mengakses halaman ini.",
        { status: 403, statusText: "Forbidden" }
        );
    }
    return next();
};
