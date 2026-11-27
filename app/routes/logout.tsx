import { redirect } from "react-router";
import { destroyUserSessionCookie } from "~/lib/session.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  const cookie = await destroyUserSessionCookie(request);
  return redirect("/login", {
    headers: { "Set-Cookie": cookie },
  });
}

export async function loader() {
  return redirect("/login");
}
