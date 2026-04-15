# Habit Tracker (React + Tailwind)

A modern, responsive habit-tracking web app with:

- Add/remove daily habits
- Intensity tracking (0-5) per day (instead of binary yes/no)
- Weekly calendar with green/red indicators
- Streak tracking
- Badge milestones (7-day, 30-day, 100-day)
- Gamification with points per habit + total score
- Browser `localStorage` persistence
- No backend required

## Local development

```bash
npm install
npm run dev
```

The dev server runs on:

- `http://localhost:3000`

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to Vercel

This repo is ready for Vercel as a static Vite app.

1. Push to GitHub.
2. In Vercel, choose **New Project** and import this repository.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build`
5. Output directory: `dist`

No environment variables are required.
