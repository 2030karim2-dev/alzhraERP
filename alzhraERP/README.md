<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18OnkClsDNV-i6feIFmkwL8BBGkuVSMOv

## System Architecture

The Al-Zahra Smart ERP is a multi-layered web application built for stability and scalability:

- **Frontend**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS with a custom design system and desktop-first optimizations.
- **State Management**: Zustand for global state, React Query (TanStack) for server state with IndexedDB persistence.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Security**: Granular Row Level Security (RLS) on all tables, encrypted auth sessions.
- **Performance**: Advanced code splitting, lazy loading, and custom fetch retry logic.

## Deployment

The app is configured for dual deployment on **Vercel** and **Netlify** with proper SPA routing rules.

---

## Run Locally
...
