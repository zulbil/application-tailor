import Anthropic from "@anthropic-ai/sdk";

// This uses Replit's AI Integrations service, which provides Anthropic-compatible API access without requiring your own Anthropic API key.
const anthropic = new Anthropic({
  baseURL: `${process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.replace(/\/openai$/, "")}/anthropic`,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Extracts the first complete top-level JSON object from text, ignoring
// surrounding prose or markdown code fences. Falls back to the raw text.
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) return text;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

// Thin compatibility wrapper so existing call sites keep the OpenAI chat.completions shape.
const openai = {
  chat: {
    completions: {
      create: async (params: {
        model: string;
        messages: Array<{ role: "system" | "user"; content: string }>;
        response_format?: { type: string };
        temperature?: number;
      }) => {
        const system = params.messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n\n");
        const messages = params.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: "user" as const, content: m.content }));
        const response = await anthropic.messages.create({
          model: params.model,
          system: system || undefined,
          messages,
          max_tokens: 8192,
          temperature: params.temperature,
        });
        if (response.stop_reason === "max_tokens") {
          throw new Error(
            `AI response was truncated (hit the ${8192}-token output limit). Try again with less input data.`,
          );
        }
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");
        // Claude may wrap JSON in prose or code fences; extract the JSON object when requested.
        let content = text;
        if (params.response_format?.type === "json_object") {
          content = extractJsonObject(text);
        }
        return { choices: [{ message: { content } }] };
      },
    },
  },
};

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

export interface GapAnalysisContext {
  jobMatch: number;
  criticalGaps: string[];
  strongMatches: string[];
  isLowMatch: boolean;
}

