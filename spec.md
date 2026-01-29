# EduNex LMS - Technical Specification

## Overview

EduNex is an AI-first Learning Management System. Every student gets a personal AI tutor with full access to their course materials. Teachers control content through AI-editable file structures with version control.

**Two AI Systems:**
1. **Student Tutors** - Conversational AI grounded in course materials (student-facing)
2. **Course Editor** - AI agents that modify course content (teacher-facing, runs on VM)

---

## Core Architecture

### Data Hierarchy

```
Institution
└── Course
    └── CourseVersion (UUID-based snapshots)
        └── Module (folder)
            ├── assignment.json
            ├── quiz.json
            ├── content.md
            └── resources/
                └── files...
```

### Design Principles

1. **File-first content**: All course content stored as files (JSON, Markdown, assets)
2. **AI-editable**: Structured formats that AI agents can parse, modify, and regenerate
3. **Version snapshots**: Every edit creates a new version, allowing rewind/rollback
4. **Approval workflow**: Teachers approve versions before they're visible to students

---

## Database Schema (Supabase/PostgreSQL)

### Complete Schema

```sql
-- ============================================
-- CORE TABLES
-- ============================================

-- Institutions (multi-tenant root)
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Institution membership (user belongs to institution with role)
CREATE TABLE institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'ta', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, institution_id)
);

-- ============================================
-- COURSES
-- ============================================

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,                    -- e.g., "CS101"
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',           -- includes tutor config
  published_version_id UUID,             -- currently visible to students
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(institution_id, code)
);

-- Course versions (snapshots)
CREATE TABLE course_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,            -- path in bucket: courses/{course_id}/material/{version_id}
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,                            -- change notes / AI prompt used
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_id, version_number)
);

-- Add FK after course_versions exists
ALTER TABLE courses
  ADD CONSTRAINT fk_published_version
  FOREIGN KEY (published_version_id) REFERENCES course_versions(id);

-- Course enrollments
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'ta', 'student')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, course_id)
);

-- ============================================
-- SUBMISSIONS & GRADES
-- ============================================

-- Assignment submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assignment_path TEXT NOT NULL,         -- e.g., "modules/02-intro/assignment.json"
  storage_path TEXT NOT NULL,            -- path in bucket to submission files
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),

  UNIQUE(course_id, user_id, assignment_path)
);

-- Grades
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assignment_path TEXT NOT NULL,
  points_earned DECIMAL(10,2),
  points_possible DECIMAL(10,2) NOT NULL,
  graded_by UUID REFERENCES users(id),
  feedback TEXT,
  rubric_scores JSONB,                   -- per-criteria scores
  graded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_id, user_id, assignment_path)
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quiz_path TEXT NOT NULL,               -- e.g., "modules/02-intro/quiz.json"
  attempt_number INTEGER NOT NULL,
  answers JSONB NOT NULL,                -- student's answers
  score DECIMAL(10,2),
  max_score DECIMAL(10,2),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,

  UNIQUE(course_id, user_id, quiz_path, attempt_number)
);

-- ============================================
-- AI TUTORS (STUDENTS)
-- ============================================

-- One tutor per student (persists across courses/quarters)
CREATE TABLE student_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agent_md_path TEXT NOT NULL,           -- path to agent.md in storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutor conversation messages
CREATE TABLE tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES student_tutors(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,  -- optional course context
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,                      -- if assistant made tool calls
  tool_results JSONB,                    -- results from tool calls
  context_files TEXT[],                  -- files retrieved for this response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI ASSISTANTS (TEACHERS)
-- ============================================

-- One assistant per teacher
CREATE TABLE teacher_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agent_md_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher assistant messages
CREATE TABLE teacher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID REFERENCES teacher_assistants(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI EDIT JOBS (VM HARNESS)
-- ============================================

CREATE TABLE course_edit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  source_version_id UUID REFERENCES course_versions(id) NOT NULL,
  result_version_id UUID REFERENCES course_versions(id),
  prompt TEXT NOT NULL,
  scope TEXT DEFAULT 'course' CHECK (scope IN ('module', 'course')),
  module_path TEXT,                      -- if scope is 'module'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- EMBEDDINGS (RAG)
-- ============================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Course material embeddings
CREATE TABLE course_material_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  version_id UUID REFERENCES course_versions(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,       -- OpenAI ada-002
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(version_id, file_path, chunk_index)
);

-- Student context embeddings (uploads, generated files)
CREATE TABLE student_context_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, file_path, chunk_index)
);

-- Teacher context embeddings
CREATE TABLE teacher_context_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, file_path, chunk_index)
);

-- Vector similarity indexes
CREATE INDEX idx_course_embeddings ON course_material_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_student_embeddings ON student_context_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_teacher_embeddings ON teacher_context_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                    -- 'grade', 'submission', 'announcement', 'message', 'edit_complete', etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',               -- type-specific payload (link, ids, etc.)
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG (AUDIT TRAIL)
-- ============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- who performed action
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                  -- 'course.created', 'version.approved', 'grade.submitted', etc.
  target_type TEXT,                      -- 'course', 'user', 'submission', etc.
  target_id UUID,                        -- ID of affected entity
  metadata JSONB DEFAULT '{}',           -- action-specific details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS (COURSE-WIDE BROADCAST)
-- ============================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',        -- [{name, path, type}]
  pinned BOOLEAN DEFAULT FALSE,
  publish_at TIMESTAMPTZ DEFAULT NOW(),  -- scheduled publishing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track who has read announcements
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(announcement_id, user_id)
);

-- ============================================
-- MESSAGING (COURSE-TIED)
-- ============================================

-- Conversations (1:1 or group, tied to course)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT,                            -- optional, for group chats
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()   -- bumped on new message
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  last_read_at TIMESTAMPTZ,              -- for unread tracking
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',        -- [{name, path, type}]
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,                -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_institution_members_user ON institution_members(user_id);
CREATE INDEX idx_institution_members_inst ON institution_members(institution_id);
CREATE INDEX idx_courses_institution ON courses(institution_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_course ON submissions(course_id);
CREATE INDEX idx_tutor_messages_tutor ON tutor_messages(tutor_id);
CREATE INDEX idx_tutor_messages_created ON tutor_messages(created_at DESC);
CREATE INDEX idx_teacher_messages_assistant ON teacher_messages(assistant_id);
CREATE INDEX idx_edit_jobs_status ON course_edit_jobs(status);
CREATE INDEX idx_edit_jobs_course ON course_edit_jobs(course_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Activity log
CREATE INDEX idx_activity_institution ON activity_log(institution_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_course ON activity_log(course_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- Announcements
CREATE INDEX idx_announcements_course ON announcements(course_id);
CREATE INDEX idx_announcements_published ON announcements(course_id, publish_at DESC)
  WHERE publish_at <= NOW();
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);

-- Messaging
CREATE INDEX idx_conversations_course ON conversations(course_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

---

## File Storage Structure (Supabase Storage)

One bucket per institution for complete data isolation:

```
Bucket: inst-{institution_id}
│
├── courses/
│   └── {course_id}/
│       ├── course.json                    # Course metadata
│       │
│       ├── material/                      # Versioned course content
│       │   └── {version_uuid}/
│       │       └── modules/
│       │           ├── 01-introduction/
│       │           │   ├── module.json
│       │           │   ├── content.md
│       │           │   └── resources/
│       │           │       └── image.png
│       │           └── 02-fundamentals/
│       │               ├── module.json
│       │               ├── content.md
│       │               ├── assignment.json
│       │               └── quiz.json
│       │
│       └── submissions/                   # Student submissions
│           └── {user_id}/
│               └── {assignment_id}/
│                   ├── submission.json
│                   └── files/
│                       └── ...
│
├── teachers/
│   └── {user_id}/
│       ├── agent.md                       # AI assistant memory
│       ├── uploads/                       # Resources, templates
│       └── generated/                     # Reports, drafts
│
└── students/
    └── {user_id}/
        ├── agent.md                       # AI tutor memory
        ├── uploads/                       # Student files
        └── generated/                     # AI generated content
