import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestContext, seedProfile, type TestContext } from "./helpers";

/**
 * Regression tests for the IDOR fixed in Phase 0.1: an authenticated user must
 * never be able to reach another user's application through any :id route.
 */
describe("application authorization", () => {
  let ctx: TestContext;
  let victimAppId: string;

  const ATTACKER = "attacker-user";
  const VICTIM = "victim-user";

  beforeEach(async () => {
    ctx = createTestContext();
    const victimProfileId = await seedProfile(ctx.repositories, VICTIM, { email: "victim@example.com" });
    await seedProfile(ctx.repositories, ATTACKER, { email: "attacker@example.com" });

    const app = await ctx.repositories.applications.create(victimProfileId, {
      company: "VictimCo",
      jobTitle: "Staff Engineer",
      jobDescription: "secret jd",
    });
    victimAppId = app.id;
  });

  it("does not leak another user's application on GET", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    const res = await request(attacker).get(`/api/applications/${victimAppId}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("VictimCo");
  });

  it("does not let another user change status", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    const res = await request(attacker)
      .patch(`/api/applications/${victimAppId}/status`)
      .send({ status: "rejected" });
    expect(res.status).toBe(404);
    expect((await ctx.repositories.applications.findById(victimAppId))?.status).toBe("created");
  });

  it("does not let another user edit content", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    const res = await request(attacker)
      .patch(`/api/applications/${victimAppId}/content`)
      .send({ coverLetter: "hacked" });
    expect(res.status).toBe(404);
    expect((await ctx.repositories.applications.findById(victimAppId))?.generatedCoverLetter).toBeNull();
  });

  it("does not let another user update resume settings", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    const res = await request(attacker)
      .patch(`/api/applications/${victimAppId}/settings`)
      .send({ template: "creative" });
    expect(res.status).toBe(404);
  });

  it("does not let another user delete the application", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    const res = await request(attacker).delete(`/api/applications/${victimAppId}`);
    expect(res.status).toBe(404);
    expect(await ctx.repositories.applications.findById(victimAppId)).not.toBeNull();
  });

  it("does not let another user trigger generation", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    const res = await request(attacker)
      .post(`/api/applications/${victimAppId}/generate`)
      .send({ tone: "Professional" });
    expect(res.status).toBe(404);
  });

  it("does not export another user's resume", async () => {
    const attacker = await ctx.appAs(ATTACKER);
    for (const path of ["resume.pdf", "resume.docx", "resume-preview"]) {
      const res = await request(attacker).get(`/api/applications/${victimAppId}/${path}`);
      expect(res.status).toBe(404);
    }
  });

  it("still lets the owner read their own application", async () => {
    const victim = await ctx.appAs(VICTIM);
    const res = await request(victim).get(`/api/applications/${victimAppId}`);
    expect(res.status).toBe(200);
    expect(res.body.company).toBe("VictimCo");
  });

  it("rejects unauthenticated requests", async () => {
    const anon = await ctx.appAnon();
    const res = await request(anon).get(`/api/applications/${victimAppId}`);
    expect(res.status).toBe(401);
  });
});
