# SkillBridge AI

SkillBridge AI is a platform for student onboarding, AI career guidance, skill proof submission, and recruiter discovery.

## Stack

- `frontend/`: Next.js 16 + React 19
- `backend/`: Express 5 + Mongoose
- MongoDB Atlas
- JWT authentication
- OpenAI API with fallback mock output for local demos

## Setup

1. Install dependencies

   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. Add real values to `backend/.env`

   ```env
   PORT=5000
   MONGODB_URI=your-mongodb-uri
   JWT_SECRET=your-jwt-secret
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-5.4-mini
   CLIENT_URL=http://localhost:3000
   ```

3. Add the frontend API URL

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Seed demo data

   ```bash
   npm run seed --prefix backend
   ```

5. Start the backend

   ```bash
   npm run dev --prefix backend
   ```

6. Start the frontend

   ```bash
   npm run dev --prefix frontend
   ```

7. Open `http://localhost:3000`

## Demo accounts

- Recruiter: `recruiter@skillbridge.ai` / `Recruiter123!`
- Recruiter: `arjun@skillbridge.ai` / `Recruiter123!`
- Student: `maya@skillbridge.ai` / `Student123!`
- Student: `ravi@skillbridge.ai` / `Student123!`
- Student: `aisha@skillbridge.ai` / `Student123!`

## Project tree

```text
SkillBridge AI/
├── backend/
│   ├── scripts/
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── compare/
│   │   ├── interview/
│   │   ├── onboarding/
│   │   ├── recruiter/
│   │   ├── tasks/
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── components/
│   ├── lib/
│   ├── .env.local.example
│   └── package.json
└── README.md
```

## Folder roles

- `backend/src/config`: environment loading and MongoDB connection setup
- `backend/src/controllers`: request handlers for auth, onboarding, roadmap generation, task submission, and recruiter listing
- `backend/src/middleware`: JWT auth and role protection
- `backend/src/models`: Mongoose schemas for users, student profiles, task submissions, job postings, matches, and roadmaps
- `backend/src/routes`: clean route-to-controller mapping
- `backend/src/services`: AI integrations and fallback mock logic
- `backend/src/utils`: shared helpers for JWT, profile calculations, and response formatting
- `backend/scripts`: seed data for demo users, profiles, matches, and jobs
- `frontend/app`: route-based Next.js pages
- `frontend/components`: reusable UI and page clients
- `frontend/lib`: API helpers for backend communication

## Implemented modules

- Home page
- Student onboarding page
- Student dashboard
- Task submission page
- Resume vs skill comparison page
- AI mock interview page
- Recruiter dashboard
- Auth APIs
- Student profile APIs
- Roadmap generation API
- Skill task submission API
- Resume comparison API
- Mock interview API
- Recruiter candidate listing API
- Transparent fit scoring for sample job roles

## Seed note

Run the seed script anytime you want to reset the demo data locally:

```bash
npm run seed --prefix backend
```

This recreates:

- 3 student profiles
- 3 skill assessment results
- 2 recruiter accounts
- 2 sample job postings
- 3 candidate-job fit scores

## Notes

- `OPENAI_API_KEY` is optional for local demos. If missing, roadmap and task evaluation fall back to deterministic mock responses.
- The app keeps auth in local storage for MVP simplicity.