```

Bucket naming: `inst-{institution_id}` (e.g., `inst-abc123`)

### File Formats

**course.json**
```json
{
  "name": "Introduction to Computer Science",
  "code": "CS101",
  "description": "...",
  "settings": {
    "allowLateSubmissions": true,
    "defaultDueDays": 7
  }
}
```

**module.json**
```json
{
  "title": "Getting Started",
  "order": 1,
  "published": true,
  "unlockDate": null,
  "prerequisites": []
}
```

**assignment.json**
```json
{
  "type": "assignment",
  "title": "Hello World Program",
  "instructions": "Write a program that prints 'Hello, World!'",
  "points": 100,
  "dueDate": null,
  "submissionTypes": ["text", "file"],
  "rubric": [
    { "criteria": "Correct output", "points": 50 },
    { "criteria": "Code style", "points": 50 }
  ]
}
```

**quiz.json**
```json
{
  "type": "quiz",
  "title": "Module 1 Quiz",
  "timeLimit": 30,
  "attempts": 2,
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What does CPU stand for?",
      "options": ["Central Processing Unit", "..."],
      "correctIndex": 0,
      "points": 10
    },
    {
      "type": "short_answer",
      "question": "Explain what an algorithm is.",
      "points": 20
    }
  ]
}
```

---

## AI Workflow

### Download Course for Editing

1. AI agent requests course download via API
2. System packages current version as ZIP
3. AI extracts and processes files
4. AI modifies JSON/Markdown files based on teacher prompt
5. AI creates new ZIP with changes

### Upload Modified Course

1. AI uploads ZIP to staging endpoint
2. System extracts to new version UUID
3. System validates file structure and JSON schemas
4. Creates new `course_versions` record with status='draft'
5. Teacher reviews diff and approves/rejects

### Version Control Flow

```
draft → review → approved → (becomes published_version_id)
                    ↓
               archived (previous version)
