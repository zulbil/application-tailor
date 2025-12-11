import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
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
  jobApp: JobApplicationData
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
  const systemMessage = `You are an expert resume writer and career coach. You rewrite resumes and cover letters to match specific job descriptions, while staying truthful to the candidate's real experience. You always use clear, concise bullet points, measurable impact (metrics, percentages, time saved, etc.), and modern tech keywords where appropriate. Your style is recruiter-friendly and optimized for ATS.`;

  const userMessage = `I will give you:
- My profile (personal info, skills, work experiences, education)
- A job description

STEP 1: EXTRACT KEY RESPONSIBILITIES
First, read the job description and extract the KEY RESPONSIBILITIES the role requires.
These responsibilities must guide how you rewrite my resume.

STEP 2: GENERATE TAILORED RESUME
Using the extracted responsibilities, generate a tailored resume in this exact structure:

1. Impact Logline (Professional Summary)
Create exactly 3 powerful bullets that represent the STRONGEST moments of my career that best match this job description. Each bullet must:
- Highlight a specific career achievement with measurable impact
- Draw from my actual work experience (do not invent achievements)
- Include specific metrics (%, $, time saved, team size, scale, etc.)
- Align closely with the KEY RESPONSIBILITIES you extracted
- LENGTH LIMIT: Maximum 15-20 words per bullet. Keep it punchy and impactful.

Example good logline bullets:
- "Led team of 12 to deliver $5M e-commerce platform, boosting revenue 35%"
- "Cut infrastructure costs 60% via cloud migration, saving $200K annually"
- "Built real-time data pipeline processing 10M+ events daily at 99.9% uptime"

2. Tailored Experiences
For EACH experience in my profile, return:
- Company, Title, Location, Dates (unchanged from my profile - do NOT modify these fields)
- Exactly 3 bullet points that demonstrate skills relevant to the TARGET JOB TITLE provided below

CRITICAL BULLET POINT RULES:
a) Every bullet must implicitly answer: "Does this bullet prove the candidate can perform one or more of the KEY RESPONSIBILITIES?"
b) Every bullet MUST be an accomplishment, NOT just a responsibility
c) MANDATORY METRICS: Every bullet MUST include a specific measurable outcome such as:
   - Percentages (e.g., "increased by 40%", "reduced by 25%")
   - Time metrics (e.g., "saved 10 hours/week", "reduced latency by 200ms")
   - Scale metrics (e.g., "served 1M+ users", "processed 50K requests/day")
   - Money metrics (e.g., "saved $50K annually", "generated $100K revenue")
   - Team/size metrics (e.g., "led team of 5", "mentored 3 junior developers")
   - Quality metrics (e.g., "achieved 99.9% uptime", "reduced bugs by 60%")
d) Every bullet MUST include:
   - An action verb (e.g., Built, Led, Developed, Implemented, Designed, Optimized)
   - A measurable impact with specific numbers
   - A relevant technology or concept from the job description (when appropriate)
e) LENGTH LIMIT: Each bullet must be ONE complete sentence on ONE line. Maximum 15-25 words. No multi-line or wrapped bullets.
f) Format: "Action verb + what you did + technology/tool + specific measurable result"
g) GOOD examples:
   - "Built React dashboard with TypeScript, reducing support tickets by 40%"
   - "Led migration to AWS, cutting infrastructure costs by $50K annually"
   - "Optimized database queries, improving page load time from 3s to 800ms"
   - "Implemented CI/CD pipeline with GitHub Actions, reducing deployment time by 75%"
h) BAD examples (do NOT write like this):
   - "Responsible for building dashboards" (no metric, too vague)
   - "Worked on various projects using React and TypeScript to improve the user experience across multiple features" (too long, no specific metric)

PDF-READY FORMATTING RULES:
- Use simple plain text only - no emojis, no unusual unicode characters
- No special bullet symbols (no •, →, ►) - the app will add formatting
- No bold, italic, or other formatting inside bullet text
- Each bullet must be a single complete sentence (no line breaks within bullets)
- Keep all text short and spaced - no paragraphs longer than 2 lines
- No HTML, tables, or markdown in the bullet content itself

If a key responsibility is important but not clearly demonstrated by any existing bullet, you may rephrase or expand my existing information — but NEVER invent experience I do not have.

3. Technologies from Job Description
A single line: comma-separated list of technologies and tools found in the JD.

4. Relevant Skills for Resume
An array of 8-12 key skills/technologies that should appear on the resume's skills section. These should be:
- Skills from the job description that match what the candidate actually has
- Ordered by relevance to this specific job (most important first)
- A mix of technical skills, tools, and soft skills mentioned in the JD

STRICT REQUIREMENTS:
- You may reorganize or restyle what I already did
- You may NOT invent job titles, responsibilities, technologies, or achievements I never had
- Do not change my job titles, company names, or dates
- Keep bullets concise and recruiter-friendly
- GOAL: The final rewritten bullets must make it obvious that I can succeed in the job because my past accomplishments directly support the key responsibilities

Return ONLY valid JSON with this structure:
{
  "logline": ["...", "...", "..."],
  "experiences": [
    {
      "company": "...",
      "title": "...",
      "location": "...",
      "start": "...",
      "end": "...",
      "bullets": ["...", "...", "..."]
    }
  ],
  "technologies": "React, TypeScript, Vue, ...",
  "relevantSkills": ["React", "TypeScript", "Node.js", "AWS", "REST APIs", "Agile", "Git", "PostgreSQL"]
}

Here is my profile:
Name: ${profile.firstName} ${profile.lastName}
Email: ${profile.email}
Phone: ${profile.phone}
Location: ${profile.location}
Headline: ${profile.headline}
Skills: ${profile.skills}

Experiences:
${profile.experiences.map((exp, i) => `
Experience ${i + 1}:
Company: ${exp.company}
Title: ${exp.title}
Location: ${exp.location}
Dates: ${exp.startDate} - ${exp.endDate}
Responsibilities/Achievements:
${exp.responsibilities}
`).join("\n")}

Education:
${profile.education.map((edu, i) => `
Education ${i + 1}:
School: ${edu.school}
Degree: ${edu.degree}
Field of Study: ${edu.field}
Dates: ${edu.startDate} - ${edu.endDate}
`).join("\n")}

Here is the job description:
${jobApp.jobDescription}

${jobApp.jobTitle ? `Target Job Title: ${jobApp.jobTitle}` : ""}
${jobApp.companyName ? `Target Company: ${jobApp.companyName}` : ""}`;

  console.log("Calling OpenAI for resume generation...");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI response received");
  
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse OpenAI response:", content);
    parsed = {};
  }
  
  // Validate the response has required fields
  if (!parsed.logline || !Array.isArray(parsed.logline)) {
    parsed.logline = ["Unable to generate logline. Please try again."];
  }
  if (!parsed.experiences || !Array.isArray(parsed.experiences)) {
    parsed.experiences = [];
  }
  if (!parsed.technologies) {
    parsed.technologies = "";
  }
  if (!parsed.relevantSkills || !Array.isArray(parsed.relevantSkills)) {
    parsed.relevantSkills = [];
  }
  
  return parsed;
}

