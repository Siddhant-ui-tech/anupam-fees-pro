Anupam Musicals Fee Manager - music academy fee management dashboard

## Design System
- Font: Inter
- Primary: deep black/dark blue (HSL 222 47% 11%)
- Accent: orange (HSL 30 100% 50%)
- Gold: HSL 43 96% 56%
- Success (paid): HSL 142 76% 36%
- Warning (due): HSL 45 93% 47%
- Destructive (overdue): HSL 0 84% 60%
- Light/dark mode with system preference default

## Architecture
- Single admin app, Supabase auth (Lovable Cloud)
- Tables: students, payments, activity_logs (with RLS for authenticated only)
- Service layer: studentService, paymentService, logService in src/services/
- State management: Zustand store in src/store/useAppStore.ts
- Real-time: Supabase subscriptions on students + payments tables
- PWA: vite-plugin-pwa configured, installable
- Bottom nav: Dashboard, Students, Payments, Reports, Settings

## Key Logic
- next_due_date: if today > due_date → due_date + 1mo, else today + 1mo
- Status: paid (today < due), due-soon (≤3 days), due-today, overdue
- Fee collection via modal with amount + payment method
- Activity logs track: fee collected, student added/edited/deleted
- Currency: INR (₹)
