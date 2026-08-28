import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestContext, seedProfile, type TestContext } from "./helpers";

describe("applications CRUD", () => {
  let ctx: TestContext;
  const USER = "user-1";

  beforeEach(async () => {
    ctx = createTestContext();
    await seedProfile(ctx.storage, USER);
  });

  it("creates an application scoped to the caller's profile", async () => {
    const app = await ctx.appAs(USER);
    const res = await request(app)
      .post("/api/applications")
      .send({ company: "Acme", jobTitle: "Dev", jobDescription: "jd" });

    expect(res.status).toBe(200);
    expect(res.body.company).toBe("Acme");
    expect(res.body.status).toBe("created");
  });

  it("rejects creation with missing required fields", async () => {
    const app = await ctx.appAs(USER);
    const res = await request(app).post("/api/applications").send({ company: "Acme" });
    expect(res.status).toBe(400);
  });

  it("lists only the caller's applications", async () => {
    const otherProfileId = await seedProfile(ctx.storage, "user-2", { email: "two@example.com" });
    await ctx.storage.createJobApplication(otherProfileId, {
      company: "OtherCo",
      jobTitle: "X",
      jobDescription: "",
    });

    const app = await ctx.appAs(USER);
    await request(app).post("/api/applications").send({ company: "Mine", jobTitle: "Y", jobDescription: "" });

    const res = await request(app).get("/api/applications");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company).toBe("Mine");
  });

  it("returns 400 when creating an application without a saved profile", async () => {
    const app = await ctx.appAs("user-without-profile");
    const res = await request(app)
      .post("/api/applications")
      .send({ company: "Acme", jobTitle: "Dev", jobDescription: "jd" });
    expect(res.status).toBe(400);
  });

  it("lets the owner update status", async () => {
    const profileId = (await ctx.storage.getProfileByUserId(USER))!.profile.id;
    const created = await ctx.storage.createJobApplication(profileId, {
      company: "Acme",
      jobTitle: "Dev",
      jobDescription: "jd",
    });

    const app = await ctx.appAs(USER);
    const res = await request(app)
      .patch(`/api/applications/${created.id}/status`)
      .send({ status: "applied" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("applied");
  });
});
