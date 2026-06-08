# NEET Mock Platform

Laptop-first NEET-style mock test platform built with Next.js, Prisma, Postgres, and cloud object storage for uploaded question assets.

## Features

- Admin uploads for text questions through JSON.
- Admin uploads for image questions through ZIP files with `q<number>_<answer>.png` naming.
- PDF page conversion to image questions with optional answer key input.
- Question metadata by subject, chapter, type, and correct answer.
- Test builder for official NEET pattern or custom practice tests.
- Student exam interface with question palette, timer, autosave, mark for review, and manual submission.
- Result dashboard with total marks, accuracy, subject-wise score, and question-wise analysis.

## Stack

- Next.js 16 with App Router and TypeScript
- Prisma ORM with Postgres
- Tailwind CSS v4
- Supabase Storage for uploaded PDFs and image-question assets in production

## Run

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Environment

Create a `.env` file for local development:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
SUPABASE_STORAGE_BUCKET="questions"
ADMIN_SESSION_SECRET="replace-with-a-long-random-secret"
STUDENT_SESSION_SECRET="replace-with-a-long-random-secret"

# Optional fallback locally if you still want Blob support.
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

Storage resolution order:

1. Supabase Storage when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
2. Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.
3. Local `public/uploads` fallback when neither cloud storage provider is configured.

Create a public Supabase bucket named `questions` before uploading files.

## Upload Formats

### JSON text questions

```json
[
  {
    "subject": "PHYSICS",
    "chapter": "Kinematics",
    "prompt": "A sample text question",
    "options": [
      { "key": "A", "text": "Option A" },
      { "key": "B", "text": "Option B" },
      { "key": "C", "text": "Option C" },
      { "key": "D", "text": "Option D" }
    ],
    "correctAnswer": "B"
  }
]
```

### ZIP image questions

- Use filenames like `q12_B.png`.
- For multiple-correct image questions, use `q12_A_C.png` or `q12_A-C.png`.

### PDF upload

- Each PDF page is converted into one stored image question.
- Provide an optional comma-separated answer key if you want answers stored automatically.

## Notes

- NEET-pattern tests display 200 questions and evaluate only 180.
- In Section B, the first 10 answered questions per subject are evaluated.
- The demo seed creates a full NEET mock and a smaller biology drill.

## Supabase Storage Setup

1. Open your Supabase project.
2. Go to Storage.
3. Create a public bucket named `questions`.
4. Copy your project URL from Settings > API into `NEXT_PUBLIC_SUPABASE_URL`.
5. Copy your service role key from Settings > API into `SUPABASE_SERVICE_ROLE_KEY`.

Uploaded image questions and test-series PDFs will be stored in Supabase Storage, while Prisma keeps only the public URLs and metadata in Postgres.

## Deploy To Vercel

This project is safe to deploy fully on Vercel, but production uploads must use Supabase Storage or Vercel Blob because the Vercel filesystem is ephemeral.

### Step 1: Prepare Supabase for production

1. Open your Supabase project.
2. Create a public storage bucket named `questions`.
3. Copy the project URL.
4. Copy the service role key.
5. Copy both database connection strings:
  - pooled connection for runtime `DATABASE_URL`
  - direct connection for `DIRECT_URL`

Use this pattern:

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

Do not use the direct `:5432` URL as your runtime `DATABASE_URL` on Vercel.

### Step 2: Import the repo into Vercel

1. Go to Vercel.
2. Click `Add New Project`.
3. Import `Satyamsingh705/NeetPrep`.
4. Framework preset should be detected as `Next.js`.
5. Leave the root directory as the repository root.
6. Leave the build command as default, or set it to `npm run build`.
7. Leave the output directory empty.

### Step 3: Add environment variables in Vercel

Add these variables in Project Settings -> Environment Variables:

```bash
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=questions
ADMIN_SESSION_SECRET=
STUDENT_SESSION_SECRET=
```

Use long random values for both session secrets.

You can copy the exact variable names from [.env.example](/Users/satyamkumar/Desktop/Website/.env.example).

### Step 4: Deploy

1. Trigger the first deployment from Vercel.
2. Wait for the build to finish.
3. If the build succeeds, open the deployed URL.

### Step 5: Run the database schema once

After the project is deployed, run this locally against production once:

```bash
npx prisma db push
```

If you want demo data in production, then run:

```bash
npm run db:seed
```

Make sure your local shell is pointed at the same production `DATABASE_URL` and `DIRECT_URL` before doing this.

### Step 6: Verify the critical flows

Test these flows in production in this order:

1. Student login
2. Start a test
3. Save answers during an attempt
4. Submit a test
5. Open result page
6. Admin login
7. JSON upload
8. ZIP upload
9. PDF upload

### Notes for this project on Vercel

1. Student routes should feel fine if Vercel and Supabase are in nearby regions.
2. Admin ZIP/PDF uploads can be slower because they do server-side processing.
3. The heavy upload routes in this repo are pinned to Node.js runtime with a longer function duration to reduce deployment-time surprises.
4. If PDF uploads become too slow on your Vercel plan, move only that processing to a separate worker later.

This codebase keeps local file uploads as a fallback for development only. Production uploads require Supabase Storage or Vercel Blob because server file systems are ephemeral.