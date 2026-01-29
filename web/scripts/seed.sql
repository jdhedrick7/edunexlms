-- EduNex LMS Sample Seed Data
-- This script creates sample data for development and testing
-- Run this directly against your Supabase database

-- Note: This script uses DO blocks for conditional inserts to avoid duplicates
-- The data will only be inserted if it doesn't already exist

-- ============================================
-- INSTITUTION
-- ============================================

DO $$
DECLARE
    v_institution_id UUID;
BEGIN
    -- Check if Demo University already exists
    SELECT id INTO v_institution_id FROM public.institutions WHERE slug = 'demo-u';

    IF v_institution_id IS NULL THEN
        INSERT INTO public.institutions (name, slug, settings)
        VALUES ('Demo University', 'demo-u', '{}')
        RETURNING id INTO v_institution_id;

        RAISE NOTICE 'Created Demo University with ID: %', v_institution_id;
    ELSE
        RAISE NOTICE 'Demo University already exists with ID: %', v_institution_id;
    END IF;
END $$;

-- ============================================
-- COURSES
-- ============================================

DO $$
DECLARE
    v_institution_id UUID;
    v_course_id UUID;
BEGIN
    -- Get institution ID
    SELECT id INTO v_institution_id FROM public.institutions WHERE slug = 'demo-u';

    IF v_institution_id IS NULL THEN
        RAISE EXCEPTION 'Demo University not found. Please create the institution first.';
    END IF;

    -- CS101: Introduction to Computer Science
    SELECT id INTO v_course_id FROM public.courses
    WHERE institution_id = v_institution_id AND code = 'CS101';

    IF v_course_id IS NULL THEN
        INSERT INTO public.courses (institution_id, code, name, description, settings)
        VALUES (
            v_institution_id,
            'CS101',
            'Introduction to Computer Science',
            'An introductory course covering fundamental concepts of computer science including algorithms, data structures, and programming basics.',
            '{}'
        )
        RETURNING id INTO v_course_id;

        RAISE NOTICE 'Created CS101 with ID: %', v_course_id;
    ELSE
        RAISE NOTICE 'CS101 already exists with ID: %', v_course_id;
    END IF;

    -- MATH201: Calculus II
    SELECT id INTO v_course_id FROM public.courses
    WHERE institution_id = v_institution_id AND code = 'MATH201';

    IF v_course_id IS NULL THEN
        INSERT INTO public.courses (institution_id, code, name, description, settings)
        VALUES (
            v_institution_id,
            'MATH201',
            'Calculus II',
            'Advanced calculus covering integration techniques, sequences, series, and multivariable calculus fundamentals.',
            '{}'
        )
        RETURNING id INTO v_course_id;

        RAISE NOTICE 'Created MATH201 with ID: %', v_course_id;
    ELSE
        RAISE NOTICE 'MATH201 already exists with ID: %', v_course_id;
    END IF;

    -- PHYS150: Physics I
    SELECT id INTO v_course_id FROM public.courses
    WHERE institution_id = v_institution_id AND code = 'PHYS150';

    IF v_course_id IS NULL THEN
        INSERT INTO public.courses (institution_id, code, name, description, settings)
        VALUES (
            v_institution_id,
            'PHYS150',
            'Physics I: Mechanics',
            'Introduction to classical mechanics including kinematics, dynamics, energy, momentum, and rotational motion.',
            '{}'
        )
        RETURNING id INTO v_course_id;

        RAISE NOTICE 'Created PHYS150 with ID: %', v_course_id;
    ELSE
        RAISE NOTICE 'PHYS150 already exists with ID: %', v_course_id;
    END IF;

    -- ENG101: English Composition
    SELECT id INTO v_course_id FROM public.courses
    WHERE institution_id = v_institution_id AND code = 'ENG101';

    IF v_course_id IS NULL THEN
        INSERT INTO public.courses (institution_id, code, name, description, settings)
        VALUES (
            v_institution_id,
            'ENG101',
            'English Composition',
            'Fundamentals of academic writing, critical thinking, and effective communication.',
            '{}'
        )
        RETURNING id INTO v_course_id;

        RAISE NOTICE 'Created ENG101 with ID: %', v_course_id;
    ELSE
        RAISE NOTICE 'ENG101 already exists with ID: %', v_course_id;
    END IF;
END $$;

-- ============================================
-- ANNOUNCEMENTS (requires a user/author to exist)
-- These announcements will be created without an author
-- In practice, use the seed-user API endpoint to create
-- announcements with the logged-in user as author
-- ============================================

-- Note: Announcements require an author_id which must be a valid user.
-- You can create sample announcements after you have a user by running:
--
-- DO $$
-- DECLARE
--     v_course_id UUID;
--     v_user_id UUID;
-- BEGIN
--     -- Get a user ID (replace with actual user ID or use a query)
--     SELECT id INTO v_user_id FROM public.users LIMIT 1;
--
--     IF v_user_id IS NULL THEN
--         RAISE NOTICE 'No users found. Skipping announcements.';
--         RETURN;
--     END IF;
--
--     -- Get CS101 course
--     SELECT id INTO v_course_id FROM public.courses WHERE code = 'CS101';
--
--     IF v_course_id IS NOT NULL THEN
--         INSERT INTO public.announcements (course_id, author_id, title, content, pinned)
--         VALUES (
--             v_course_id,
--             v_user_id,
--             'Welcome to Introduction to Computer Science!',
--             'Welcome to CS101! This course will introduce you to the fascinating world of computer science. We will cover algorithms, data structures, and programming fundamentals. Please review the syllabus and reach out if you have any questions.',
--             true
--         )
--         ON CONFLICT DO NOTHING;
--     END IF;
-- END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify the seed data was created
SELECT
    i.name as institution_name,
    i.slug as institution_slug,
    c.code as course_code,
    c.name as course_name
FROM public.institutions i
LEFT JOIN public.courses c ON c.institution_id = i.id
WHERE i.slug = 'demo-u'
ORDER BY c.code;
