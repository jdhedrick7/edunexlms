'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface SeedResponse {
  success?: boolean
  message?: string
  error?: string
  data?: {
    institution: {
      id: string
      name: string
      slug: string
      alreadyExists: boolean
    }
    courses: {
      code: string
      id: string
      name: string
      alreadyExists: boolean
    }[]
  }
}

export function SetupDemoButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SeedResponse | null>(null)

  async function handleSetup() {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/dev/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data: SeedResponse = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create demo data')
        return
      }

      setResult(data)

      // Refresh the page to update the UI
      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Setup error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (result?.success) {
    return (
      <div className="mt-4 space-y-2">
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
          <p className="font-medium">{result.message}</p>
          {result.data && (
            <ul className="mt-2 list-inside list-disc text-left">
              <li>
                Institution: {result.data.institution.name} ({result.data.institution.slug})
              </li>
              {result.data.courses.map((course) => (
                <li key={course.id}>
                  Course: {course.code} - {course.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs">Refreshing page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-2">
      <Button
        onClick={handleSetup}
        disabled={isLoading}
        className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600"
      >
        {isLoading ? 'Setting up...' : 'Setup Demo Data'}
      </Button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