export async function generateTailoredResume(
  profile: ProfileData,
  jobApp: JobApplicationData,
  gapContext?: GapAnalysisContext,
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
  const isLowMatch = gapContext?.isLowMatch ?? false;
  const strongMatches = gapContext?.strongMatches ?? [];
  const criticalGaps = gapContext?.criticalGaps ?? [];
  
  const systemMessage = `You are an expert resume writer with 15 years of experience placing senior engineers at top tech companies. You specialize in strategic resume positioning that is:
- 100% truthful (never fabricate experience)
- Metric-dense (every bullet has measurable impact)
- Job-targeted (explicit connections to requirements)
- ATS-optimized (clean formatting, keyword-rich)
- Recruiter-friendly (scannable in 6 seconds)

Your resumes consistently achieve 70%+ interview rates because you understand how to strategically reframe experience for maximum relevance while maintaining complete honesty.${isLowMatch ? `

IMPORTANT - LOW MATCH DETECTED (${gapContext?.jobMatch ?? 0}% match):
This candidate has skill gaps for this role. Your mission is to create a STRENGTHS-FOCUSED resume that:
1. MAXIMIZES the candidate's transferable skills and strongest experiences
2. HIGHLIGHTS adjacent/related experience that demonstrates learning ability
3. EMPHASIZES soft skills (leadership, communication, problem-solving, adaptability)
4. REFRAMES existing experience to show potential for the new role
5. FOCUSES on achievements that prove quick learning and versatility

The goal is to give this candidate the BEST possible chance despite the gaps. Focus on what they CAN do, not what they can't.` : ""}`;

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

5. Professional Achievement Statements:
   
   State achievements with confidence. Do NOT explicitly connect 
   them to the job with phrases like 'applicable to' or 'relevant for.'
   
   The recruiter is smart enough to make connections themselves.
   
   Format: [Action] + [Technology] + [Scale/Metric] + [Result]
   
   Examples:
   ✅ 'Architected microservices API handling 450+ integrations with 
       sub-500ms response times'
   ✅ 'Integrated payment processing for $200K+ annual transaction volume 
       with 99.9% uptime'
   ✅ 'Optimized database queries reducing load times from 3.2s to 800ms 
       for 5M+ monthly users'
   
   Let the numbers and technologies speak for themselves.
   
   FORBIDDEN PHRASES:
   ❌ 'applicable to...'
   ❌ 'directly relevant to...'
   ❌ 'can be used for...'
   ❌ 'transferable to...'
   ❌ 'shows expertise in...'
   ❌ 'demonstrates ability to...'
   
   Just state what you built and the impressive results.

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
Array of skills for THIS specific job, ordered by relevance:
- ONLY include skills that appear in the candidate's profile "Skills" field or work experience
- NEVER add skills from the job description that the candidate doesn't already have
- Cross-reference: Find skills from the candidate's profile that MATCH what the job requires
- If the job requires a skill the candidate doesn't have, DO NOT add it
- Order: Most critical matching skills first
- This is an intersection: (Candidate's skills) ∩ (Job requirements)

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
   - ❌ Adding skills from job description that candidate doesn't have
   - ❌ Listing skills not found in candidate's profile or experience

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
${isLowMatch ? `

---

## STRENGTHS-FOCUSED STRATEGY (LOW MATCH MODE)

**Match Score:** ${gapContext?.jobMatch ?? 0}%

**Candidate's Strong Matches (EMPHASIZE THESE):**
${strongMatches.length > 0 ? strongMatches.map(s => "- " + s).join("\n") : "- Analyze experience for transferable skills"}

**Critical Gaps (COMPENSATE with related experience):**
${criticalGaps.length > 0 ? criticalGaps.map(g => "- " + g).join("\n") : "- Focus on demonstrating learning ability"}

**SPECIAL INSTRUCTIONS FOR LOW MATCH:**

1. **Summary Bullets Strategy:**
   - Lead with your STRONGEST, most impressive achievements regardless of direct job match
   - Emphasize metrics that show impact and scale
   - Highlight transferable skills: problem-solving, architecture, performance optimization
   - Show breadth of experience and adaptability

2. **Experience Bullets Strategy:**
   - For EACH role, find the bullet that best demonstrates:
     * Similar problem-solving patterns to the target job
     * Quick learning of new technologies
     * Leadership and initiative
   - Reframe technical experience to show transferable patterns
   - Emphasize results over specific technologies

3. **Skills Section Strategy:**
   - Include adjacent/related technologies that show learning curve
   - Add foundational skills that enable quick learning
   - Include soft skills if relevant (leadership, mentoring, collaboration)

4. **Keyword Strategy:**
   - Include job keywords where candidate has ANY related experience
   - Use industry terms that show domain familiarity

Remember: The goal is to get an INTERVIEW where the candidate can demonstrate their potential. Focus on achievements that prove they can succeed in new challenges.
` : ""}

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
    model: "claude-sonnet-4-5",
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

  // Filter skills to only include those from the candidate's profile
  const profileSkillsLower = (profile.skills || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim());
  
  // Also extract skills mentioned in experience descriptions
  const experienceText = profile.experiences
    .map((exp) => `${exp.responsibilities} ${exp.title}`.toLowerCase())
    .join(" ");

  // Filter to only skills that appear in profile skills or experience
  const filteredSkills = parsed.relevantSkills.filter((skill: string) => {
    const skillLower = skill.toLowerCase().trim();
    // Check if skill is in profile skills list
    const inProfileSkills = profileSkillsLower.some(
      (ps) => ps.includes(skillLower) || skillLower.includes(ps)
    );
    // Check if skill is mentioned in experience
    const inExperience = experienceText.includes(skillLower);
    return inProfileSkills || inExperience;
  });

  // Use filtered skills, but fall back to profile skills if too few match
  if (filteredSkills.length >= 3) {
    parsed.relevantSkills = filteredSkills;
  } else {
    // Fall back to profile skills directly
    parsed.relevantSkills = profileSkillsLower
      .filter((s) => s.length > 0)
      .slice(0, 12)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
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
- **Paragraph 1:** Highlight the MOST RELEVANT experience (NOT necessarily the most recent)
  - ANALYZE all work experiences and select the one that BEST matches the job requirements
  - If an older role is more relevant to this job, emphasize THAT experience over newer ones
  - Choose 2-3 achievements that directly match job requirements
  - Use specific numbers and outcomes

- **Paragraph 2:** Draw from OTHER relevant experiences across the candidate's history
  - Look for skills and achievements from ANY role that match job requirements
  - Don't just summarize the most recent job - cherry-pick relevant accomplishments from ALL experiences
  - Mention specific technologies from job description that you've mastered
  - Show understanding of company's challenges or mission

- **Optional Paragraph 3:** Address any special requirements or show additional value
  - Leadership experience if senior role
  - Industry-specific knowledge
  - Unique combination of skills from across career

**EXPERIENCE SELECTION RULE:**
- DO NOT default to most recent experience
- SCAN ALL experiences and rank by relevance to THIS specific job
- Lead with the MOST RELEVANT experience, even if it's from years ago
- A 5-year-old role that perfectly matches beats a recent unrelated role

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
    model: "claude-sonnet-4-5",
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
    model: "claude-sonnet-4-5",
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

export async function applyResumeRecommendations(
  currentResume: {
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
  },
  ranking: ResumeRankingResult,
  jobDescription: string,
  jobTitle?: string,
  companyName?: string
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
  const improvements = ranking.improvements || [];
  const weaknesses = ranking.weaknesses || [];
  const categoryFeedback = Object.entries(ranking.categories || {})
    .map(([key, val]) => `${key}: ${val.feedback}`)
    .join("\n");

  const systemMessage = `You are an expert resume editor improving an existing resume based on evaluation feedback.

CRITICAL RULES:
1. You CANNOT invent new experience, companies, or technologies the candidate doesn't have
2. You can ONLY restructure, reword, and emphasize existing content
3. Every metric and achievement must come from the original resume - extract or estimate realistic numbers from context
4. Focus on: better phrasing, stronger action verbs, clearer metrics, better job alignment
5. Keep the same number of experiences and maintain truthfulness
6. Output must be valid JSON matching the exact input structure
7. EVERY bullet point MUST include specific numbers and quantifiable impact (%, $, time saved, users, etc.)
8. EXACTLY 3 bullet points per experience - no more, no less`;

  const userMessage = `Improve this resume based on the evaluation feedback.

TARGET ROLE: ${jobTitle || "the position"} at ${companyName || "the company"}

CURRENT RESUME:
- Summary: ${currentResume.logline?.join(" | ") || "No summary"}
- Skills: ${currentResume.relevantSkills?.join(", ") || currentResume.technologies || "None listed"}
- Experiences:
${(currentResume.experiences || []).map((exp, i) => 
  `  ${i + 1}. ${exp.title} at ${exp.company} (${exp.start} - ${exp.end})
     Bullets: ${(exp.bullets || []).join(" | ")}`
).join("\n")}

EVALUATION WEAKNESSES TO ADDRESS:
${weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")}

RECOMMENDED IMPROVEMENTS:
${improvements.map((imp, i) => `${i + 1}. ${imp}`).join("\n")}

CATEGORY FEEDBACK:
${categoryFeedback}

JOB DESCRIPTION (for alignment):
${jobDescription.slice(0, 1000)}

Instructions:
1. Rewrite the summary bullets to better highlight job-relevant achievements WITH NUMBERS
2. For EACH experience, create EXACTLY 3 bullet points - each with quantifiable impact
3. Every bullet MUST have specific metrics: percentages, dollar amounts, time saved, users impacted, etc.
4. Use strong action verbs: Architected, Spearheaded, Optimized, Delivered, Reduced, Increased
5. Better align skills section with job requirements (only include skills candidate actually has)
6. Address the weaknesses and apply the recommended improvements
7. Maintain the EXACT same companies, titles, and dates - only improve the wording
8. If original has no numbers, estimate realistic ones based on context (e.g., "improved performance" → "improved performance by 35%")

Return a JSON object with: logline (array of 3 strings), experiences (array with company, title, location, start, end, bullets - EXACTLY 3 bullets each), technologies (string), relevantSkills (array of strings)`;

  console.log("Calling OpenAI to apply resume recommendations...");

  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  let content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI recommendation application response received");

  if (content.startsWith("```")) {
    content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse recommendations response:", e);
    // Keep the current resume unchanged rather than crashing the request
    return currentResume;
  }

  return {
    logline: Array.isArray(parsed.logline) ? parsed.logline : currentResume.logline,
    experiences: Array.isArray(parsed.experiences) ? parsed.experiences.map((exp: any, i: number) => {
      const bullets = Array.isArray(exp.bullets) ? exp.bullets.slice(0, 3) : currentResume.experiences[i]?.bullets?.slice(0, 3) || [];
      while (bullets.length < 3 && currentResume.experiences[i]?.bullets?.[bullets.length]) {
        bullets.push(currentResume.experiences[i].bullets[bullets.length]);
      }
      return {
        company: exp.company || currentResume.experiences[i]?.company || "",
        title: exp.title || currentResume.experiences[i]?.title || "",
        location: exp.location || currentResume.experiences[i]?.location || "",
        start: exp.start || currentResume.experiences[i]?.start || "",
        end: exp.end || currentResume.experiences[i]?.end || "",
        bullets: bullets.slice(0, 3),
      };
    }) : currentResume.experiences,
    technologies: parsed.technologies || currentResume.technologies,
    relevantSkills: Array.isArray(parsed.relevantSkills) ? parsed.relevantSkills : currentResume.relevantSkills || [],
  };
}

export interface GapAnalysisResult {
  shouldGenerateResume: boolean;
  gapAnalysis: {
    jobMatch: number;
    interviewProbability: number;
    criticalGaps: string[];
    strongMatches: string[];
    recommendation: "APPLY" | "SKIP" | "LEARN_FIRST";
    recommendationReason: string;
    suggestedActions: string[];
    betterJobMatches: string[];
    timeToBeQualified: string;
  };
}

export async function analyzeJobFitGap(
  profile: ProfileData,
  jobDescription: string,
  jobTitle?: string,
  companyName?: string
): Promise<GapAnalysisResult> {
  const systemMessage = `You are a career advisor analyzing job fit. Compare the candidate's skills and experience against job requirements. Return JSON with:
- shouldGenerateResume (boolean: true if match >= 60%, false otherwise)
- gapAnalysis object with: jobMatch (0-100), interviewProbability (0-100), criticalGaps (array), strongMatches (array), recommendation (APPLY/SKIP/LEARN_FIRST), recommendationReason (string), suggestedActions (array), betterJobMatches (array of job title suggestions), timeToBeQualified (string)

Be honest about skill gaps. If candidate lacks PRIMARY requirements, recommend SKIP or LEARN_FIRST.`;

  const candidateSkills = profile.skills || "";
  const candidateExperience = profile.experiences.map(exp => 
    `${exp.title} at ${exp.company}: ${exp.responsibilities.slice(0, 150)}`
  ).join(" | ");

  const userMessage = `Analyze job fit for: ${jobTitle || "this role"} at ${companyName || "the company"}.

CANDIDATE SKILLS: ${candidateSkills}

CANDIDATE EXPERIENCE: ${candidateExperience}

JOB DESCRIPTION: ${jobDescription.slice(0, 2000)}

Steps:
1. Extract PRIMARY requirements (must-have skills mentioned multiple times)
2. Extract SECONDARY requirements (mentioned once or twice)
3. Check which requirements the candidate has
4. Calculate match percentage
5. If match < 60%, recommend SKIP or LEARN_FIRST
6. If match >= 60%, recommend APPLY

Return valid JSON only.`;

  console.log("Calling OpenAI for gap analysis...");

  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  let content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI gap analysis response received");

  content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse gap analysis response:", content);
    parsed = {};
  }

  const clamp = (val: any): number => {
    const num = Number(val);
    return isNaN(num) ? 50 : Math.max(0, Math.min(100, Math.round(num)));
  };

  const ensureStrArray = (arr: any, fallback: string[]): string[] => {
    if (!Array.isArray(arr)) return fallback;
    return arr.filter(item => typeof item === "string" && item.length > 0).slice(0, 5);
  };

  const validRecs = ["APPLY", "SKIP", "LEARN_FIRST"] as const;
  const normalizeRec = (rec: any): "APPLY" | "SKIP" | "LEARN_FIRST" => {
    if (typeof rec !== "string") return "APPLY";
    const upper = rec.toUpperCase().replace(/\s+/g, "_");
    return validRecs.includes(upper as any) ? (upper as any) : "APPLY";
  };

  const jobMatch = clamp(parsed.gapAnalysis?.jobMatch ?? parsed.jobMatch ?? 40);
  // Only allow generation if jobMatch >= 60, never default to true
  const shouldGenerate = jobMatch >= 60;

  return {
    shouldGenerateResume: shouldGenerate,
    gapAnalysis: {
      jobMatch,
      interviewProbability: clamp(parsed.gapAnalysis?.interviewProbability ?? parsed.interviewProbability),
      criticalGaps: ensureStrArray(parsed.gapAnalysis?.criticalGaps ?? parsed.criticalGaps, []),
      strongMatches: ensureStrArray(parsed.gapAnalysis?.strongMatches ?? parsed.strongMatches, []),
      recommendation: shouldGenerate ? "APPLY" : normalizeRec(parsed.gapAnalysis?.recommendation ?? parsed.recommendation),
      recommendationReason: typeof (parsed.gapAnalysis?.recommendationReason ?? parsed.recommendationReason) === "string" 
        ? (parsed.gapAnalysis?.recommendationReason ?? parsed.recommendationReason).slice(0, 500) 
        : "Analysis complete.",
      suggestedActions: ensureStrArray(parsed.gapAnalysis?.suggestedActions ?? parsed.suggestedActions, []),
      betterJobMatches: ensureStrArray(parsed.gapAnalysis?.betterJobMatches ?? parsed.betterJobMatches, []),
      timeToBeQualified: typeof (parsed.gapAnalysis?.timeToBeQualified ?? parsed.timeToBeQualified) === "string" 
        ? (parsed.gapAnalysis?.timeToBeQualified ?? parsed.timeToBeQualified).slice(0, 100) 
        : "N/A",
    },
  };
}

export interface LinkedinCategoryScore {
  score: number;
  feedback: string;
  suggestions: string[];
}

export interface LinkedinAnalysisResult {
  overallScore: number;
  categories: {
    headline: LinkedinCategoryScore;
    about: LinkedinCategoryScore;
    experience: LinkedinCategoryScore;
    skills: LinkedinCategoryScore;
    completeness: LinkedinCategoryScore;
    searchability: LinkedinCategoryScore;
  };
  topStrengths: string[];
  criticalIssues: string[];
  prioritizedActions: string[];
  optimizedHeadline: string;
  optimizedAbout: string;
}

export interface LinkedinProfileInput {
  headline: string;
  about: string;
  experienceText: string;
  skillsText: string;
}

export async function analyzeLinkedinProfile(
  input: LinkedinProfileInput
): Promise<LinkedinAnalysisResult> {
  const systemMessage = `You are a LinkedIn optimization expert who has helped thousands of professionals improve their LinkedIn presence. You analyze profiles against industry best practices that apply universally, regardless of specific job roles.

Your analysis focuses on 6 key categories:
1. HEADLINE: Does it go beyond just a job title? Strong headlines include value proposition, key skills, or achievements.
2. ABOUT/SUMMARY: Is it engaging, value-focused, and optimized for keywords? Does it tell a story?
3. EXPERIENCE: Are achievements quantified with metrics? Are responsibilities described with impact?
4. SKILLS: Are they relevant, comprehensive, and strategically ordered?
5. COMPLETENESS: Based on the provided content, how fully fleshed out is the profile?
6. SEARCHABILITY: Does the profile use keywords effectively for recruiter searches?

Provide honest, actionable feedback. Score each category 0-100.`;

  const userMessage = `Analyze this LinkedIn profile content against general best practices:

---

HEADLINE:
${input.headline || "(No headline provided)"}

ABOUT/SUMMARY:
${input.about || "(No about section provided)"}

EXPERIENCE:
${input.experienceText || "(No experience provided)"}

SKILLS:
${input.skillsText || "(No skills provided)"}

---

Analyze and return JSON with:

{
  "overallScore": number (0-100, weighted average of categories),
  "categories": {
    "headline": {
      "score": number,
      "feedback": "Brief assessment of headline quality",
      "suggestions": ["specific improvement 1", "specific improvement 2"]
    },
    "about": {
      "score": number,
      "feedback": "Assessment of about section",
      "suggestions": ["improvement 1", "improvement 2"]
    },
    "experience": {
      "score": number,
      "feedback": "Assessment of experience bullets",
      "suggestions": ["improvement 1", "improvement 2"]
    },
    "skills": {
      "score": number,
      "feedback": "Assessment of skills section",
      "suggestions": ["improvement 1", "improvement 2"]
    },
    "completeness": {
      "score": number,
      "feedback": "Assessment of overall completeness",
      "suggestions": ["improvement 1", "improvement 2"]
    },
    "searchability": {
      "score": number,
      "feedback": "Assessment of keyword optimization",
      "suggestions": ["improvement 1", "improvement 2"]
    }
  },
  "topStrengths": ["strength 1", "strength 2", "strength 3"],
  "criticalIssues": ["issue 1", "issue 2"],
  "prioritizedActions": ["Most important action first", "Second priority", "Third priority"],
  "optimizedHeadline": "Rewritten headline suggestion (max 120 chars)",
  "optimizedAbout": "Rewritten about section suggestion (max 2000 chars)"
}

Be specific and actionable. Don't be generic.`;

  console.log("Calling OpenAI for LinkedIn profile analysis...");

  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  let content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI LinkedIn analysis response received");

  content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse LinkedIn analysis response:", content);
    parsed = {};
  }

  const clampScore = (val: any): number => {
    const num = Number(val);
    if (isNaN(num)) return 50;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const ensureCategory = (cat: any): LinkedinCategoryScore => ({
    score: clampScore(cat?.score),
    feedback: typeof cat?.feedback === "string" && cat.feedback.length > 0 
      ? cat.feedback.slice(0, 300) 
      : "No feedback available",
    suggestions: Array.isArray(cat?.suggestions) 
      ? cat.suggestions.filter((s: any) => typeof s === "string" && s.length > 0).slice(0, 3)
      : ["Review this section for improvement opportunities"]
  });

  const ensureArray = (arr: any, fallback: string[]): string[] => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr.filter(item => typeof item === "string" && item.length > 0).slice(0, 5);
  };

  const categories = parsed.categories || {};
  
  const result: LinkedinAnalysisResult = {
    overallScore: clampScore(parsed.overallScore),
    categories: {
      headline: ensureCategory(categories.headline),
      about: ensureCategory(categories.about),
      experience: ensureCategory(categories.experience),
      skills: ensureCategory(categories.skills),
      completeness: ensureCategory(categories.completeness),
      searchability: ensureCategory(categories.searchability),
    },
    topStrengths: ensureArray(parsed.topStrengths, ["Profile has been created", "Some sections are filled out"]),
    criticalIssues: ensureArray(parsed.criticalIssues, []),
    prioritizedActions: ensureArray(parsed.prioritizedActions, [
      "Complete all profile sections",
      "Add measurable achievements",
      "Optimize headline with keywords"
    ]),
    optimizedHeadline: typeof parsed.optimizedHeadline === "string" && parsed.optimizedHeadline.length > 0
      ? parsed.optimizedHeadline.slice(0, 120)
      : input.headline || "Professional seeking new opportunities",
    optimizedAbout: typeof parsed.optimizedAbout === "string" && parsed.optimizedAbout.length > 0
      ? parsed.optimizedAbout.slice(0, 2000)
      : input.about || "Experienced professional ready for the next challenge.",
  };

  return result;
}

export interface TrainingQuestion {
  question: string;
  answer: string;
  explanation: string;
}

export interface SkillTrainingResult {
  skill: string;
  difficulty: string;
  questions: TrainingQuestion[];
}

export async function generateSkillTraining(
  skill: string,
  difficulty: "beginner" | "intermediate" | "senior"
): Promise<SkillTrainingResult> {
  const difficultyDescriptions = {
    beginner: "entry-level, foundational concepts, basic syntax and usage, suitable for someone just starting to learn",
    intermediate: "mid-level, practical applications, common patterns, best practices, suitable for someone with 1-3 years experience",
    senior: "advanced, deep internals, architecture decisions, optimization, edge cases, suitable for senior engineers with 5+ years experience"
  };

  const systemMessage = `You are an expert technical interviewer and educator. You create comprehensive training questions that help professionals deepen their knowledge and prepare for technical interviews.

Your questions are:
- Practical and real-world focused
- Progressively challenging within the difficulty level
- Clear and unambiguous
- Accompanied by thorough, educational answers`;

  const userMessage = `Generate exactly 20 training questions for the skill: "${skill}"

Difficulty Level: ${difficulty.toUpperCase()}
Description: ${difficultyDescriptions[difficulty]}

Requirements:
1. Generate exactly 20 questions
2. Questions should cover different aspects of ${skill}
3. Each question should have a clear, comprehensive answer
4. Include an explanation that provides additional context or tips
5. Mix question types: conceptual, practical, scenario-based, and problem-solving
6. Questions should be appropriate for the ${difficulty} level

For ${difficulty} level specifically:
${difficulty === "beginner" ? `
- Focus on basic concepts and terminology
- Include "what is" and "how to" questions
- Cover fundamental syntax and usage
- Include common beginner mistakes to avoid` : ""}
${difficulty === "intermediate" ? `
- Focus on practical implementation patterns
- Include debugging scenarios
- Cover best practices and common pitfalls
- Include performance considerations` : ""}
${difficulty === "senior" ? `
- Focus on architecture and design decisions
- Include complex optimization scenarios
- Cover edge cases and failure modes
- Include system design considerations` : ""}

Return ONLY valid JSON:
{
  "skill": "${skill}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "Clear, specific question text",
      "answer": "Comprehensive answer (2-4 sentences)",
      "explanation": "Additional context, tips, or related concepts (1-2 sentences)"
    }
  ]
}

Generate all 20 questions now.`;

  console.log(`Calling OpenAI for ${skill} training (${difficulty})...`);

  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  let content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI skill training response received");

  content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse skill training response:", content);
    parsed = {};
  }

  const validateQuestion = (q: any): TrainingQuestion => ({
    question: typeof q?.question === "string" && q.question.length > 0 
      ? q.question 
      : "Question unavailable",
    answer: typeof q?.answer === "string" && q.answer.length > 0 
      ? q.answer 
      : "Answer unavailable",
    explanation: typeof q?.explanation === "string" && q.explanation.length > 0 
      ? q.explanation 
      : "No additional explanation available"
  });

  let questions: TrainingQuestion[] = [];
  if (Array.isArray(parsed.questions)) {
    questions = parsed.questions.slice(0, 20).map(validateQuestion);
  }

  while (questions.length < 20) {
    questions.push({
      question: `Sample ${skill} question ${questions.length + 1} for ${difficulty} level`,
      answer: "Answer pending generation",
      explanation: "Please try regenerating the training content"
    });
  }

  return {
    skill,
    difficulty,
    questions
  };
}