```

---

## API Endpoints (Supabase Edge Functions)

### Course Management

```
GET    /api/courses                     # List courses (filtered by user access)
GET    /api/courses/:id                 # Get course with current published version
GET    /api/courses/:id/versions        # List all versions
GET    /api/courses/:id/versions/:vid   # Get specific version details

POST   /api/courses                     # Create course
POST   /api/courses/:id/versions        # Create new version (upload)
PATCH  /api/courses/:id/versions/:vid   # Update version status (approve/reject)
PATCH  /api/courses/:id/publish/:vid    # Set published version

GET    /api/courses/:id/download        # Download version as ZIP
GET    /api/courses/:id/download/:vid   # Download specific version as ZIP
```

### User Management

```
GET    /api/users/me                    # Current user profile + roles
GET    /api/institutions/:id/users      # List institution users (admin only)
POST   /api/institutions/:id/users      # Invite user to institution
```

---

## User Roles & Permissions

| Action | Admin | Teacher | TA | Student |
|--------|-------|---------|-----|---------|
| Create institution | - | - | - | - |
| Manage institution users | ✓ | - | - | - |
| Create course | ✓ | ✓ | - | - |
| Edit course content | - | ✓ (own) | ✓ (assigned) | - |
| Approve versions | - | ✓ (own) | - | - |
| View published content | ✓ | ✓ | ✓ | ✓ (enrolled) |
| View draft versions | - | ✓ (own) | ✓ (assigned) | - |
| Download course | - | ✓ (own) | ✓ (assigned) | - |
| Grade submissions | - | ✓ | ✓ | - |
| Submit assignments | - | - | - | ✓ |
| **Use AI Tutor** | - | - | - | ✓ (enrolled) |
| **Use AI Assistant** | - | ✓ | ✓ | - |
| Configure AI Tutor | - | ✓ (own) | - | - |
| Trigger course edits | - | ✓ (own) | - | - |
| View tutor analytics | - | ✓ (own) | ✓ (assigned) | - |

---

## Frontend Structure (Web)

```
web/
├── src/
│   ├── app/                    # Next.js app router (or similar)
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Main app
│   │   │   ├── courses/
│   │   │   ├── admin/
│   │   │   └── settings/
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Base components
│   │   ├── course/            # Course-specific components
│   │   └── editor/            # Content editors
│   ├── lib/
│   │   ├── supabase/          # Supabase client
│   │   ├── hooks/             # React hooks
│   │   └── utils/             # Utilities
│   └── types/                 # TypeScript types
├── public/
└── package.json
```

---

## Tech Stack Decisions

- **Frontend**: Next.js 14+ (App Router)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase PostgreSQL + pgvector
- **Storage**: Supabase Storage (one bucket per institution: `inst-{id}`)
- **AI Tutor**: Kimi K2.5 via OpenRouter (262k context, multimodal, tool calling)
- **Embeddings**: OpenAI text-embedding-ada-002
- **Course Editor**: Claude Code on VM harness

---

## Student AI Tutor

Each student gets ONE persistent AI tutor that follows them across all courses and quarters. The tutor maintains memory, can search through all accessible materials, and spawn subagents for complex tasks.

### AI Model

**Kimi K2.5** via OpenRouter (`moonshotai/kimi-k2.5`)
- 262k token context window
- Native multimodal (text + images)
- Tool calling / agentic capabilities
- Reasoning mode support

**Embeddings**: OpenAI text-embedding-ada-002 for RAG

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Student Chat   │────▶│   Tutor API      │────▶│   OpenRouter    │
│   Interface     │     │  (Edge Function) │     │   (Kimi K2.5)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌──────────────────┐
                        │  RAG Search      │     │   Subagents      │
                        │  (pgvector)      │     │  (tool calls)    │
                        └──────────────────┘     └──────────────────┘
```

