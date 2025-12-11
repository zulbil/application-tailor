# Apply4Me - Job Application Tailor

A personal job application tool that generates tailored resumes and cover letters using AI. Users manage their professional profile through forms, then input job descriptions to generate customized application materials.

## Features

- **Profile Management**: Add and edit your work experience, education, and skills
- **AI-Powered Resume Generation**: Automatically tailors your resume to match job descriptions
- **Cover Letter Generation**: Creates customized cover letters for each application
- **Multiple Resume Templates**: Choose from Modern, Classic, Minimal, or Creative designs
- **Customization Options**: Adjust colors, fonts, font sizes, and section visibility
- **Inline Editing**: Edit generated content directly in the preview
- **PDF/DOCX Export**: Download your tailored resume in multiple formats
- **Application Tracking**: Dashboard with Kanban-style tracking of your applications

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack React Query for server state
- Tailwind CSS v4 with Shadcn/ui components
- React Hook Form with Zod validation

### Backend
- Node.js with Express
- PostgreSQL with Drizzle ORM
- OpenAI-compatible API for AI generation

## Getting Started

1. Set up your profile with work experience, education, and skills
2. Go to "New Application" and paste a job description
3. Generate your tailored resume and cover letter
4. Customize the design and edit content as needed
5. Export as PDF or DOCX

## Environment Variables

The following environment variables are required:

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session management
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key

## Resume Generation Rules

The AI follows strict rules when tailoring resumes:

1. Extracts key responsibilities from the job description
2. Aligns bullet points to demonstrate you can fulfill those responsibilities
3. Every bullet includes a measurable metric
4. Exactly 3 bullet points per work experience
5. No fabrication - only restyles your existing experience

## License

MIT
