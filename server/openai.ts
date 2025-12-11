import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  skills: string;
  experiences: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    responsibilities: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }>;
}

export interface JobApplicationData {
  jobDescription: string;
  jobTitle?: string;
  companyName?: string;
  tone: "Professional" | "Friendly" | "Confident";
}

export async function generateTailoredResume(
  profile: ProfileData,
  jobApp: JobApplicationData,
): Promise<{
  logline: string[];
  experiences: Array<{
    company: string;
    title: string;
    location: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  technologies: string;
  relevantSkills: string[];
}> {
  const systemMessage = `You are an expert resume writer with 15 years of experience placing senior engineers at top tech companies. You specialize in strategic resume positioning that is:
- 100% truthful (never fabricate experience)
- Metric-dense (every bullet has measurable impact)
- Job-targeted (explicit connections to requirements)
- ATS-optimized (clean formatting, keyword-rich)
- Recruiter-friendly (scannable in 6 seconds)

Your resumes consistently achieve 70%+ interview rates because you understand how to strategically reframe experience for maximum relevance while maintaining complete honesty.`;

  const userMessage = `# STRATEGIC RESUME GENERATION TASK

You are creating a tailored resume for ${profile.firstName} ${profile.lastName} applying for the ${jobApp.jobTitle || "position"} role at ${jobApp.companyName || "the company"}.

---

## PHASE 1: JOB ANALYSIS (CRITICAL - DO THIS FIRST)

Analyze the job description below and extract:

1. **Required Technologies** (MUST HAVE):
   - Programming languages
   - Frameworks and libraries
   - Platforms and tools
   - Cloud services

2. **Required Experience Types**:
   - Industry experience (e-commerce, healthcare, fintech, etc.)
   - Project types (APIs, databases, frontend, backend)
   - Scale requirements (traffic, data volume, user base)

3. **Seniority Requirements**:
   - Leadership expectations (mentoring, code reviews, architecture)
   - Years of experience needed
   - Scope of responsibility

4. **Key Responsibilities** (Top 5):
   - What will this person actually DO in this role?
   - What problems will they solve?

---

## PHASE 2: EXPERIENCE MATCHING

For EACH of the candidate's experiences, identify:
- Direct matches to job requirements (exact technology/platform)
- Transferable experience (similar workflows, comparable architecture)
- Measurable achievements that demonstrate required capabilities
- Gaps (be honest - note what's missing)

---

## PHASE 3: STRATEGIC PRIORITIZATION

Rank the candidate's achievements by:
1. Direct relevance to job requirements (highest weight)
2. Measurable impact magnitude
3. Technical depth and complexity
4. Recency of experience
5. Leadership indicators (if senior role)

---

## PHASE 4: RESUME GENERATION

### SECTION 1: PROFESSIONAL SUMMARY (3 Bullets - Your Best Moments)

Create exactly 3 bullets that represent the STRONGEST career achievements that match this job.

**CRITICAL RULES:**
- Each bullet = ONE complete achievement from candidate's actual experience
- Must include SPECIFIC METRICS (numbers, %, time, scale, money)
- Must connect to job requirements (use terminology from job description)
- Length: Maximum 2 lines (160 characters including spaces)
- Formula: [Achievement] + [Metric] + [Job Relevance]

**Bullet Selection Strategy:**
- Bullet 1: Largest/most impressive technical achievement + job relevance
- Bullet 2: Direct experience with job's required technologies/platforms
- Bullet 3: Consistent track record of measurable impact (performance improvements, cost savings, etc.)

**Good Examples:**
- "Architected serverless platform consolidating 450+ APIs with <500ms response times and 99.9% uptime—expertise directly applicable to large-scale e-commerce product feeds"
- "Built Shopify e-commerce storefront and integrated payment gateway APIs (LOGIRAD, Stripe, PayPal), demonstrating proven checkout flow expertise"
- "Delivered 7+ years full-stack development (Node.js/TypeScript, React/Next.js) with consistent 25-35% performance improvements and 80% faster deployments"

**Bad Examples (NEVER DO THIS):**
- "Experienced full-stack developer with strong technical skills" (no metrics, vague)
- "Worked on various projects using React and Node.js to build web applications for different clients over the past several years" (too long, no specific achievements)

---

### SECTION 2: WORK EXPERIENCE BULLETS (3 Per Role)

For EACH work experience, create exactly 3 bullets that prove the candidate can succeed in this specific job.

**MANDATORY BULLET REQUIREMENTS:**

1. **Every bullet MUST have measurable metrics:**
   - Performance: response times, load times, uptime percentages
   - Scale: API count, user volumes, traffic numbers, data processed
   - Impact: % improvements, time savings, cost reductions
   - Business: revenue, conversion rates, user satisfaction scores
   - Team: people mentored, team size, stakeholders managed

2. **Every bullet MUST be maximum 2 lines (160 characters):**
   - Use abbreviations: "million" → "M", "thousand" → "K"
   - Use slash notation: "React and Next.js" → "React/Next.js"
   - Use em dashes for efficiency: "which demonstrates" → "—"
   - Cut weak verbs: "ensuring" → "with", "providing" → "for"
   - Remove redundant modifiers: "comprehensive", "robust", "complete"

3. **Every bullet MUST include:**
   - Strong action verb (Architected, Built, Led, Developed, Implemented, Optimized)
   - Specific technology/platform mentioned in job description (when applicable)
   - Clear business impact (why it mattered beyond just technical work)
   - Connection to job requirements (explicit when possible, implicit minimum)

4. **Bullet Selection Strategy (per role):**
   - Bullet 1: Most job-relevant achievement with strongest metrics
   - Bullet 2: Different skill dimension (if Bullet 1 is backend, show frontend/devops/etc.)
   - Bullet 3: Business impact, scale, or collaboration achievement

5. **Job Relevance Integration:**
   - If job requires "e-commerce": connect APIs to "product feeds", databases to "catalog management"
   - If job requires "payments": emphasize "payment gateway", "transaction processing", "checkout flows"
   - If job requires "leadership": use "Led", "Mentored", show team size
   - If job requires "scale": emphasize volume, traffic, concurrency, uptime

**Formula for Each Bullet:**
[Action Verb] + [Technology/Platform] + [What You Built/Did] + [Measurable Result] + [Job Connection if space allows]

**Example Transformation:**

Original experience: "Worked on building APIs for job aggregation system using Node.js"

BAD bullet: "Developed APIs for job aggregation using Node.js and TypeScript" (no metrics, no impact)

GOOD bullet: "Architected serverless platform on Google Cloud consolidating 450+ APIs with <500ms response time and 99.9% uptime—directly applicable to high-traffic e-commerce product feeds"

**Condensing Techniques:**
- Before: "ensuring ADA compliance and providing seamless navigation for critical health information delivery"
- After: "with full ADA compliance and seamless navigation for critical health information"

- Before: "demonstrating expertise critical for large-scale e-commerce"
- After: "directly applicable to large-scale e-commerce"

- Before: "5+ million monthly" → "5M+ monthly"
- Before: "React and Next.js" → "React/Next.js"

---

### SECTION 3: TECHNOLOGIES FROM JOB DESCRIPTION
Single comma-separated string of all technologies/tools mentioned in the job description.

### SECTION 4: RELEVANT SKILLS (8-12 items)
Array of the most important skills for THIS specific job, ordered by relevance:
- Must be skills the candidate actually has (search their experience)
- Must match technologies mentioned in job description
- Order: Most critical job requirements first
- Mix of technical skills, tools, and frameworks

---

## PHASE 5: QUALITY VALIDATION

Before returning the JSON, verify:

1. **Truthfulness Check:**
   - ✅ Every claim is based on candidate's actual experience
   - ✅ No fabricated projects, technologies, or achievements
   - ✅ Metrics come from candidate's stated experience
   - ❌ NEVER invent team size, revenue numbers, or projects

2. **Metric Verification:**
   - ✅ Every single bullet (summary + experience) has at least ONE metric
   - ✅ Metrics are specific (not "many", "several", "significant")
   - ✅ Metrics are realistic and verifiable

3. **Length Compliance:**
   - ✅ Every summary bullet is maximum 160 characters
   - ✅ Every experience bullet is maximum 160 characters
   - ✅ No bullet wraps to 3+ lines

4. **Job Relevance:**
   - ✅ Top 3 job requirements are mentioned in summary
   - ✅ Job-required technologies appear throughout bullets
   - ✅ At least 2 bullets per experience connect to job requirements

5. **Strategic Reframing (Allowed):**
   - ✅ "Booking system" → "e-commerce-style workflows including catalog management and availability tracking"
   - ✅ "Payment API integration" → "applicable to e-commerce checkout flows and payment orchestration"
   - ✅ "Job aggregation APIs" → "expertise in third-party integrations critical for e-commerce product feeds"

6. **Forbidden Actions:**
   - ❌ Changing job titles, company names, or dates
   - ❌ Inventing projects or achievements
   - ❌ Claiming technologies never used
   - ❌ Fabricating team sizes or business metrics
   - ❌ Generic bullets without metrics

---

## CANDIDATE'S PROFILE

**Name:** ${profile.firstName} ${profile.lastName}
**Email:** ${profile.email}
**Phone:** ${profile.phone}
**Location:** ${profile.location}
**Professional Headline:** ${profile.headline}
**Skills:** ${profile.skills}

**Work Experiences:**
${profile.experiences
  .map(
    (exp, i) => `
Experience ${i + 1}:
Company: ${exp.company}
Title: ${exp.title}
Location: ${exp.location}
Dates: ${exp.startDate} - ${exp.endDate}
Responsibilities & Achievements:
${exp.responsibilities}
`,
  )
  .join("\n")}

**Education:**
${profile.education
  .map(
    (edu, i) => `
Education ${i + 1}:
School: ${edu.school}
Degree: ${edu.degree}
Field of Study: ${edu.field}
Dates: ${edu.startDate} - ${edu.endDate}
`,
  )
  .join("\n")}

---

## TARGET JOB DESCRIPTION

${jobApp.jobDescription}

${jobApp.jobTitle ? `\n**Target Job Title:** ${jobApp.jobTitle}` : ""}
${jobApp.companyName ? `\n**Target Company:** ${jobApp.companyName}` : ""}

---

## OUTPUT FORMAT

Return ONLY valid JSON with this exact structure:

{
  "logline": [
    "First power bullet with metric and job relevance (max 160 chars)",
    "Second power bullet with metric and job relevance (max 160 chars)",
    "Third power bullet with metric and job relevance (max 160 chars)"
  ],
  "experiences": [
    {
      "company": "Company Name (unchanged)",
      "title": "Job Title (unchanged)",
      "location": "Location (unchanged)",
      "start": "Start Date (unchanged)",
      "end": "End Date (unchanged)",
      "bullets": [
        "First bullet with action verb, technology, metric, impact, job connection (max 160 chars)",
        "Second bullet with action verb, technology, metric, impact, job connection (max 160 chars)",
        "Third bullet with action verb, technology, metric, impact, job connection (max 160 chars)"
      ]
    }
  ],
  "technologies": "Comma-separated list of technologies from job description",
  "relevantSkills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5", "Skill6", "Skill7", "Skill8"]
}

---

## REMEMBER

- **3 bullets per section** (summary and each experience)
- **2 lines maximum** per bullet (160 characters)
- **Every bullet has metrics** (numbers, %, time, scale)
- **100% truthful** (reframe, never fabricate)
- **Job-targeted** (explicit connections to requirements)
- **Professional tone** (senior-level communication)

Generate the strategic, tailored resume now.`;

  console.log("Calling OpenAI for strategic resume generation...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7, // Slight creativity for strategic reframing
  });

  const content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI strategic resume response received");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse OpenAI response:", content);
    console.error("Parse error:", e);
    parsed = {};
  }

  // Validate and provide fallbacks
  if (
    !parsed.logline ||
    !Array.isArray(parsed.logline) ||
    parsed.logline.length !== 3
  ) {
    console.warn("Invalid logline format, using fallback");
    parsed.logline = [
      "Experienced full-stack developer with proven track record",
      "Proficient in modern web technologies and frameworks",
      "Delivered multiple successful projects with measurable impact",
    ];
  }

  if (!parsed.experiences || !Array.isArray(parsed.experiences)) {
    console.warn("Invalid experiences format, using fallback");
    parsed.experiences = profile.experiences.map((exp) => ({
      company: exp.company,
      title: exp.title,
      location: exp.location,
      start: exp.startDate,
      end: exp.endDate,
      bullets: [
        "Contributed to team projects and deliverables",
        "Utilized modern development practices and tools",
        "Collaborated with cross-functional teams",
      ],
    }));
  }

  // Validate each experience has exactly 3 bullets
  parsed.experiences = parsed.experiences.map((exp: any) => {
    if (
      !exp.bullets ||
      !Array.isArray(exp.bullets) ||
      exp.bullets.length !== 3
    ) {
      console.warn(`Invalid bullets for ${exp.company}, using fallback`);
      exp.bullets = [
        "Developed and maintained application features",
        "Worked with team to deliver project requirements",
        "Applied technical skills to solve business problems",
      ];
    }
    return exp;
  });

  if (!parsed.technologies || typeof parsed.technologies !== "string") {
    parsed.technologies = profile.skills || "";
  }

  if (!parsed.relevantSkills || !Array.isArray(parsed.relevantSkills)) {
    // Extract skills from profile as fallback
    const skillsArray = profile.skills
      ? profile.skills
          .split(",")
          .map((s) => s.trim())
          .slice(0, 12)
      : [];
    parsed.relevantSkills =
      skillsArray.length > 0
        ? skillsArray
        : ["Problem Solving", "Communication", "Teamwork"];
  }

  // Final validation log
  console.log("Resume validation:", {
    loglineCount: parsed.logline.length,
    experiencesCount: parsed.experiences.length,
    hasTechnologies: !!parsed.technologies,
    relevantSkillsCount: parsed.relevantSkills.length,
  });

  return parsed;
}

