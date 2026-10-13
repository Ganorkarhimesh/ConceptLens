# ConceptLens AI

**Don't just find the wrong answer. Find the reason behind it.**

ConceptLens AI is a smart-education diagnostic prototype that analyzes the reasoning behind a student's incorrect mathematics answer, identifies a likely misconception and prerequisite gap, then guides the student through focused recovery and reassessment.

> Built for the Digital Campus on Google Cloud Hack Sprint — Ramdeobaba University.

## Problem

Traditional assessments report whether an answer is right or wrong. They rarely explain why a student made a mistake or identify which prerequisite concept needs attention. Teachers must make that diagnosis manually across an entire class.

## Solution and USP

ConceptLens is not a general chatbot, notes summarizer, LMS, or quiz generator. Its core workflow is:

**Misconception → Root cause → Prerequisite gap → Recovery → Reassessment → Mastery update**

Traditional assessment:

```text
Question → Wrong answer → Correct answer
```

ConceptLens:

```text
Question → Student answer → Detect misconception → Find root cause
         → Repair prerequisite → Targeted practice → Reassess → Update mastery
```

## Core workflow

1. Complete a five-question mathematics diagnostic covering fractions, LCM, algebra, percentages, and basic arithmetic.
2. FastAPI analyzes each response using deterministic answer-pattern rules in Demo Mode.
3. Review the detected misconception, root cause, prerequisite gap, explanation, worked example, and mastery score.
4. Use personalized recovery content. The fraction lesson is available in English, Hindi, and Marathi.
5. Answer a new fraction-addition question. A correct response updates mastery from 35% to 68%; an incorrect response suggests another approach.
6. Review concept mastery and class-level intervention analytics on the student and teacher dashboards.

## Features

- Product landing page that explains the difference between correctness and understanding.
- Student dashboard with overall mastery, five concept scores, learning progress, and recovery recommendation.
- Backend-driven diagnostic with five misconception-sensitive questions.
- Root-cause analysis for common wrong-answer patterns in every demo question.
- Three-language fraction recovery lesson, worked example, learning tip, and practice prompts.
- Backend-processed reassessment with persisted mastery updates and repeat-submission protection.
- Teacher dashboard with ten sample students, class concept weaknesses, intervention statuses, and teaching insight.
- One generated OpenAPI client contract between the JavaScript frontend and Python backend.
- JSON data service for local use and a Firestore adapter behind the same data-service interface.
- Vertex AI Gemini adapter behind the same analysis-service interface; no cloud credentials are needed in Demo Mode.
- Backend Docker image and API tests.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, JavaScript, Tailwind CSS, Recharts |
| Backend | Python, FastAPI, Pydantic |
| Demo analysis | Deterministic local misconception rules |
| Tomorrow-ready analysis | Gemini through Vertex AI |
| Local persistence | Atomic JSON data service |
| Tomorrow-ready persistence | Firestore data-service adapter |
| Container | Docker |

## Architecture

```text
React + Vite
    │  OpenAPI-generated client, same-origin /api in Replit preview
    ▼
FastAPI + Pydantic
    ├── AnalysisService
    │     ├── DemoAnalysisService (DEMO_MODE=true)
    │     └── GeminiAnalysisService (Vertex AI; opt-in)
    └── DataService
          ├── LocalDataService (JSON; default)
          └── FirestoreDataService (opt-in)
```

The browser uses the same response models in both analysis modes. The frontend does not know which analysis or data adapter produced a result.

## Run in the Replit project

The project has separate managed workflows for the React app and FastAPI API. Start both workflows to use the live preview. The preview sends `/api` requests through the existing API path; no Google credentials are needed.

## Local setup

Requirements: Node.js 20+, pnpm, Python 3.11+, and optionally Docker.

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
set -a && . ./.env && set +a
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend health checks are `GET http://localhost:8000/api/health` and `GET http://localhost:8000/api/healthz`.

### Frontend

