import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestContext, seedProfile, type TestContext } from "./helpers";
import type { AiPort, GeneratedResume } from "../server/services";

const RESUME: GeneratedResume = {
  logline: ["a", "b", "c"],
  experiences: [],
  technologies: "TypeScript",
  relevantSkills: ["TypeScript"],
};

describe("generation", () => {
  let ctx: TestContext;
  let generateResume: ReturnType<typeof vi.fn<AiPort["generateResume"]>>;
  let generateCoverLetter: ReturnType<typeof vi.fn<AiPort["generateCoverLetter"]>>;
  const USER = "user-1";

  beforeEach(async () => {
    generateResume = vi.fn<AiPort["generateResume"]>().mockResolvedValue(RESUME);
    generateCoverLetter = vi
      .fn<AiPort["generateCoverLetter"]>()
      .mockResolvedValue({ coverLetter: "Dear team," });
    ctx = createTestContext({ ai: { generateResume, generateCoverLetter } });
    await seedProfile(ctx.repositories, USER);
  });

  it("generates and persists resume + cover letter for an owned application", async () => {
    const profileId = (await ctx.repositories.profiles.findAggregateByUserId(USER))!.profile.id;
    const created = await ctx.repositories.applications.create(profileId, {
      company: "Acme",
      jobTitle: "Engineer",
      jobDescription: "Build things",
    });

    const app = await ctx.appAs(USER);
    const res = await request(app)
      .post(`/api/applications/${created.id}/generate`)
      .send({ tone: "Professional" });

    expect(res.status).toBe(200);
    expect(res.body.coverLetter).toBe("Dear team,");
    expect(generateResume).toHaveBeenCalledOnce();

    const stored = await ctx.repositories.applications.findById(created.id);
    expect(stored?.generatedResume).toEqual(RESUME);
    expect(stored?.generatedCoverLetter).toBe("Dear team,");
  });

  it("returns 400 for the profile-level generator when no profile is saved", async () => {
    const app = await ctx.appAs("stranger");
    const res = await request(app)
      .post("/api/generate-resume")
      .send({ jobDescription: "x", tone: "Professional" });
    expect(res.status).toBe(400);
    expect(generateResume).not.toHaveBeenCalled();
  });

  it("validates the request body before touching the AI port", async () => {
    const app = await ctx.appAs(USER);
    const res = await request(app).post("/api/generate-resume").send({ tone: "Nope" });
    expect(res.status).toBe(400);
    expect(generateResume).not.toHaveBeenCalled();
  });
});
