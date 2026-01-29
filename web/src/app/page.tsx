import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SetupDemoButton } from '@/components/setup-demo-button'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  // Check if any institutions exist (for dev setup purposes)
  const isDevelopment = process.env.NODE_ENV === 'development'
  let showSetupButton = false

  if (isDevelopment) {
    const { count } = await supabase
      .from('institutions')
      .select('*', { count: 'exact', head: true })

    showSetupButton = (count ?? 0) === 0
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold text-primary">EduNex</span>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Learn smarter with your personal AI tutor
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          EduNex is an AI-first learning management system where every student gets
          a personal AI tutor with full access to their course materials.
        </p>
        <div className="mt-10 flex gap-4">
          <Link href="/signup">
            <Button size="lg">Start Learning</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">Sign In</Button>
          </Link>
        </div>

        {/* Dev Setup Button */}
        {showSetupButton && (
          <div className="mt-16 rounded-lg border border-dashed border-yellow-500 bg-yellow-50 p-6 dark:border-yellow-600 dark:bg-yellow-950">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Development Setup
            </h2>
            <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              No institutions found. Click below to create demo data for testing.
            </p>
            <SetupDemoButton />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} EduNex. AI-powered learning for everyone.
        </div>
      </footer>
    </div>
  )
}
