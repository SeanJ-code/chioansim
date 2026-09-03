import path from "node:path";
import { config } from "dotenv";
import { defineSsrMiddleware } from "#q-app";
import type { RequestHandler } from "express";
import type { AuthRequest } from "../../../back/src/types/auth";

let sessionMiddleware: RequestHandler | undefined;

export function getSessionMiddleware(): RequestHandler {
  if (!sessionMiddleware) throw new Error("Session middleware 尚未初始化");
  return sessionMiddleware;
}

export default defineSsrMiddleware(async ({ app }) => {
  const backendRoot = path.resolve(
    process.cwd(),
    import.meta.env.QUASAR_DEV ? "../back" : "../../../back"
  );

  if (!process.env.MONGODB_URI) {
    config({
      path: path.join(backendRoot, ".env")
    });
  }
  process.env.UPLOAD_DIRECTORY ||= path.join(backendRoot, "uploads");
  process.env.LTC_SNAPSHOT_PATH ||= path.join(backendRoot, "data/ltc-abc.csv.gz");

  const [
    { default: mongoose },
    { validateEnvironment },
    { createSessionMiddleware },
    { ensureServiceCatalog },
    { resolveSessionAuth },
    { app: apiApp }
  ] =
    await Promise.all([
      import("mongoose"),
      import("../../../back/src/configs/env"),
      import("../../../back/src/configs/session"),
      import("../../../back/src/configs/service-catalog"),
      import("../../../back/src/middlewares/auth"),
      import("../../../back/src/configs/app")
    ]);

  validateEnvironment();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI as string, { serverSelectionTimeoutMS: 10_000 });
    await ensureServiceCatalog();
    console.log("MongoDB connected");
  }

  app.set("trust proxy", 1);
  const middleware = createSessionMiddleware();
  sessionMiddleware = middleware;
  app.use(middleware);
  app.use(resolveSessionAuth);
  app.use((req, res, next) => {
    const auth = (req as AuthRequest).auth;
    if (!req.path.startsWith("/api/") && auth) {
      res.setHeader("X-SSR-Auth-Role", auth.role);
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      apiApp(req, res, next);
      return;
    }
    next();
  });
});
