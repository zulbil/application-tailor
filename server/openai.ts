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

Using both, generate a tailored resume in this exact structure:

1. Impact Logline (Professional Summary)
Create exactly 3 powerful bullets that represent the STRONGEST moments of my career that best match this job description. Each bullet must:
- Highlight a specific career achievement with measurable impact
- Draw from my actual work experience (do not invent achievements)
- Emphasize results using metrics (%, $, time saved, team size, scale, etc.)
- Align closely with what the target job is looking for
- Be concise but compelling (1-2 sentences max)

Example good logline bullets:
- "Led a team of 12 engineers to deliver a $5M e-commerce platform, increasing revenue by 35% in first quarter"
- "Reduced infrastructure costs by 60% through strategic migration to cloud architecture, saving $200K annually"
- "Architected real-time data pipeline processing 10M+ events daily with 99.9% uptime"

2. Tailored Experiences
For EACH experience in my profile, return:
- Company, Title, Location, Dates (unchanged from my profile)
- Exactly 3 bullet points.

CRITICAL REQUIREMENTS FOR EACH BULLET:
- Each bullet MUST be an accomplishment, NOT just a responsibility
- Each bullet MUST include a specific metric or clear impact (%, time saved, speed improvement, reliability increase, money saved/earned, team size led, etc.)
- Each bullet MUST incorporate at least one relevant technology, tool, or concept from the job description when it makes sense (e.g. React, TypeScript, Vue, Python, AWS, design sensibility, CRM, integrations, Agile, etc.)
- Format: "Action verb + what you did + technology/tool used + quantifiable result"
- Example good bullet: "Built a React-based dashboard with TypeScript that reduced customer support tickets by 40% and improved user retention by 25%"
- Example bad bullet: "Responsible for building dashboards" (no metric, no impact, no technology alignment)

3. Technologies from Job Description
A single line: comma-separated list of technologies and tools found in the JD.

4. Relevant Skills for Resume
An array of 8-12 key skills/technologies that should appear on the resume's skills section. These should be:
- Skills from the job description that match what the candidate actually has
- Ordered by relevance to this specific job (most important first)
- A mix of technical skills, tools, and soft skills mentioned in the JD

Requirements:
- Do not invent technologies I don't have; only map what I already have to the JD.
- Do not change my job titles, company names, or dates.
- Keep bullets concise and recruiter-friendly.
- Return ONLY valid JSON with this structure:
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