export async function generateCoverLetter(
  profile: ProfileData,
  jobApp: JobApplicationData
): Promise<{ coverLetter: string }> {
  const systemMessage = `You are an expert resume writer and career coach. You rewrite resumes and cover letters to match specific job descriptions, while staying truthful to the candidate's real experience. You always use clear, concise bullet points, measurable impact (metrics, percentages, time saved, etc.), and modern tech keywords where appropriate. Your style is recruiter-friendly and optimized for ATS.`;

  const userMessage = `Using the profile and job description below, write a one-page cover letter tailored to this role.

Guidelines:
- Use the target job title and company name if provided.
- The tone should match this value: ${jobApp.tone}.
- Highlight my most relevant experiences and tech skills for this job.
- Mention 2–3 specific responsibilities or keywords from the job description to show alignment.
- Reference my education if relevant to the role.
- Keep it concise, professional, and ready to paste into an application form.
- Return ONLY valid JSON with this structure: { "coverLetter": "Full cover letter text..." }

Here is my profile:
Name: ${profile.firstName} ${profile.lastName}
Email: ${profile.email}
Phone: ${profile.phone}
Location: ${profile.location}
Headline: ${profile.headline}
Skills: ${profile.skills}

Experiences:
${profile.experiences.map((exp, i) => `
Experience ${i + 1}:
Company: ${exp.company}
Title: ${exp.title}
Location: ${exp.location}
Dates: ${exp.startDate} - ${exp.endDate}
Responsibilities/Achievements:
${exp.responsibilities}
`).join("\n")}

Education:
${profile.education.map((edu, i) => `
Education ${i + 1}:
School: ${edu.school}
Degree: ${edu.degree}
Field of Study: ${edu.field}
Dates: ${edu.startDate} - ${edu.endDate}
`).join("\n")}

Here is the job description:
${jobApp.jobDescription}

${jobApp.jobTitle ? `Target Job Title: ${jobApp.jobTitle}` : ""}
${jobApp.companyName ? `Target Company: ${jobApp.companyName}` : ""}`;

  console.log("Calling OpenAI for cover letter generation...");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  console.log("OpenAI cover letter response received");
  
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse OpenAI cover letter response:", content);
    parsed = {};
  }
  
  // Validate the response has required field
  if (!parsed.coverLetter) {
    parsed.coverLetter = "Unable to generate cover letter. Please try again.";
  }
  
  return parsed;
}
