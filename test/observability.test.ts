import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestContext, seedProfile } from "./helpers";

describe("request logging", () => {
  it("returns an x-request-id header on API responses", async () => {
    const ctx = createTestContext();
    await seedProfile(ctx.repositories, "user-1");
    const app = await ctx.appAs("user-1");

    const res = await request(app).get("/api/applications");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("echoes a caller-supplied x-request-id", async () => {
    const ctx = createTestContext();
    const app = await ctx.appAs("user-1");

    const res = await request(app)
      .get("/api/applications")
      .set("x-request-id", "trace-abc-123");
    expect(res.headers["x-request-id"]).toBe("trace-abc-123");
  });
});
