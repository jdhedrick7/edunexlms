import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SetupDemoButton } from '@/components/setup-demo-button'
import {
  BrainIcon,
  BookOpenIcon,
  UsersIcon,
  TrendingUpIcon,
  ClockIcon,
  FileTextIcon,
  ZapIcon,
  BanIcon,
  GraduationCapIcon,
  DatabaseIcon,
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
            <a href="#problem" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Problem</a>
            <a href="#solution" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Solution</a>
            <a href="#why-now" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Why Now</a>
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
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="container relative mx-auto max-w-5xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
              AI tutoring that{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                actually teaches
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600 dark:text-gray-400 md:text-xl">
              Every student gets a personal AI tutor that asks questions instead of giving answers.
              Every teacher gets an assistant that handles the busywork.
            </p>

            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500 dark:text-gray-500">
              Legacy systems store files and track grades. That&apos;s it.
              We&apos;re not building a better filing cabinet. We&apos;re building the first system that actually teaches.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="mailto:contact@edunexlms.com">
                <Button size="lg" className="w-full bg-blue-600 px-8 hover:bg-blue-700 sm:w-auto">
                  Contact Us
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
                The Current System Is Broken
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                The current system was built to manage compliance, not to help students learn.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <BanIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Schools Are Losing
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Schools spend millions trying to &quot;detect&quot; and &quot;ban&quot; AI.
                  Students use it anyway. The current approach isn&apos;t working.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                  <ClockIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Teachers Are Buried
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Teachers spend 40% of their time on grading, planning, and compliance.
                  They became teachers to teach, not to do paperwork.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <UsersIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Students Get Left Behind
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  In a class of 30, the middle gets taught, the top gets bored, and the bottom falls behind.
                  One-size-fits-all doesn&apos;t fit anyone.
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
                In 1984, Benjamin Bloom proved that students with 1:1 tutoring perform 2 standard deviations better,
                moving from the 50th to the 98th percentile. We can finally deliver that at scale.
              </p>
            </div>

            {/* Cost Comparison */}
            <div className="mx-auto mt-12 max-w-md rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center dark:from-blue-950/30 dark:to-indigo-950/30">
              <p className="text-sm font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">1,000x Cost Reduction</p>
              <div className="mt-4 flex items-center justify-center gap-8">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">$50/hr</p>
                  <p className="text-sm text-gray-500">Human Tutor</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div>
                  <p className="text-3xl font-bold text-blue-600">$0.05/hr</p>
                  <p className="text-sm text-gray-500">AI Tutor</p>
                </div>
              </div>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <GraduationCapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">For Students</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Get unstuck in seconds instead of hours. Help available 24/7.
                  ChatGPT gives answers. EduNex asks questions. That&apos;s the difference between a shortcut and learning.
                </p>
              </div>

              <div className="rounded-2xl border p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <BookOpenIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">For Teachers</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Cut grading time by 80%. See exactly where students struggle.
                  Focus on high-value human mentorship, not paperwork.
                </p>
              </div>
            </div>

            {/* Product Features */}
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <BrainIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Dedicated AI for Each Course</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Not a generic chatbot. Each tutor reads your textbook, knows your assignments, and pulls examples from your actual course materials.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <FileTextIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Connected to Everything</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    The tutor sees your quiz results, knows your history, and understands exactly where you&apos;re stuck. Always context-aware.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                  <ZapIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Works While You Sleep</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Your tutor builds lesson plans and practice problems overnight. When you show up, your personalized content is ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Differentiator Section */}
        <section className="border-y bg-gray-50 px-4 py-16 dark:bg-gray-900/50 md:py-24">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
              Built Different
            </h2>
            <p className="mx-auto mt-6 text-lg text-gray-600 dark:text-gray-400">
              Legacy systems bolt AI onto 20-year-old file storage.
              They can summarize a document, but they can&apos;t teach.
            </p>
            <p className="mx-auto mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Their AI gives answers. Ours asks questions.
            </p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              That&apos;s the difference between a shortcut and learning.
            </p>
          </div>
        </section>

        {/* Why Now Section */}
        <section id="why-now" className="px-4 py-16 md:py-24">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                Why Now?
              </h2>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <BrainIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">AI Just Got Good Enough</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Two years ago this wasn&apos;t possible. Now AI can actually teach, asking the right questions at the right time.
                </p>
              </div>

              <div className="rounded-2xl border p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <TrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Schools Need a New Approach</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Banning AI failed. Schools are desperate for a way to use AI that helps students learn instead of cheat.
                </p>
              </div>

              <div className="rounded-2xl border p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                  <DatabaseIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">We Get Smarter Every Day</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Every tutoring session makes our system better. Traditional LMS companies can&apos;t catch up. They don&apos;t have the data.
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
                Replace the digital filing cabinet with software that actually helps students learn.
              </p>
              <div className="mt-8">
                <Link href="mailto:contact@edunexlms.com">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
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
              <a href="#problem" className="hover:text-gray-900 dark:hover:text-white">Problem</a>
              <a href="#solution" className="hover:text-gray-900 dark:hover:text-white">Solution</a>
              <a href="#why-now" className="hover:text-gray-900 dark:hover:text-white">Why Now</a>
              <a href="mailto:contact@edunexlms.com" className="hover:text-gray-900 dark:hover:text-white">Contact</a>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} EduNex. AI tutoring that actually teaches.
          </div>
        </div>
      </footer>
    </div>
  )
}
