import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SetupDemoButton } from '@/components/setup-demo-button'
import {
  BrainIcon,
  BookOpenIcon,
  UsersIcon,
  SparklesIcon,
  GlobeIcon,
  TrendingUpIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  CheckCircleIcon,
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const isDevelopment = process.env.NODE_ENV === 'development'
  let showSetupButton = false

  if (isDevelopment) {
    const { count } = await supabase
      .from('institutions')
      .select('*', { count: 'exact', head: true })
    showSetupButton = (count ?? 0) === 0
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <GraduationCapIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">EduNex</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Features</a>
            <a href="#impact" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Impact</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-indigo-950/20" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="container relative mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <SparklesIcon className="h-4 w-4" />
              <span>Proven results in Kedougou, Senegal</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Every student deserves a{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                personal AI tutor
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 md:text-xl">
              EduNex is an AI-first learning platform that gives every student personalized
              tutoring grounded in their actual course materials. No hallucinations, just
              real learning support.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full bg-blue-600 px-8 hover:bg-blue-700 sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="border-y bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                Proven Impact in Kedougou
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                Our pilot program in Kedougou, Senegal demonstrated massive improvements in
                student learning outcomes, proving that AI-powered personalized tutoring
                can transform education in underserved communities.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <TrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Improved Outcomes
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Students using EduNex showed significant improvement in comprehension
                  and test performance compared to traditional methods.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <GlobeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Accessible Anywhere
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Works on low-bandwidth connections, making quality education accessible
                  in remote and underserved areas.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                  <UsersIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Teacher Multiplier
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Teachers can effectively support more students while AI handles
                  individual questions and explanations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                AI-First Learning Platform
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                Built from the ground up to leverage AI for personalized education at scale.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <BrainIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Personal AI Tutor</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Every student gets a dedicated AI tutor that knows their course materials
                    and learning history. Ask questions anytime, get accurate answers grounded
                    in actual course content.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <BookOpenIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">RAG-Powered Accuracy</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Using retrieval-augmented generation, our AI tutor searches course
                    materials before answering. No hallucinations, just accurate information
                    from your actual curriculum.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <SparklesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Course Editing</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Teachers can update course materials using natural language. Just describe
                    what you want to change, and AI handles the implementation with full
                    version control.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <MessageSquareIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Teacher AI Assistant</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Teachers get their own AI assistant to help with course management,
                    answering student questions at scale, and identifying students who
                    need extra support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                How It Works
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                Get started in minutes with a platform designed for simplicity.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  1
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Upload Course Content</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Teachers upload lectures, readings, and materials. Our system automatically
                  indexes everything for AI search.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  2
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Students Learn & Ask</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Students access materials, take quizzes, and ask their AI tutor
                  questions anytime they need help.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  3
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Track Progress</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Teachers see analytics on student engagement and can identify who
                  needs additional support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center md:p-16">
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Ready to transform education?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-blue-100">
                Join institutions around the world using EduNex to provide personalized
                AI tutoring to every student.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="w-full bg-white text-blue-600 hover:bg-blue-50 sm:w-auto">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="mailto:contact@edunexlms.com">
                  <Button size="lg" variant="outline" className="w-full border-white text-white hover:bg-white/10 sm:w-auto">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Dev Setup Button */}
        {showSetupButton && (
          <section className="px-4 pb-16">
            <div className="container mx-auto max-w-md">
              <div className="rounded-lg border border-dashed border-yellow-500 bg-yellow-50 p-6 text-center dark:border-yellow-600 dark:bg-yellow-950">
                <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                  Development Setup
                </h2>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  No institutions found. Click below to create demo data for testing.
                </p>
                <SetupDemoButton />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 px-4 py-12 dark:bg-gray-900">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <GraduationCapIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">EduNex</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-600 dark:text-gray-400">
              <a href="#features" className="hover:text-gray-900 dark:hover:text-white">Features</a>
              <a href="#impact" className="hover:text-gray-900 dark:hover:text-white">Impact</a>
              <a href="mailto:contact@edunexlms.com" className="hover:text-gray-900 dark:hover:text-white">Contact</a>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} EduNex. AI-powered learning for everyone.
          </div>
        </div>
      </footer>
    </div>
  )
}
