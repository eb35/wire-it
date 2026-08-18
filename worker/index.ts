import { verifyToken } from "@clerk/backend";
import { Hono } from "hono";
import { parseProject } from "../src/domain/project";
import type { DrawingMeta, Project } from "../src/domain/types";

type Bindings = {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
};

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") {
    await next();
    return;
  }
  const userId = await userIdFromRequest(c.req.raw, c.env, c.req.header("Origin"));
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", userId);
  await next();
});

app.get("/api/drawings", async (c) => {
  const userId = c.get("userId");
  const result = await c.env.DB.prepare(
    `SELECT id, name, updated_at FROM drawings WHERE user_id = ? ORDER BY updated_at DESC`,
  )
    .bind(userId)
    .all<{ id: string; name: string; updated_at: string }>();

  const drawings: DrawingMeta[] = (result.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
  }));
  return c.json({ drawings });
});

app.get("/api/drawings/:id", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT project_json FROM drawings WHERE id = ? AND user_id = ?`,
  )
    .bind(c.req.param("id"), c.get("userId"))
    .first<{ project_json: string }>();
  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }
  try {
    return c.json({ project: parseProject(JSON.parse(row.project_json)) });
  } catch {
    return c.json({ error: "Stored drawing is invalid" }, 500);
  }
});

app.put("/api/drawings/:id", async (c) => {
  let project: Project;
  try {
    const body = await c.req.json();
    project = parseProject(body);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid drawing";
    return c.json({ error: message }, 400);
  }

  const id = c.req.param("id");
  if (project.id !== id) {
    return c.json({ error: "Drawing id does not match URL" }, 400);
  }

  const userId = c.get("userId");
  const existing = await c.env.DB.prepare(`SELECT user_id FROM drawings WHERE id = ?`)
    .bind(id)
    .first<{ user_id: string }>();
  if (existing && existing.user_id !== userId) {
    return c.json({ error: "Drawing already exists" }, 409);
  }

  const updatedAt = new Date().toISOString();
  const json = JSON.stringify(project);
  if (json.length > 900_000) {
    return c.json({ error: "Drawing is too large to save" }, 413);
  }

  await c.env.DB.prepare(
    `INSERT INTO drawings (id, user_id, name, updated_at, project_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       updated_at = excluded.updated_at,
       project_json = excluded.project_json
     WHERE drawings.user_id = excluded.user_id`,
  )
    .bind(id, userId, project.name, updatedAt, json)
    .run();

  const meta: DrawingMeta = { id, name: project.name, updatedAt };
  return c.json({ drawing: meta });
});

app.delete("/api/drawings/:id", async (c) => {
  const result = await c.env.DB.prepare(`DELETE FROM drawings WHERE id = ? AND user_id = ?`)
    .bind(c.req.param("id"), c.get("userId"))
    .run();
  if (!result.meta.changes) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ ok: true });
});

export default app;

async function userIdFromRequest(
  request: Request,
  env: Bindings,
  originHeader: string | undefined,
): Promise<string | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  if (!env.CLERK_SECRET_KEY) {
    return null;
  }
  const authorizedParties = [originHeader, new URL(request.url).origin].filter(
    (value): value is string => Boolean(value),
  );
  try {
    const payload = await verifyToken(header.slice("Bearer ".length), {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
