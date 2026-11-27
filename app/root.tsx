import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "sonner";
import { rootMiddleware } from "~/middleware/middlewares.server";
import type { Route } from "./+types/root";
import "./app.css";

export const middleware: Route.MiddlewareFunction[] = [rootMiddleware];

export function Layout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="id">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body>
          {children}
          <Toaster position="top-right" richColors />
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let status = 500;
    let title = "Terjadi Kesalahan";
    let details = "Silakan coba lagi.";

    if (isRouteErrorResponse(error)) {
      status = error.status;
      title = `${error.status} - ${error.statusText || "Error"}`;
      details = typeof error.data === "string" ? error.data : details;
    } else if (import.meta.env.DEV && error instanceof Error) {
      details = error.message;
    }

    return (
      <main className="container">
        <div className="box">
          <h2>
            [{status}] {title}
          </h2>
          <p>{details}</p>
          <Link to="/employees">← Kembali ke Dashboard</Link>
        </div>
      </main>
    );
}
