# Apply4Me - Job Application Tailor

## Overview

Apply4Me is a personal job application tool that generates tailored resumes and cover letters using AI. Users manage their professional profile (work experience, education, skills) through forms, then input job descriptions to generate customized application materials. The app uses OpenAI-compatible APIs via Replit's AI Integrations to rewrite and tailor content for specific job opportunities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite with custom plugins for Replit environment

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful JSON API under `/api/*` routes
- **AI Integration**: OpenAI-compatible API via Replit's AI Integrations service (no separate API key needed)
- **Build**: ESBuild for production bundling with dependency allowlisting for cold start optimization

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines all tables
- **Tables**: profiles, experiences, education, job_applications, weekly_challenges
- **Migrations**: Drizzle Kit with `db:push` for schema sync

### Key Design Patterns
- **Shared Types**: Schema and types in `shared/` directory accessible to both client and server
- **Path Aliases**: `@/` for client source, `@shared/` for shared code
- **Single User Model**: No authentication - designed for personal use with one profile
- **Form-Based Data Entry**: All profile data managed through UI forms, not raw JSON editing

## External Dependencies

### AI Services
- **Replit AI Integrations**: Provides OpenAI-compatible API access through environment variables `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`

### Database
- **PostgreSQL**: Connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### UI Libraries
- **Radix UI**: Accessible component primitives (dialog, select, tabs, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **date-fns**: Date formatting utilities

### Development Tools
- **Vite Plugins**: Runtime error overlay, Replit-specific dev tools (cartographer, dev banner)
- **Custom Plugin**: `vite-plugin-meta-images` for OpenGraph image handling in Replit deployments