'use client'

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Send, Loader2, Bot, User, Trash2, AlertCircle } from 'lucide-react'
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

interface ChatInterfaceProps {
  initialMessages: Message[]
  courses: Tables<'courses'>[]
  userName: string | null
}

export function ChatInterface({
  initialMessages,
  courses,
  userName,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [isClearing, setIsClearing] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const trimmedInput = inputValue.trim()
    if (!trimmedInput || isLoading) return

    setError(null)
    setIsLoading(true)
    setInputValue('')

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
      const response = await fetch('/api/tutor/chat', {
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
            // Stream complete
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

                // Update the assistant message with accumulated content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              }
            } catch (parseError) {
              // Skip malformed JSON
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
        // Request was cancelled - remove the empty assistant message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessage.id)
        )
        return
      }

      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)

      // Remove the empty assistant message on error
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
    if (isClearing || messages.length === 0) return

    const confirmed = window.confirm(
      selectedCourse === 'all'
        ? 'Are you sure you want to clear all chat history?'
        : 'Are you sure you want to clear chat history for this course?'
    )

    if (!confirmed) return

    setIsClearing(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedCourse !== 'all') {
        params.set('courseId', selectedCourse)
      }

      const response = await fetch(`/api/tutor/history?${params.toString()}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to clear history')
      }

      // Clear messages locally
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

  const userInitials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <div className="flex h-full flex-col">
      {/* Header with course selector */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select course context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code}: {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          disabled={isClearing || filteredMessages.length === 0}
          className="text-muted-foreground hover:text-destructive"
        >
          {isClearing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Clear History
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-auto p-1 text-destructive hover:text-destructive"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="py-4">
          {filteredMessages.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium">
                Welcome to your AI Tutor
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                I&apos;m here to help you with your courses. Ask me questions
                about your course materials, get help with assignments, or just
                chat about topics you&apos;re learning.
              </p>
              {courses.length > 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Tip: Select a specific course above to get more relevant
                  answers.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <Avatar className="mt-1 h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={cn(
                        message.role === 'assistant'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        userInitials || <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      'flex max-w-[80%] flex-col gap-1',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {message.content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          ) : message.isStreaming ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Thinking...
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.course_id && (
                      <span className="text-xs text-muted-foreground">
                        {courses.find((c) => c.id === message.course_id)?.code}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[80px] w-[80px] flex-shrink-0"
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
