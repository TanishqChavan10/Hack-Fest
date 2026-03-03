# Talent Discovery & Intelligent Matching Platform

A **Modular Monolith** built with Next.js 14 that connects candidates with recruiters using a weighted scoring algorithm and semantic search (pgvector via Supabase).

## Team Structure

| Person | Domain | Key Files |
|--------|--------|-----------|
| **A** | DevOps / Auth / Infrastructure | `lib/auth.ts`, `middleware.ts`, `prisma/schema.prisma` |
| **B** | Candidate Profile / GitHub Sync | `app/candidate/`, `lib/github.ts`, `app/api/profile/` |
| **C** | Recruiter / Job Posting | `app/recruiter/`, `app/api/jobs/`, `app/api/recruiter/` |
| **D** | Matching Algorithm / Scoring | `lib/matching.ts`, `app/api/match/`, `components/matching/` |

## Tech Stack

- **Next.js 14** (App Router, Server Actions)
- **TypeScript 5** — strict mode
- **Prisma 7** + **PostgreSQL** (Supabase)
- **pgvector** — semantic candidate search (Phase 2)
- **NextAuth 4** — Credentials + Google OAuth, JWT sessions, RBAC
- **Tailwind CSS 3** + Radix UI — headless component system
- **Recharts** — skill visualization
- **OpenAI** — `text-embedding-3-small` for vector embeddings (Phase 2)
- **Octokit** — GitHub repository scraper (Phase 2)

## Scoring Algorithm

```
score = Σ( clamp(candidateLevel / minLevel, 0, 1.2) × weight ) / Σ(weight) × 100
```

- Mandatory skills: candidate **must** meet minimum level or gets flagged
- Bonus cap: exceeding requirement caps at **1.2x** (20% bonus)
- Category weights: `hardSkill` | `softSkill` | `experience` (recruiter-configurable)

---

## Quick Start

### 1. Clone & install dependencies

```bash
git clone https://github.com/TanishqChavan10/Hack-Fest.git
cd Hack-Fest
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Supabase / PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"   # openssl rand -base64 32

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# OpenAI (Phase 2)
OPENAI_API_KEY=""

# Supabase (Phase 2 - pgvector)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
```

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to your database
npm run db:push

# (Optional) Seed with demo data
npm run db:seed
```

> **Demo accounts after seeding:**
> - Recruiter: `recruiter@demo.com` / `Password123!`
> - Candidate: `candidate@demo.com` / `Password123!`

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
Hack-Fest/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth + register
│   │   ├── jobs/          # CRUD + apply
│   │   ├── match/         # Scoring engine + shortlist
│   │   ├── profile/       # Candidate profile
│   │   ├── recruiter/     # Recruiter-specific queries
│   │   └── search/        # Keyword + semantic search
│   ├── candidate/         # Candidate-facing pages
│   ├── recruiter/         # Recruiter-facing pages
│   ├── login/ register/   # Auth pages
│   └── unauthorized/      # RBAC redirect target
├── components/
│   ├── charts/            # SkillChart, SkillGapChart (Recharts)
│   ├── matching/          # ScoreBar, MatchCard
│   ├── shared/            # AuthProvider, Navbar
│   └── ui/                # Headless component library
├── hooks/
│   └── useMatches.ts      # Match data hook
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── github.ts          # GitHub scraper (Phase 2)
│   ├── matching.ts        # Weighted scoring algorithm ⭐
│   ├── prisma.ts          # DB singleton
│   ├── supabase.ts        # pgvector client (Phase 2)
│   └── utils.ts           # Shared utilities
├── prisma/
│   ├── schema.prisma      # Full DB schema
│   └── seed.ts            # Demo data
├── services/
│   └── openai.ts          # Embeddings (Phase 2)
├── types/
│   └── index.d.ts         # Platform interfaces + NextAuth augmentation
└── middleware.ts           # RBAC route protection
```

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB (no migration history) |
| `npm run db:migrate` | Create a migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed demo data |

## Git Branching Strategy

```
main          ← production-ready releases
develop       ← integration branch
feature/auth  ← Person A: Auth, DevOps
feature/candidate  ← Person B: Candidate profile, GitHub sync
feature/recruiter  ← Person C: Job posting, dashboard
feature/matching   ← Person D: Algorithm, scoring, search
```

## Phase Roadmap

- **Phase 1** ✅ — Core Infrastructure (Auth, Profiles, Jobs, Weighted Scoring)
- **Phase 2** — Intelligence (GitHub scraping, OpenAI embeddings, pgvector semantic search)
- **Phase 3** — Scale (Redis caching, background jobs, real-time notifications, gap analysis)

## pgvector Setup (Phase 2)

Run in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE candidate_embeddings (
  id          TEXT PRIMARY KEY,
  embedding   vector(1536),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON candidate_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RPC: semantic search
CREATE OR REPLACE FUNCTION match_candidates(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count     INT
)
RETURNS TABLE (id TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT id, 1 - (embedding <=> query_embedding) AS similarity
  FROM candidate_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```
