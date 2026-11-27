import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    route("login", "routes/login.tsx"),
    route("logout", "routes/logout.tsx"),

    route("report", "routes/report.tsx"),
    route("uploads/:filename", "routes/uploads.$filename.ts"),

    layout("routes/_app.tsx", [
        route("employees", "routes/_app.employees.tsx"),
        route("admin/departments", "routes/_app.admin-departments.tsx"),
        route("parallel-api", "routes/_app.parallel-api.tsx"),
    ]),

] satisfies RouteConfig;
