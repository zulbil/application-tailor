import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestContext, type TestContext } from "./helpers";

describe("profile", () => {
  let ctx: TestContext;
  const USER = "user-1";

  beforeEach(() => {
    ctx = createTestContext();
  });

  it("returns an empty profile shell before anything is saved", async () => {
    const app = await ctx.appAs(USER);
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBeNull();
    expect(res.body.experiences).toEqual([]);
  });

  it("round-trips a saved profile with experiences and education", async () => {
    const app = await ctx.appAs(USER);
    const payload = {
      profile: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "555-0101",
        location: "London",
        headline: "Mathematician",
        skills: "Analytical Engine, Notes",
      },
      experiences: [
        {
          company: "Analytical Engine Project",
          title: "Collaborator",
          location: "London",
          startDate: "1842",
          endDate: "1843",
          responsibilities: "Wrote the first algorithm",
        },
      ],
      education: [
        { school: "Private tutoring", degree: "N/A", field: "Mathematics", startDate: "1830", endDate: "1835" },
      ],
    };

    const saveRes = await request(app).post("/api/profile").send(payload);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.profile.firstName).toBe("Ada");
    expect(saveRes.body.experiences).toHaveLength(1);

    const getRes = await request(app).get("/api/profile");
    expect(getRes.body.profile.email).toBe("ada@example.com");
    expect(getRes.body.experiences[0].company).toBe("Analytical Engine Project");
    expect(getRes.body.education[0].field).toBe("Mathematics");
  });

  it("rejects an invalid profile payload", async () => {
    const app = await ctx.appAs(USER);
    const res = await request(app).post("/api/profile").send({ profile: { firstName: "X" } });
    expect(res.status).toBe(400);
  });

  it("keeps profiles isolated per user", async () => {
    const appA = await ctx.appAs("user-a");
    const appB = await ctx.appAs("user-b");

    await request(appA)
      .post("/api/profile")
      .send({
        profile: {
          firstName: "A",
          lastName: "A",
          email: "a@example.com",
          phone: "1",
          location: "L",
          headline: "H",
          skills: "S",
        },
        experiences: [],
        education: [],
      });

    const resB = await request(appB).get("/api/profile");
    expect(resB.body.profile.id).toBeNull();
  });
});