export interface ApplicationTrainingResult {
  category: "technical" | "soft";
  difficulty: "easy" | "medium" | "hard";
  skillFocus: string;
  questions: TrainingQuestion[];
}

export async function generateApplicationTraining(
  jobDescription: string,
  jobTitle: string,
  companyName: string,
  category: "technical" | "soft",
  difficulty: "easy" | "medium" | "hard",
  userSkills: string
): Promise<ApplicationTrainingResult> {
  const difficultyDescriptions = {
    easy: "entry-level interview questions, focus on basic concepts and terminology, suitable for initial phone screens",
    medium: "mid-level interview questions, practical scenarios and problem-solving, suitable for technical interviews",
    hard: "advanced interview questions, complex scenarios, system design, suitable for senior-level final rounds"
  };

  const categoryDescriptions = {
    technical: "technical skills, coding concepts, architecture, tools, and technologies mentioned in the job description",
    soft: "soft skills like communication, teamwork, leadership, problem-solving approach, conflict resolution, and behavioral questions using STAR method"
  };

  const systemMessage = `You are an expert interview coach and hiring manager with 15 years of experience. You create realistic interview preparation questions that help candidates succeed in their interviews.

Your questions are:
- Tailored to the specific job description and company
- Appropriate for the difficulty level
- Practical and commonly asked in real interviews
- Designed to help candidates practice and improve`;

  const userMessage = `Generate exactly 10 interview training questions for a candidate applying to "${jobTitle}" at "${companyName}".

Category: ${category.toUpperCase()} (${categoryDescriptions[category]})
Difficulty: ${difficulty.toUpperCase()} (${difficultyDescriptions[difficulty]})

Job Description:
${jobDescription}

Candidate's Current Skills: ${userSkills}

Requirements:
1. Generate exactly 10 questions
2. Questions must be directly relevant to the job description
3. Each question should have:
   - A clear question that might be asked in an interview
   - A model answer showing what a good response looks like
   - An explanation with tips on how to answer effectively

${category === "technical" ? `
For TECHNICAL questions:
- Focus on technologies and skills mentioned in the job description
- Include coding concepts, architecture decisions, and tool usage
- Mix conceptual questions with practical scenario-based questions
- Include questions about the candidate's experience with relevant technologies
` : `
For SOFT SKILLS questions:
- Use behavioral interview format (Tell me about a time when...)
- Cover teamwork, communication, leadership, and problem-solving
- Include questions about handling challenges and conflicts
- Reference the company culture and job responsibilities
- Structure answers using STAR method (Situation, Task, Action, Result)
`}

For ${difficulty} level:
${difficulty === "easy" ? `
- Focus on fundamental concepts and basic experiences
- Questions should be straightforward and direct
- Suitable for phone screen or initial interviews` : ""}
${difficulty === "medium" ? `
- Include practical scenarios and real-world problems
- Expect more detailed and nuanced answers
- Suitable for main interview rounds` : ""}
${difficulty === "hard" ? `
- Include complex scenarios and edge cases
- Expect deep technical knowledge or sophisticated leadership examples
- Suitable for final rounds with senior interviewers` : ""}

Identify the PRIMARY skill focus area from the job description for this category. This should be a specific skill like "React" or "Leadership" based on what's most important in the job description.

Return ONLY valid JSON:
{
  "skillFocus": "Primary skill focus for this training",
  "questions": [
    {
      "question": "Interview question",
      "answer": "Model answer showing a good response",
      "explanation": "Tips on how to answer this effectively"
    }
  ]
}

Generate all 10 questions now.`;

  console.log(`Calling OpenAI for application training (${category}/${difficulty})...`);

  const response = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  let content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI application training response received");

  content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse application training response:", content);
    parsed = {};
  }

  const validateQuestion = (q: any): TrainingQuestion => ({
    question: typeof q?.question === "string" && q.question.length > 0 
      ? q.question 
      : "Question unavailable",
    answer: typeof q?.answer === "string" && q.answer.length > 0 
      ? q.answer 
      : "Answer unavailable",
    explanation: typeof q?.explanation === "string" && q.explanation.length > 0 
      ? q.explanation 
      : "No additional explanation available"
  });

  let questions: TrainingQuestion[] = [];
  if (Array.isArray(parsed.questions)) {
    questions = parsed.questions.slice(0, 10).map(validateQuestion);
  }

  while (questions.length < 10) {
    questions.push({
      question: `Sample ${category} question ${questions.length + 1} for ${difficulty} level`,
      answer: "Answer pending generation",
      explanation: "Please try regenerating the training content"
    });
  }

  const skillFocus = typeof parsed.skillFocus === "string" && parsed.skillFocus.length > 0
    ? parsed.skillFocus
    : category === "technical" ? "Technical Skills" : "Soft Skills";

  return {
    category,
    difficulty,
    skillFocus,
    questions
  };
}

