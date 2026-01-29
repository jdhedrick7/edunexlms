# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EduNex LMS - A multi-institutional Learning Management System MVP with AI-editable course content.

## Repository Structure

```
edunexlms/
├── web/        # Web application (primary development focus)
├── ios/        # iOS mobile app (future)
├── android/    # Android mobile app (future)
└── spec.md     # Technical specification
```

## Tech Stack (Web)

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Database**: PostgreSQL via Supabase with pgvector for RAG embeddings
- **AI Tutor**: Kimi K2.5 via OpenRouter (262k context, multimodal, tool calling)
- **Embeddings**: OpenAI text-embedding-ada-002
- **Course Editor**: Claude Code on VM harness

## Key Concepts

- **AI-first**: Every student gets a personal AI tutor with access to their course materials
- **Multi-institutional**: Hierarchical data model (Institution -> Courses -> Modules -> Content)
- **AI-editable content**: Courses stored as downloadable folder structures with JSON files for assignments/quizzes
- **Version control**: Course versions tracked with UUIDs, teacher approval workflow for publishing

## Three AI Systems

1. **Student AI Tutor** - Persistent AI tutor per student, grounded in course materials via RAG
2. **Teacher AI Assistant** - Persistent AI assistant per teacher, can trigger course edits
3. **Course Editor Harness** - Claude Code on VM that executes course edits (triggered by teacher assistant)

## User Roles

- Admin (institution-level)
- Teacher (course owner)
- Teacher Assistant (course collaborator)
- Student (course participant)

## Development Commands

```bash
cd web
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
```

---

## CRITICAL Development Rules

### 1. NO FAKE UI

**Every button, link, and interactive element MUST be fully functional.**

- Do NOT add buttons "for aesthetics" without implementing the action
- Do NOT create placeholder click handlers that do nothing
- Do NOT show UI elements for features that don't exist yet
- If a feature isn't ready, don't show its UI at all

```tsx
// BAD - Button does nothing
<Button onClick={() => {}}>Export PDF</Button>

// BAD - Shows "coming soon"
<Button disabled>Export PDF (Coming Soon)</Button>

// GOOD - Either implement it or don't show it
{canExportPdf && <Button onClick={handleExportPdf}>Export PDF</Button>}
```

### 2. COMPLETE FEATURES ONLY

When implementing a feature, complete the FULL vertical slice:

1. Database schema/migrations
2. API endpoint (if needed)
3. Frontend UI
4. Error handling
5. Loading states
6. Success feedback
7. Edge cases

**Do not commit half-implemented features.** If you can't finish it, don't start it.

### 3. PRODUCTION-READY CODE

Every piece of code should be deployable:

- Proper error boundaries and error handling
- Loading states for all async operations
- Input validation (client AND server)
- Proper TypeScript types (no `any`)
- Environment variables for all secrets/config
- No hardcoded URLs, IDs, or credentials
- No `console.log` in production code (use proper logging)

### 4. SCALABILITY FROM DAY ONE

Write code that scales:

- Use pagination for all list endpoints (never return unbounded arrays)
- Use database indexes (defined in spec.md)
- Use connection pooling (Supabase handles this)
- Lazy load components and routes
- Optimize images and assets
- Consider caching strategies early

### 5. CLEAN, REVIEWABLE CODE

Code should be easy to review and maintain:

- Small, focused functions (< 50 lines)
- Small, focused components (< 200 lines)
- Descriptive variable/function names
- Co-locate related code (component + styles + tests)
- One component per file
- Extract shared logic into hooks/utils
- Use early returns to reduce nesting

### 6. ZERO TECH DEBT POLICY

Do it right the first time:

- No TODO comments that ship to main (fix it or create an issue)
- No "temporary" solutions that become permanent
- No copy-paste code (extract and reuse)
- No skipping tests for "speed"
- No ignoring TypeScript errors with `@ts-ignore`
- No disabling ESLint rules without team discussion
- Refactor as you go, not "later"

### 7. ERROR HANDLING

Every operation that can fail must handle failure:

```tsx
// API calls
try {
  const data = await fetchData();
  // handle success
} catch (error) {
  // Log error properly
  // Show user-friendly message
  // Provide recovery action if possible
}

// Forms
// - Validate before submit
// - Show field-level errors
// - Show submission errors
// - Disable submit while loading
```

### 8. CONSISTENT PATTERNS

Follow established patterns in the codebase:

- Use existing components before creating new ones
- Follow the same file structure as similar features
- Use the same data fetching patterns
- Use the same state management approach
- Match existing naming conventions

---

## Code Review Checklist

Before submitting any code:

- [ ] All buttons/links are functional
- [ ] Feature is complete end-to-end
- [ ] Error states are handled
- [ ] Loading states are shown
- [ ] TypeScript has no errors
- [ ] ESLint has no errors
- [ ] No console.logs or debug code
- [ ] No hardcoded values
- [ ] Tested happy path AND error cases
- [ ] Mobile responsive (if applicable)
- [ ] Accessible (keyboard nav, screen readers)
