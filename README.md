# Serenio

A personal wellness and life-tracking web app built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Expense Tracking** — Log and categorize your spending
- **Food Logs** — Track meals, calories, and nutrition by day
- **Sleep Logs** — Record bedtime, wake time, and sleep quality
- **Journal** — Write daily journal entries with mood tracking
- **Authentication** — Secure sign-up/login with Supabase Auth; all data is private per user

## Tech Stack

- [Next.js 16](https://nextjs.org) — React framework
- [Supabase](https://supabase.com) — Database, auth, and row-level security
- [Tailwind CSS v4](https://tailwindcss.com) — Styling
- [TypeScript](https://www.typescriptlang.org) — Type safety

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the database schema in your Supabase SQL editor:

```bash
# Copy and run the contents of supabase-schema.sql in the Supabase dashboard
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses four tables, all protected by Row Level Security (RLS):

| Table | Description |
|---|---|
| `expenses` | Amount, category, description, date |
| `food_logs` | Meal type, description, calories, date |
| `sleep_logs` | Bedtime, wake time, quality (1–5), notes |
| `journal_entries` | Title, content, mood, date |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```
