import path from "node:path";
import { config } from "dotenv";
import { defineSsrMiddleware } from "#q-app";
import type { AuthRequest } from "../../../back/src/types/auth";

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
    { default: session },
    { default: MongoStore },
    { getSessionSecret, validateEnvironment },
    { ensureServiceCatalog },
    { resolveSessionAuth },
    { app: apiApp }
  ] =
    await Promise.all([
      import("mongoose"),
      import("express-session"),
      import("connect-mongo"),
      import("../../../back/src/configs/env"),
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
  app.use(session({
    name: process.env.SESSION_COOKIE_NAME || "chioansim.sid",
    secret: getSessionSecret(),
    proxy: true,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient() as unknown as NonNullable<
        Parameters<typeof MongoStore.create>[0]["client"]
      >,
      ttl: 60 * 60 * 24 * 7
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env["NODE_ENV"] ?? "production") === "production",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }));
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