In a second terminal, from the repository root:

```bash
cp artifacts/conceptlens-ai/.env.example artifacts/conceptlens-ai/.env
pnpm --filter @workspace/conceptlens-ai run dev
```

For a standalone local Vite process, provide its required runtime settings:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/conceptlens-ai run dev
```

The frontend environment variable `VITE_API_BASE_URL` defaults to `/api` in the Replit preview. Set it to `http://localhost:8000` when using the direct local backend.

## Environment

Backend variables are documented in `backend/.env.example`:

- `DEMO_MODE=true` uses the offline deterministic engine.
- `DATA_BACKEND=local` uses persistent local JSON.
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, and `GEMINI_MODEL` are reserved for Vertex AI.
- `FRONTEND_URL` controls the local frontend CORS origin.
- `CONCEPTLENS_DATA_FILE` can select another local state file.

The frontend variable is in `artifacts/conceptlens-ai/.env.example`. Real `.env` files and local state are ignored by Git.

## API endpoints

All API routes are under `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` and `/healthz` | Health checks |
| GET | `/questions` | Load the five diagnostic questions |
| POST | `/assessments` | Analyze all five submitted answers |
| GET | `/assessments/{assessment_id}` | Load the stored analysis |
| GET | `/assessments/{assessment_id}/recovery/{language}` | Retrieve recovery in English, Hindi, or Marathi |
| POST | `/assessments/{assessment_id}/reassess` | Check a new targeted question and update mastery |
| GET | `/student-dashboard` | Student progress and recommended recovery |
| GET | `/teacher-dashboard` | Class analytics and intervention list |

Interactive request and response schemas are served from FastAPI's `/docs` endpoint.

## Demo mode and main judging flow

Demo Mode is enabled by default and requires no AI credentials or internet model call:

1. Open the landing page and start the diagnostic assessment.
2. Submit `2/5` for `1/2 + 1/3`.
3. The API returns **Direct numerator and denominator addition**, the root cause **Student is applying whole-number addition logic to fractions.**, the prerequisite **LCM / Common Denominators**, and mastery **35%**.
4. Choose a recovery language and review the equivalent-fraction worked example.
5. Reassess with `2/5 + 1/10 = 1/2`.
6. The API verifies the answer and persists the mastery change **35% → 68%**.
7. Open the teacher dashboard to view class weaknesses and student intervention data.

## Testing

Run the backend tests:

```bash
cd backend
python -m unittest discover -s tests -v
```

Run TypeScript/API-client and artifact checks from the repository root:

```bash
pnpm run typecheck
pnpm --filter @workspace/conceptlens-ai run build
```

## Docker

Build and run the FastAPI backend locally:

```bash
cd backend
docker build -t conceptlens-ai-backend .
docker run --rm -p 8000:8000 -e DEMO_MODE=true conceptlens-ai-backend
```

In another terminal, verify it:

```bash
curl http://localhost:8000/api/health
```

The image exposes port 8000 and starts in Demo Mode by default.

## Google Cloud work planned for tomorrow

No Google Cloud deployment or live cloud configuration is part of today's build.

- **Vertex AI / Gemini:** set `DEMO_MODE=false`, configure project, location, model, and Application Default Credentials; `GeminiAnalysisService` already follows the same `AnalysisResult` interface.
- **Firestore:** set `DATA_BACKEND=firestore` and provide the project's credentials; `FirestoreDataService` implements the same persistence contract.
- **Cloud Run:** deploy the backend Docker image tomorrow after cloud project configuration and production readiness checks.
- Keep `DEMO_MODE=true` available as an offline emergency backup.

## Future scope

- Populate and validate a production Firestore project and apply data-retention/access rules.
- Connect and evaluate Vertex AI Gemini with student-safe structured outputs.
- Add teacher-created assignments, broader subjects, and per-class reassessment cohorts.
- Add authentication only after the hackathon prototype workflow is validated.

## Team

Five-member student team — names and roles to be added.