export interface InterviewQuestion {
  question: string;
  type: "behavioral" | "technical" | "situational" | "competency";
  expectedTopics: string[];
}

export interface InterviewQuestionsResult {
  questions: InterviewQuestion[];
  difficulty: string;
  jobTitle: string;
}

export async function generateInterviewQuestions(
  jobDescription: string,
  jobTitle: string,
  difficulty: "entry" | "mid" | "senior" | "executive"
): Promise<InterviewQuestionsResult> {
  const difficultyDescriptions = {
    entry: "Entry-level position, focusing on basic competencies, eagerness to learn, and foundational knowledge. Questions should assess potential and trainability.",
    mid: "Mid-level position with 2-5 years experience. Questions should probe practical experience, problem-solving abilities, and growing expertise.",
    senior: "Senior-level position with 5-10 years experience. Questions should explore leadership, complex problem-solving, strategic thinking, and deep technical expertise.",
    executive: "Executive-level position. Questions should assess vision, organizational leadership, business acumen, and ability to drive transformation."
  };

  const questionCounts = {
    entry: 5,
    mid: 7,
    senior: 8,
    executive: 8
  };

  const systemMessage = `You are an expert interviewer conducting mock interviews. Generate realistic interview questions that would be asked in actual job interviews.

Your questions are:
- Directly relevant to the job description provided
- Appropriate for the seniority level
- A mix of behavioral, technical, situational, and competency-based
- Similar to questions used by top companies in real interviews`;

  const userMessage = `Generate ${questionCounts[difficulty]} interview questions for the following job:

Job Title: ${jobTitle}
Difficulty Level: ${difficulty.toUpperCase()}
Level Description: ${difficultyDescriptions[difficulty]}

Job Description:
${jobDescription}

Requirements:
1. Generate exactly ${questionCounts[difficulty]} interview questions
2. Include a mix of question types (behavioral, technical, situational, competency)
3. Questions should directly relate to the job description requirements
4. For each question, identify key topics the candidate should cover in their answer
5. Questions should progressively increase in difficulty

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "The interview question text",
      "type": "behavioral|technical|situational|competency",
      "expectedTopics": ["topic1", "topic2", "topic3"]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "claude-haiku-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7
  });

  const content = completion.choices[0]?.message?.content || "{}";
  let parsed: any;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  } catch {
    parsed = {};
  }

  const validateQuestion = (q: any): InterviewQuestion => ({
    question: typeof q.question === "string" ? q.question : "Tell me about yourself",
    type: ["behavioral", "technical", "situational", "competency"].includes(q.type) ? q.type : "behavioral",
    expectedTopics: Array.isArray(q.expectedTopics) ? q.expectedTopics.slice(0, 5) : ["relevant experience", "skills", "motivation"]
  });

  let questions: InterviewQuestion[] = [];
  if (Array.isArray(parsed.questions)) {
    questions = parsed.questions.slice(0, questionCounts[difficulty]).map(validateQuestion);
  }

  while (questions.length < questionCounts[difficulty]) {
    questions.push({
      question: `Tell me about your experience related to ${jobTitle}`,
      type: "behavioral",
      expectedTopics: ["relevant experience", "skills"]
    });
  }

  return {
    questions,
    difficulty,
    jobTitle
  };
}

export interface AnswerEvaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}

export async function evaluateInterviewAnswer(
  question: string,
  questionType: string,
  expectedTopics: string[],
  userAnswer: string,
  jobDescription: string,
  difficulty: string
): Promise<AnswerEvaluation> {
  const systemMessage = `You are an expert interview coach providing constructive feedback on interview answers. Be encouraging but honest about areas for improvement.`;

  const userMessage = `Evaluate this interview answer:

Question: ${question}
Question Type: ${questionType}
Expected Topics to Cover: ${expectedTopics.join(", ")}
Difficulty Level: ${difficulty}

Job Context:
${jobDescription.substring(0, 500)}

Candidate's Answer:
${userAnswer}

Provide a thorough evaluation:
1. Score the answer from 0-100 based on completeness, relevance, structure, and impact
2. Identify 2-3 specific strengths in the answer
3. Identify 2-3 areas for improvement with actionable advice
4. Provide a sample strong answer for comparison

Return ONLY valid JSON:
{
  "score": 75,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "sampleAnswer": "A strong sample answer that demonstrates best practices"
}`;

  const completion = await openai.chat.completions.create({
    model: "claude-haiku-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.5
  });

  const content = completion.choices[0]?.message?.content || "{}";
  let parsed: any;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  } catch {
    parsed = {};
  }

  return {
    score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : ["Good attempt"],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : ["Add more specific examples"],
    sampleAnswer: typeof parsed.sampleAnswer === "string" ? parsed.sampleAnswer : "No sample answer available"
  };
}

export async function generateOverallInterviewFeedback(
  evaluations: AnswerEvaluation[],
  jobTitle: string,
  difficulty: string
): Promise<{ overallScore: number; overallFeedback: string }> {
  const avgScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;
  
  const allStrengths = evaluations.flatMap(e => e.strengths);
  const allImprovements = evaluations.flatMap(e => e.improvements);

  const systemMessage = `You are an expert career coach providing overall interview feedback.`;

  const userMessage = `Based on a mock interview for a ${difficulty} level ${jobTitle} position, provide overall feedback.

Average Score: ${avgScore.toFixed(0)}%
Number of Questions: ${evaluations.length}

Patterns in Strengths: ${allStrengths.join("; ")}
Areas for Improvement: ${allImprovements.join("; ")}

Write a 2-3 paragraph encouraging summary that:
1. Highlights what the candidate did well overall
2. Identifies key areas to focus on for improvement
3. Provides actionable next steps for interview preparation

Be specific and constructive. Use a supportive, coaching tone.`;

  const completion = await openai.chat.completions.create({
    model: "claude-haiku-4-5",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7
  });

  const feedback = completion.choices[0]?.message?.content || "Great effort on completing this mock interview! Review your answers and keep practicing.";

  return {
    overallScore: Math.round(avgScore),
    overallFeedback: feedback
  };
}
