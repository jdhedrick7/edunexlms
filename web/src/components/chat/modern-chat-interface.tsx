'use client'

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Send,
  Loader2,
  ChevronDown,
  Trash2,
  BookOpen,
} from 'lucide-react'

// Minimal logo icon - 2x2 grid matching EduNex brand
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1" y="1" width="6" height="6" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.6" />
      <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" />
    </svg>
  )
}
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Tables } from '@/types/database'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  course_id: string | null
  created_at: string | null
  isStreaming?: boolean
}

interface ModernChatInterfaceProps {
  initialMessages: Message[]
  courses: Tables<'courses'>[]
  userName: string | null
  type: 'tutor' | 'assistant'
  apiEndpoint: string
  clearEndpoint?: string
}

export function ModernChatInterface({
  initialMessages,
  courses,
  userName,
  type,
  apiEndpoint,
  clearEndpoint,
}: ModernChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [isClearing, setIsClearing] = useState(false)
  const [showCourseSelector, setShowCourseSelector] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const courseSelectorRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close course selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (courseSelectorRef.current && !courseSelectorRef.current.contains(event.target as Node)) {
        setShowCourseSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const trimmedInput = inputValue.trim()
    if (!trimmedInput || isLoading) return

    setError(null)
    setIsLoading(true)
    setInputValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Add user message immediately
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      course_id: selectedCourse === 'all' ? null : selectedCourse,
      created_at: new Date().toISOString(),
    }

    // Add placeholder for assistant response
    const assistantMessage: Message = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      course_id: selectedCourse === 'all' ? null : selectedCourse,
      created_at: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedInput,
          courseId: selectedCourse === 'all' ? null : selectedCourse,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream')
      }

      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine === 'data: [DONE]') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            )
            continue
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6)
              const parsed = JSON.parse(jsonStr)

              if (parsed.error) {
                throw new Error(parsed.error)
              }

              if (parsed.content) {
                accumulatedContent += parsed.content

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              }
            } catch (parseError) {
              if (
                parseError instanceof Error &&
                parseError.message !== 'Unexpected end of JSON input'
              ) {
                console.error('Parse error:', parseError)
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessage.id)
        )
        return
      }

      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessage.id)
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const handleClearHistory = async () => {
    if (isClearing || messages.length === 0 || !clearEndpoint) return

    const confirmed = window.confirm(
      selectedCourse === 'all'
        ? 'Clear all chat history?'
        : 'Clear chat history for this course?'
    )

    if (!confirmed) return

    setIsClearing(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedCourse !== 'all') {
        params.set('courseId', selectedCourse)
      }

      const response = await fetch(`${clearEndpoint}?${params.toString()}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to clear history')
      }

      if (selectedCourse === 'all') {
        setMessages([])
      } else {
        setMessages((prev) =>
          prev.filter((msg) => msg.course_id !== selectedCourse)
        )
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to clear history'
      setError(errorMessage)
    } finally {
      setIsClearing(false)
    }
  }

  const filteredMessages =
    selectedCourse === 'all'
      ? messages
      : messages.filter(
          (msg) => msg.course_id === selectedCourse || msg.course_id === null
        )

  const selectedCourseName = selectedCourse === 'all'
    ? 'All Courses'
    : courses.find(c => c.id === selectedCourse)?.code || 'Select Course'

  const isTutor = type === 'tutor'
  const greeting = userName ? `Hi ${userName.split(' ')[0]}` : 'Hello'

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4 py-8">
          {filteredMessages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
              {/* Hero icon */}
              <div className="relative mb-8">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center bg-gradient-to-br from-primary to-primary/60">
                  <LogoIcon className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>

              {/* Welcome text */}
              <h2 className="mb-2 text-3xl font-bold tracking-tight">
                {greeting}
              </h2>
              <p className="mb-8 max-w-md text-center text-lg text-muted-foreground">
                {isTutor
                  ? "I'm your AI tutor. Ask me anything about your courses."
                  : "I'm your teaching assistant. Let's manage your courses together."}
              </p>

              {/* Quick actions */}
              <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
                {isTutor ? (
                  <>
                    <QuickActionCard
                      title="Explain a concept"
                      description="Break down complex topics"
                      onClick={() => setInputValue("Can you explain ")}
                    />
                    <QuickActionCard
                      title="Help with assignment"
                      description="Get guidance on your work"
                      onClick={() => setInputValue("I need help with my assignment on ")}
                    />
                    <QuickActionCard
                      title="Quiz me"
                      description="Test your knowledge"
                      onClick={() => setInputValue("Quiz me on ")}
                    />
                    <QuickActionCard
                      title="Summarize material"
                      description="Get key takeaways"
                      onClick={() => setInputValue("Summarize the key points of ")}
                    />
                  </>
                ) : (
                  <>
                    <QuickActionCard
                      title="Student progress"
                      description="Check how students are doing"
                      onClick={() => setInputValue("Show me the progress of ")}
                    />
                    <QuickActionCard
                      title="Grade submissions"
                      description="Review pending work"
                      onClick={() => setInputValue("What submissions need grading?")}
                    />
                    <QuickActionCard
                      title="Course analytics"
                      description="Understand engagement"
                      onClick={() => setInputValue("Show me analytics for ")}
                    />
                    <QuickActionCard
                      title="Create content"
                      description="Draft announcements or materials"
                      onClick={() => setInputValue("Help me create ")}
                    />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'group flex gap-4',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center',
                      message.role === 'assistant'
                        ? 'bg-gradient-to-br from-primary to-primary/60 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <LogoIcon className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">
                        {userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>

                  {/* Message content */}
                  <div
                    className={cn(
                      'flex max-w-[85%] flex-col gap-1',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-border">
                          {message.content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          ) : message.isStreaming ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 animate-pulse bg-current" style={{ animationDelay: '0ms' }} />
                                <span className="h-2 w-2 animate-pulse bg-current" style={{ animationDelay: '150ms' }} />
                                <span className="h-2 w-2 animate-pulse bg-current" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.course_id && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        {courses.find((c) => c.id === message.course_id)?.code}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between text-sm text-destructive">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-destructive hover:text-destructive"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              {/* Course selector */}
              <div className="relative" ref={courseSelectorRef}>
                <button
                  type="button"
                  onClick={() => setShowCourseSelector(!showCourseSelector)}
                  className="flex h-9 items-center gap-1 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {selectedCourseName}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showCourseSelector && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 border bg-popover p-1 shadow-lg z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourse('all')
                        setShowCourseSelector(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                        selectedCourse === 'all' && 'bg-accent'
                      )}
                    >
                      All Courses
                    </button>
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourse(course.id)
                          setShowCourseSelector(false)
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors truncate',
                          selectedCourse === course.id && 'bg-accent'
                        )}
                      >
                        {course.code}: {course.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isTutor
                    ? "Ask me anything..."
                    : "What would you like help with?"
                }
                className="min-h-[40px] max-h-[200px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60"
                disabled={isLoading}
                rows={1}
              />

              {/* Actions */}
              <div className="flex items-center gap-1">
                {clearEndpoint && filteredMessages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearHistory}
                    disabled={isClearing}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    {isClearing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9"
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="mt-2 text-center text-xs text-muted-foreground/60">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-1 border bg-background p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/50"
    >
      <span className="font-medium text-sm group-hover:text-primary transition-colors">
        {title}
      </span>
      <span className="text-xs text-muted-foreground">
        {description}
      </span>
    </button>
  )
}
