import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    route("login", "routes/login.tsx"),
    route("logout", "routes/logout.tsx"),

    layout("routes/_app.tsx", [
        route("employees", "routes/_app.employees.tsx"),
    ]),

] satisfies RouteConfig;