### Persistent Tutor Memory

Each student has a personal `agent.md` file that's ALWAYS loaded into context:

```
inst-{institution_id}/students/{user_id}/agent.md
```

The AI maintains this file with:
- Key facts about the student (learning style, strengths, struggles)
- Current courses and what they're working on
- Summaries of important past conversations
- Notes on patterns (what explanations work, what doesn't)
- Current goals and progress

After significant interactions, the AI updates agent.md to persist learnings.

### Tutor Capabilities

**Always in context:**
- `agent.md` (persistent memory)
- Current conversation history
- List of enrolled courses and accessible modules

**Searchable via RAG:**
- All published course materials (all enrolled courses)
- Student's uploaded files
- AI-generated documents

**Via subagent tool calls:**
- Deep search through specific course materials
- Analyze uploaded images/documents
- Generate PDFs, study guides, summaries
- Search across conversation history

### Subagent Tools

The tutor can invoke these tools via Kimi K2.5's tool calling:

```typescript
const tutorTools = [
  {
    name: "search_course_materials",
    description: "Search through course materials using semantic search",
    parameters: {
      query: "string - what to search for",
      course_id: "string? - limit to specific course",
      file_types: "string[]? - filter by type (content, assignment, quiz)"
    }
  },
  {
    name: "search_student_files",
    description: "Search through student's uploaded and generated files",
    parameters: {
      query: "string - what to search for"
    }
  },
  {
    name: "read_file",
    description: "Read full contents of a specific file",
    parameters: {
      file_path: "string - path to file in storage"
    }
  },
  {
    name: "generate_document",
    description: "Generate a study guide, summary, or notes as PDF/MD",
    parameters: {
      type: "'study_guide' | 'summary' | 'notes' | 'practice_problems'",
      topic: "string - what to cover",
      format: "'pdf' | 'markdown'"
    }
  },
  {
    name: "update_memory",
    description: "Update agent.md with new learnings about the student",
    parameters: {
      additions: "string - what to add/update in agent.md"
    }
  },
  {
    name: "analyze_image",
    description: "Analyze an image the student uploaded or shared",
    parameters: {
      image_path: "string - path to image"
    }
  }
]
```

### Teacher Controls

Teachers can configure tutor behavior per course:

```json
{
  "tutor": {
    "enabled": true,
    "personality": "encouraging and socratic",
    "restrictions": {
      "revealQuizAnswers": false,
      "solveAssignments": false,
      "hintLevel": "guide"
    },
    "customInstructions": "Always encourage students to try first..."
  }
}
```

### API Endpoints

```
POST   /api/tutor/chat                # Send message, get streaming response
GET    /api/tutor/history             # Get conversation history
GET    /api/tutor/history/:courseId   # Get history filtered by course
POST   /api/tutor/upload              # Upload file to student context
GET    /api/tutor/files               # List student's files
DELETE /api/tutor/files/:path         # Delete a file
```

---

## Teacher AI Assistant

Each teacher gets a persistent AI assistant that helps manage courses, answer questions about students, and trigger course edits via the VM harness.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Teacher Chat   │────▶│  Assistant API   │────▶│   OpenRouter    │
│   Interface     │     │  (Edge Function) │     │   (Kimi K2.5)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌──────────────────┐
                        │  Course Data     │     │   VM Harness     │
                        │  + Student Data  │     │  (course edits)  │
                        └──────────────────┘     └──────────────────┘
```

### Persistent Memory

Teachers also get an `agent.md` in their context:

```
inst-{institution_id}/teachers/{user_id}/agent.md
```

Contains:
- Teaching preferences and style
- Notes about each course
- Patterns noticed across students
- Pending tasks and reminders
- Past edit requests and outcomes

### Teacher Assistant Capabilities

**Always in context:**
- `agent.md` (persistent memory)
- List of courses they teach (with status, enrollment counts)
- Recent activity summary

**Searchable via RAG:**
- All course materials (including drafts)
- Student submissions and grades
- Tutor conversation analytics (what are students asking?)
- Their own uploaded resources

**Via tool calls:**
- Search course materials
- View student progress/grades
- Analyze class-wide patterns
- **Trigger course edit** (sends to VM harness)
- Generate reports (grade distribution, engagement)
- Draft announcements/emails

### Course Edit Integration

When teacher requests a course change, the assistant:

1. Confirms the edit request with teacher
2. Creates `course_edit_jobs` record with prompt
3. Notifies teacher the job is queued
4. (VM harness picks up and processes)
5. When complete, notifies teacher to review

```typescript
const teacherTools = [
  // ... search, analyze tools ...
  {
    name: "request_course_edit",
    description: "Request AI to edit course content. Creates a job for the VM harness.",
    parameters: {
      course_id: "string - which course to edit",
      prompt: "string - what changes to make",
      scope: "'module' | 'course' - edit one module or whole course",
      module_path: "string? - if scope is module, which one"
    }
  },
  {
    name: "check_edit_status",
    description: "Check status of a pending course edit job",
    parameters: {
      job_id: "string - the edit job ID"
    }
  },
  {
    name: "view_edit_diff",
    description: "View what changed in a completed edit job",
    parameters: {
      job_id: "string - the edit job ID"
    }
  }
]
```

---

## AI Editing Harness (VM)

A separate service on a VM that executes course edits using Claude Code. Triggered by the Teacher AI Assistant.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Teacher AI   │────▶│   Job Queue      │────▶│   AI Harness    │
│   Assistant     │     │   (Supabase)     │     │   VM (Claude)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                 ┌──────────────────┐
                                                 │  Course Material │
                                                 │    (Storage)     │
                                                 └──────────────────┘
```

### Workflow

1. Teacher asks their AI assistant to edit course content
2. Assistant confirms and creates `course_edit_jobs` record
3. VM harness polls for pending jobs (or webhook trigger)
4. Harness downloads course-material to local filesystem
5. Claude Code edits files based on teacher's prompt
6. Harness uploads new version to course-material bucket
7. Creates new `course_versions` record with status='draft'
8. Updates job status to 'completed'
9. Teacher's assistant notifies them to review
10. Teacher reviews diff and approves/rejects via assistant

---

## Open Questions

1. **Real-time features**: Live collaboration on course editing?
2. **Grading workflow**: How are grades stored and calculated?
3. **Notifications**: Email? In-app? Push?
4. **File size limits**: Max course/module size?

---

## MVP Scope (Phase 1)

### Must Have
- [ ] Institution + user management
- [ ] Course CRUD with version control
- [ ] Module/content rendering from file storage
- [ ] **Student AI Tutor** (chat interface, RAG, streaming)
- [ ] Course download/upload for AI editing
- [ ] Basic assignment/quiz display
- [ ] Role-based access control

### Nice to Have (Phase 2)
- [ ] Assignment submissions & grading
- [ ] Quiz taking with auto-grading
- [ ] Grade book
- [ ] Progress tracking
- [ ] Tutor analytics (what are students asking?)

### Future (Phase 3+)
- [ ] iOS app
- [ ] Android app
- [ ] Live collaboration
- [ ] AI-powered content suggestions
- [ ] Proactive tutor (notices struggling students)
