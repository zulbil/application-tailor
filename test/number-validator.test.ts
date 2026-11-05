import { describe, it, expect } from "vitest";
import { findUnsupportedNumbers, extractNumericTokens } from "../server/services/number-validator";

const PROFILE = [
  "Reduced page load time by 40% for 10K+ monthly users",
  "Managed a $1.2M budget and led 5 engineers",
  "Cut costs 3x between 2019 and 2022",
];
const JOB = "We process 2 million requests per day. 5+ years experience.";

const check = (text: string, sources = [...PROFILE, JOB]) => findUnsupportedNumbers([text], sources);

describe("findUnsupportedNumbers", () => {
  it("passes numbers present in the profile or job description", () => {
    expect(check("Cut load time by 40% for 10K+ users")).toEqual([]);
    expect(check("Owned a $1.2M budget, leading 5 engineers")).toEqual([]);
    expect(check("Scaled to 2M requests per day over 5+ years")).toEqual([]);
  });

  it("flags invented numbers", () => {
    expect(check("Improved conversion by 63% and saved $450K")).toEqual(["63%", "$450K"]);
    expect(check("Led a team of 12")).toEqual(["12"]);
  });

  it("ignores bracketed placeholders", () => {
    expect(check("Grew revenue by [X%] across [N users] and [$X]")).toEqual([]);
  });

  it("handles %, currency, K/M, and multiplier formats", () => {
    expect(check("Boosted speed 3x")).toEqual([]);
    expect(check("Boosted speed 7x")).toEqual(["7x"]);
    expect(check("Reached 25% growth")).toEqual(["25%"]);
    expect(check("Served 10K+ users")).toEqual([]);
    expect(check("Served 20K+ users")).toEqual(["20K+"]);
    expect(check("Budget of $1.2M")).toEqual([]);
    expect(check("Budget of $3.4M")).toEqual(["$3.4M"]);
  });

  it("treats equivalent magnitudes as the same value", () => {
    expect(check("Handled 10,000 users")).toEqual([]);
    expect(check("Managed 1.2 million in spend")).toEqual([]);
    expect(check("Handled 2,000,000 requests")).toEqual([]);
  });

  it("requires % and x to be backed by a % or x in the sources", () => {
    expect(check("Improved by 5%")).toEqual(["5%"]);
    expect(check("Improved 5x")).toEqual(["5x"]);
  });

  it("applies a range's unit to both ends", () => {
    expect(check("Gained 25-35% efficiency")).toEqual(["25", "35%"]);
    expect(extractNumericTokens("25-35%").map((t) => t.kind)).toEqual(["percent", "percent"]);
  });

  it("does not treat digits inside identifiers as metrics", () => {
    expect(check("Built on AWS S3, EC2 and ES6")).toEqual([]);
  });

  it("de-duplicates repeated unsupported values", () => {
    expect(findUnsupportedNumbers(["Up 99%", "Again 99%"], [])).toEqual(["99%"]);
  });
});