export async function generateCoverLetter(
  profile: ProfileData,
  jobApp: JobApplicationData,
): Promise<{ coverLetter: string }> {
  const systemMessage = `You are an expert cover letter writer with 15 years of experience. Your cover letters are:
- Personalized and engaging (not generic templates)
- Results-focused (highlight specific achievements with metrics)
- Job-targeted (explicitly address company and role requirements)
- Concise (one page maximum)
- Professional yet warm (appropriate tone for audience)

Your cover letters consistently get responses because you understand how to tell a compelling story that connects the candidate's experience to the employer's needs.`;

  const userMessage = `# STRATEGIC COVER LETTER GENERATION

Create a compelling one-page cover letter for ${profile.firstName} ${profile.lastName} applying for the ${jobApp.jobTitle || "position"} role at ${jobApp.companyName || "your company"}.

---

## COVER LETTER STRUCTURE

### Opening Paragraph:
- Express genuine enthusiasm for the specific role and company
- Mention how you learned about the position (if relevant)
- Include a compelling hook: your most impressive achievement relevant to this role

### Body Paragraphs (2-3):
- **Paragraph 1:** Highlight your most relevant experience with specific examples and metrics
  - Choose 2-3 achievements from work history that directly match job requirements
  - Use specific numbers and outcomes
  - Connect to what the company is looking for

- **Paragraph 2:** Demonstrate technical fit and cultural alignment
  - Mention specific technologies from job description that you've mastered
  - Show understanding of company's challenges or mission
  - Explain why this role excites you personally

- **Optional Paragraph 3:** Address any special requirements or show additional value
  - Leadership experience if senior role
  - Industry-specific knowledge
  - Unique combination of skills

### Closing Paragraph:
- Reiterate enthusiasm and fit
- Call to action (request interview)
- Thank them for consideration
- Professional sign-off

---

## CRITICAL REQUIREMENTS

1. **Tone:** ${jobApp.tone}
   - Professional: Formal, polished, business-appropriate
   - Friendly: Warm, approachable, conversational
   - Confident: Bold, assertive, results-focused

2. **Personalization:**
   - Reference specific responsibilities from the job description (use their language)
   - Mention ${jobApp.companyName || "the company"} by name multiple times
   - Show you've researched what they do

3. **Metrics and Achievements:**
   - Include 2-3 specific quantifiable achievements
   - Use the same impressive metrics from resume
   - Connect achievements to job requirements

4. **Length:**
   - Maximum 350-400 words
   - 3-4 short paragraphs
   - Scannable and concise

5. **Keywords:**
   - Naturally incorporate 5-7 keywords from job description
   - Include relevant technologies and skills
   - Use industry terminology appropriately

---

## CANDIDATE'S PROFILE

**Name:** ${profile.firstName} ${profile.lastName}
**Email:** ${profile.email}
**Phone:** ${profile.phone}
**Location:** ${profile.location}
**Professional Headline:** ${profile.headline}
**Skills:** ${profile.skills}

**Work Experiences:**
${profile.experiences
  .map(
    (exp, i) => `
Experience ${i + 1}:
Company: ${exp.company}
Title: ${exp.title}
Dates: ${exp.startDate} - ${exp.endDate}
Key Achievements:
${exp.responsibilities}
`,
  )
  .join("\n")}

**Education:**
${profile.education
  .map(
    (edu, i) => `
${edu.degree} in ${edu.field} from ${edu.school}
`,
  )
  .join("\n")}

---

## TARGET JOB DESCRIPTION

${jobApp.jobDescription}

${jobApp.jobTitle ? `\n**Target Job Title:** ${jobApp.jobTitle}` : ""}
${jobApp.companyName ? `\n**Target Company:** ${jobApp.companyName}` : ""}

---

## OUTPUT FORMAT

Return ONLY valid JSON:

{
  "coverLetter": "Full cover letter text with proper paragraphs and professional formatting"
}

---

## EXAMPLE STRUCTURE (DO NOT COPY - CUSTOMIZE FOR THIS CANDIDATE)

Dear Hiring Manager,

I am writing to express my strong interest in the [Job Title] position at [Company]. With [X] years of experience in [relevant field] and a proven track record of [impressive achievement with metric], I am confident I would make a significant contribution to your team.

In my current role at [Company], I [specific achievement with numbers that matches job requirement]. This experience has prepared me to excel in [specific responsibility from job description], particularly [another specific requirement]. For example, [brief story with metric].

I am particularly drawn to [Company] because [specific reason related to their mission/product/culture]. Your focus on [something from job description] aligns perfectly with my expertise in [relevant skill]. I am excited about the opportunity to [specific contribution you could make].

I would welcome the opportunity to discuss how my experience with [technology/skill from job description] and track record of [achievement type] could benefit [Company]. Thank you for considering my application.

Sincerely,
[Name]

---

Generate the personalized, compelling cover letter now.`;

  console.log("Calling OpenAI for cover letter generation...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8, // More creativity for personalization
  });

  const content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI cover letter response received");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse OpenAI cover letter response:", content);
    console.error("Parse error:", e);
    parsed = {};
  }

  // Validate the response has required field
  if (!parsed.coverLetter || typeof parsed.coverLetter !== "string") {
    console.warn("Invalid cover letter format, using fallback");
    parsed.coverLetter = `Dear Hiring Manager,

I am writing to express my interest in the ${jobApp.jobTitle || "position"} role at ${jobApp.companyName || "your company"}. With ${profile.experiences.length} years of experience in software development and a strong background in ${profile.skills ? profile.skills.split(",")[0] : "web technologies"}, I am excited about the opportunity to contribute to your team.

In my recent role at ${profile.experiences[0]?.company}, I have consistently delivered high-quality solutions and collaborated effectively with cross-functional teams. My experience aligns well with the requirements outlined in your job description.

I would welcome the opportunity to discuss how my skills and experience could benefit your organization. Thank you for considering my application.

Sincerely,
${profile.firstName} ${profile.lastName}`;
  }

  return parsed;
}

