import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SetupDemoButton } from '@/components/setup-demo-button'
import {
  BrainIcon,
  BookOpenIcon,
  ClockIcon,
  UsersIcon,
  GraduationCapIcon,
  MessageCircleQuestionIcon,
  BarChart3Icon,
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
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="EduNex"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">EduNex</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#for-students" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">For Students</a>
            <a href="#for-teachers" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">For Teachers</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="mailto:contact@edunexlms.com">
              <Button variant="ghost" size="sm">Contact</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-indigo-950/20" />

          <div className="container relative mx-auto max-w-5xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
              A personal tutor for{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                every student
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600 dark:text-gray-400 md:text-xl">
              AI tutoring that asks questions instead of giving answers.
              Students learn by thinking. Teachers get time back to teach.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="mailto:contact@edunexlms.com">
                <Button size="lg" className="w-full bg-blue-600 px-8 hover:bg-blue-700 sm:w-auto">
                  Get in Touch
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

        {/* 2-Sigma Section */}
        <section className="border-y bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                The 2-Sigma Advantage
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                Benjamin Bloom&apos;s 1984 research proved that 1:1 tutoring moves students two standard deviations above average.
              </p>
            </div>

            {/* Modern Stat Display */}
            <div className="mx-auto mt-12 max-w-4xl">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Before */}
                <div className="relative overflow-hidden rounded-2xl border bg-white p-8 dark:bg-gray-900">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gray-100 dark:bg-gray-800" />
                  <div className="relative">
                    <p className="text-sm font-medium uppercase tracking-wider text-gray-500">Traditional Classroom</p>
                    <p className="mt-2 text-6xl font-bold text-gray-400">50<span className="text-3xl">th</span></p>
                    <p className="mt-1 text-sm text-gray-500">percentile</p>
                  </div>
                </div>

                {/* Arrow / Transformation */}
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                    <span className="text-2xl font-bold">+2σ</span>
                  </div>
                  <div className="mt-3 hidden h-0.5 w-full bg-gradient-to-r from-gray-300 via-blue-600 to-emerald-500 md:block" />
                  <p className="mt-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    with 1:1 tutoring
                  </p>
                </div>

                {/* After */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-white p-8 dark:from-emerald-950/30 dark:to-gray-900">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
                  <div className="relative">
                    <p className="text-sm font-medium uppercase tracking-wider text-emerald-600">With AI Tutor</p>
                    <p className="mt-2 text-6xl font-bold text-emerald-600">98<span className="text-3xl">th</span></p>
                    <p className="mt-1 text-sm text-emerald-600/70">percentile</p>
                  </div>
                </div>
              </div>

              {/* Bottom stat */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Students jump from average to <span className="font-semibold text-gray-900 dark:text-white">top 2%</span> of their class
                </p>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium text-gray-900 dark:text-white">
              EduNex brings that level of personalized support to every student in your institution.
            </p>
          </div>
        </section>

        {/* For Students Section */}
        <section id="for-students" className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                  For Students
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  A tutor that&apos;s always available, always patient, and always focused on helping them understand.
                </p>
                <ul className="mt-8 space-y-4">
                  <li className="flex gap-3">
                    <MessageCircleQuestionIcon className="h-6 w-6 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Learns through questions</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">The tutor guides students to answers through the Socratic method, building real understanding.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <ClockIcon className="h-6 w-6 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Help when they need it</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Available 24/7. Students get unstuck in seconds, not days.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <BookOpenIcon className="h-6 w-6 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Grounded in course materials</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Every answer comes from your curriculum. No hallucinations, no off-topic tangents.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">S</div>
                  <div className="rounded-2xl rounded-tl-none bg-white p-4 shadow-sm dark:bg-gray-900">
                    <p className="text-sm text-gray-700 dark:text-gray-300">I don&apos;t understand why the derivative of sin(x) is cos(x).</p>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white">AI</div>
                  <div className="rounded-2xl rounded-tl-none bg-white p-4 shadow-sm dark:bg-gray-900">
                    <p className="text-sm text-gray-700 dark:text-gray-300">Good question. Let&apos;s think about what a derivative measures. When x increases by a tiny amount, what happens to sin(x)? Try sketching the sine curve and looking at its slope at different points.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Teachers Section */}
        <section id="for-teachers" className="border-y bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="order-2 md:order-1">
                <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900">
                  <h4 className="font-medium text-gray-900 dark:text-white">Class Insights</h4>
                  <p className="mt-1 text-sm text-gray-500">Where students are struggling this week</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Chain Rule Applications</span>
                        <span className="text-red-600">23 students</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-2 w-3/4 rounded-full bg-red-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Integration by Parts</span>
                        <span className="text-orange-600">14 students</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-2 w-1/2 rounded-full bg-orange-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Limit Definitions</span>
                        <span className="text-yellow-600">8 students</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-2 w-1/4 rounded-full bg-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                  For Teachers
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                  Spend less time on busywork. More time on what matters.
                </p>
                <ul className="mt-8 space-y-4">
                  <li className="flex gap-3">
                    <BarChart3Icon className="h-6 w-6 shrink-0 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">See where students struggle</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Real-time insights show exactly which concepts need more class time.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <ClockIcon className="h-6 w-6 shrink-0 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Reduce grading time</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">AI-assisted grading with detailed feedback suggestions.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <UsersIcon className="h-6 w-6 shrink-0 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Focus on mentorship</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">When routine questions are handled, you can focus on the students who need you most.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                A Complete Learning Platform
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                EduNex is a full learning management system with AI tutoring built in from the start.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <BookOpenIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Course Management</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Create courses, organize modules, upload materials, manage enrollments.
                </p>
              </div>
              <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <GraduationCapIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Assignments & Grading</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Quizzes, assignments, and assessments with AI-assisted grading and feedback.
                </p>
              </div>
              <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <BrainIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">AI Tutor per Course</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Each course gets a dedicated tutor trained on your curriculum and materials.
                </p>
              </div>
              <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <BarChart3Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Analytics & Insights</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  See where students struggle, track progress, and identify who needs extra help.
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
                Ready to give every student a tutor?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-blue-100">
                Let&apos;s talk about how EduNex can work for your institution.
              </p>
              <div className="mt-8">
                <Link href="mailto:contact@edunexlms.com">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                    Get in Touch
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
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="EduNex"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">EduNex</span>
            </Link>
            <div className="flex gap-8 text-sm text-gray-600 dark:text-gray-400">
              <a href="#for-students" className="hover:text-gray-900 dark:hover:text-white">For Students</a>
              <a href="#for-teachers" className="hover:text-gray-900 dark:hover:text-white">For Teachers</a>
              <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white">How It Works</a>
              <a href="mailto:contact@edunexlms.com" className="hover:text-gray-900 dark:hover:text-white">Contact</a>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} EduNex
          </div>
        </div>
      </footer>
    </div>
  )
}
