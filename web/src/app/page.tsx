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
  ClockIcon,
  FileTextIcon,
  ZapIcon,
  TargetIcon,
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
            <a href="#problem" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">The Problem</a>
            <a href="#solution" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Our Solution</a>
            <a href="#impact" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Impact</a>
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
              <span>Validated with 2,000 students in Kédougou, Senegal</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Every student deserves a{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                personal tutor
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600 dark:text-gray-400 md:text-xl">
              A 24/7 Socratic tutor for every student. A brilliant digital assistant for every teacher.
              We&apos;re replacing the &quot;Digital Filing Cabinet&quot; with an AI-native pedagogy engine.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full bg-blue-600 px-8 hover:bg-blue-700 sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#solution">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="border-y bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                The LMS Has Failed Education
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                For 20 years, learning management systems have been digital filing cabinets.
                They manage files, not learning. We&apos;re here to change that.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <ClockIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Teacher Burnout
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Educators spend 40% of their time on administrative overhead—grading,
                  planning, compliance—rather than actual instruction.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                  <TargetIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  The Individualization Gap
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  In a class of 30, the &quot;middle&quot; gets taught, the &quot;top&quot; gets bored,
                  and the &quot;bottom&quot; falls behind. One-size-fits-all doesn&apos;t work.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <FileTextIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  File-First, Not Learning-First
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Legacy systems like Canvas and Blackboard are &quot;file-first&quot; with
                  AI bolted on. We&apos;re interaction-centric from the ground up.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section id="solution" className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                The 2-Sigma Solution
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                Benjamin Bloom proved that 1:1 tutoring moves a student from the 50th to the 98th
                percentile. We provide that at scale.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <BrainIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Socratic Reasoning Agents</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Not a chatbot. Our AI is programmed to ask, not tell. It guides students
                    to understanding through questions, not answers. The difference between
                    a student who copies and a student who learns.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <BookOpenIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Linguistic Memory (RAG)</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    The system remembers the curriculum and the student&apos;s history,
                    ensuring help is always context-aware. No hallucinations—just accurate
                    information grounded in actual course materials.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <ZapIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Hours to Seconds</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    24/7 Socratic support reduces &quot;stuck time&quot; from hours to seconds.
                    Students get help exactly when they need it, not during office hours
                    three days later.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <MessageSquareIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Teacher Digital Assistant</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    AI-grading and diagnostic heatmaps reduce prep time by 80%. Teachers
                    focus on high-value human mentorship, not administrative overhead.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="border-t bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                Proven in Kédougou
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                Our pilot with 2,000 students in Kédougou, Senegal demonstrated massive
                improvements in learning outcomes—proving AI-powered tutoring transforms
                education in underserved communities.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <TrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Massive Improvement
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Students showed significant gains in comprehension and test performance
                  compared to traditional instruction methods.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <GlobeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Resilient Connectivity
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Designed to work on fluctuating signals—ensuring the Global South and
                  Rural US have the same experience as Seattle.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                  <UsersIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Leapfrog Opportunity
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  1.5M students in Senegal as proof of concept for the 1.2B students
                  in emerging markets who can leapfrog legacy EdTech.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Now Section */}
        <section className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                Why Now?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                We&apos;re at the inflection point where AI isn&apos;t a luxury—it&apos;s the new utility.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border p-6 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Search → Synthesis</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Moving from &quot;searching for answers&quot; to &quot;synthesizing knowledge.&quot;
                </p>
              </div>
              <div className="rounded-xl border p-6 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Universal Access</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Connectivity is ubiquitous. LLMs have matured into reasoning agents.
                </p>
              </div>
              <div className="rounded-xl border p-6 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Data Moat</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Every interaction creates a feedback loop that makes the tutor smarter.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-4xl">
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center md:p-16">
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                From Digital Storage to AI-Native Learning
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-blue-100">
                Join institutions providing every student a personal Socratic tutor
                and every teacher a brilliant digital assistant.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="w-full bg-white text-blue-600 hover:bg-blue-50 sm:w-auto">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="mailto:contact@edunexlms.com">
                  <Button size="lg" variant="outline" className="w-full border-white text-white hover:bg-white/10 sm:w-auto">
                    Contact Us
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
              <a href="#problem" className="hover:text-gray-900 dark:hover:text-white">The Problem</a>
              <a href="#solution" className="hover:text-gray-900 dark:hover:text-white">Solution</a>
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