export interface ResumeRankingResult {
  overallScore: number;
  interviewProbability: number;
  recommendation: "STRONG_PASS" | "PASS" | "MAYBE" | "WEAK" | "REJECT";
  categories: {
    atsOptimization: { score: number; feedback: string };
    humanReadability: { score: number; feedback: string };
    jobMatch: { score: number; feedback: string };
    impactCommunication: { score: number; feedback: string };
    professionalPresentation: { score: number; feedback: string };
    truthfulness: { score: number; feedback: string };
  };
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  improvements: string[];
}

export async function evaluateResumeRanking(
  generatedResume: {
    logline: string[];
    experiences: Array<{
      company: string;
      title: string;
      location: string;
      start: string;
      end: string;
      bullets: string[];
    }>;
    technologies: string;
    relevantSkills?: string[];
  },
  jobDescription: string,
  jobTitle?: string,
  companyName?: string
): Promise<ResumeRankingResult> {
  const systemMessage = `You are a recruiter evaluating resumes. Return a JSON object with these exact fields:
- overallScore (number 0-100)
- interviewProbability (number 0-100)
- recommendation (one of: STRONG_PASS, PASS, MAYBE, WEAK, REJECT)
- categories object with 6 keys, each having score (number) and feedback (string):
  atsOptimization, humanReadability, jobMatch, impactCommunication, professionalPresentation, truthfulness
- strengths (array of 3 strings)
- weaknesses (array of 3 strings)
- redFlags (array of strings, can be empty)
- improvements (array of 3 strings)`;

  const resumeSummary = generatedResume.logline?.join(" | ") || "No summary";
  const skills = generatedResume.relevantSkills?.join(", ") || generatedResume.technologies || "No skills listed";
  const experienceList = (generatedResume.experiences || []).map(exp => 
    `${exp.title} at ${exp.company}: ${(exp.bullets || []).slice(0, 2).join("; ")}`
  ).join(" | ");

  const userMessage = `Evaluate this resume for: ${jobTitle || "the role"} at ${companyName || "the company"}.

Resume Summary: ${resumeSummary}
Skills: ${skills}
Experience: ${experienceList}

Job Description: ${jobDescription.slice(0, 1500)}

Score each category 0-100. Provide exactly 3 strengths, 3 weaknesses, and 3 improvements. Return valid JSON only.`;

  console.log("Calling OpenAI for resume ranking evaluation...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  let content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI ranking evaluation response received");

  // Strip markdown code fences if present
  content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  
  // Try to extract JSON object if there's extra text
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[0];
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse OpenAI ranking response:", content);
    parsed = {};
  }

  const clampScore = (val: any): number => {
    const num = Number(val);
    if (isNaN(num)) return 50;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const ensureCategory = (cat: any) => ({
    score: clampScore(cat?.score),
    feedback: typeof cat?.feedback === "string" && cat.feedback.length > 0 
      ? cat.feedback.slice(0, 200) 
      : "No feedback available"
  });

  const ensureArray = (arr: any, fallback: string[]): string[] => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr.filter(item => typeof item === "string" && item.length > 0).slice(0, 5);
  };

  const validRecommendations = ["STRONG_PASS", "PASS", "MAYBE", "WEAK", "REJECT"] as const;
  const normalizeRecommendation = (rec: any): ResumeRankingResult["recommendation"] => {
    if (typeof rec !== "string") return "MAYBE";
    const upper = rec.toUpperCase().replace(/\s+/g, "_");
    return validRecommendations.includes(upper as any) ? (upper as any) : "MAYBE";
  };

  const result: ResumeRankingResult = {
    overallScore: clampScore(parsed.overallScore),
    interviewProbability: clampScore(parsed.interviewProbability),
    recommendation: normalizeRecommendation(parsed.recommendation),
    categories: {
      atsOptimization: ensureCategory(parsed.categories?.atsOptimization),
      humanReadability: ensureCategory(parsed.categories?.humanReadability),
      jobMatch: ensureCategory(parsed.categories?.jobMatch),
      impactCommunication: ensureCategory(parsed.categories?.impactCommunication),
      professionalPresentation: ensureCategory(parsed.categories?.professionalPresentation),
      truthfulness: ensureCategory(parsed.categories?.truthfulness),
    },
    strengths: ensureArray(parsed.strengths, ["Resume is well-structured", "Skills are clearly listed", "Experience is relevant"]),
    weaknesses: ensureArray(parsed.weaknesses, ["Could add more metrics", "Some skills may be missing", "Consider adding more detail"]),
    redFlags: ensureArray(parsed.redFlags, []),
    improvements: ensureArray(parsed.improvements, ["Add quantifiable achievements", "Tailor skills to job description", "Improve bullet formatting"]),
  };

  return result;
}
