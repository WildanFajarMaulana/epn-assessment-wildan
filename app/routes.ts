import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    route("login", "routes/login.tsx"),
    route("logout", "routes/logout.tsx"),

    route("report", "routes/report.tsx"),
    route("uploads/:filename", "routes/uploads.$filename.ts"),

    layout("routes/_app.tsx", [
        route("employees", "routes/_app.employees.tsx"),
        route("admin/shifts", "routes/_app.admin-shifts.tsx"),
        route("parallel-api", "routes/_app.parallel-api.tsx"),
        route("absensi", "routes/_app.absensi.tsx"),
        route("cached", "routes/_app.cached.tsx"),
    ]),

] satisfies RouteConfig;
