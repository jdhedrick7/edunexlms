'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeftIcon,
  PlusIcon,
  GripVerticalIcon,
  Trash2Icon,
  FileTextIcon,
  ClipboardListIcon,
  HelpCircleIcon,
  SaveIcon,
  Loader2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { FileUpload } from '@/components/course/file-upload'

interface Module {
  id: string
  order: number
  title: string
  description: string
  content: string
  assignment: Assignment | null
  quiz: Quiz | null
}

interface Assignment {
  title: string
  description: string
  instructions: string
  dueInDays: number
  pointsPossible: number
  submissionType: 'text' | 'file' | 'both'
}

interface Quiz {
  title: string
  description: string
  timeLimit: number | null
  attemptsAllowed: number
  questions: QuizQuestion[]
}

interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  question: string
  options?: string[]
  correctAnswer: string | number
  points: number
}

export default function CourseEditorPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<{ code: string; name: string } | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Dialog states
  const [showModuleDialog, setShowModuleDialog] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [assignmentModuleId, setAssignmentModuleId] = useState<string | null>(null)
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [quizModuleId, setQuizModuleId] = useState<string | null>(null)

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Check if teacher
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('role')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single()

      if (!enrollment || enrollment.role !== 'teacher') {
        router.push(`/courses/${courseId}`)
        return
      }

      // Get course info
      const { data: courseData } = await supabase
        .from('courses')
        .select('code, name')
        .eq('id', courseId)
        .single()

      if (courseData) {
        setCourse(courseData)
      }

      // Load existing draft or create empty
      await loadDraft()
      setLoading(false)
    }

    checkAccess()
  }, [courseId, router])

  const loadDraft = useCallback(async () => {
    const response = await fetch(`/api/courses/${courseId}/draft`)
    if (response.ok) {
      const data = await response.json()
      if (data.modules) {
        setModules(data.modules)
      }
    }
  }, [courseId])

  const saveDraft = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      toast.success('Draft saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const publishDraft = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/draft/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish')
      }

      toast.success('Course version created! Go to Versions to review and publish.')
      router.push(`/courses/${courseId}/versions`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setSaving(false)
    }
  }

  const addModule = () => {
    setEditingModule(null)
    setShowModuleDialog(true)
  }

  const editModule = (module: Module) => {
    setEditingModule(module)
    setShowModuleDialog(true)
  }

  const saveModule = (moduleData: Partial<Module>) => {
    if (editingModule) {
      setModules(prev => prev.map(m =>
        m.id === editingModule.id ? { ...m, ...moduleData } : m
      ))
    } else {
      const newModule: Module = {
        id: crypto.randomUUID(),
        order: modules.length + 1,
        title: moduleData.title || 'New Module',
        description: moduleData.description || '',
        content: moduleData.content || '',
        assignment: null,
        quiz: null,
      }
      setModules(prev => [...prev, newModule])
      setExpandedModules(prev => new Set([...prev, newModule.id]))
    }
    setShowModuleDialog(false)
  }

  const deleteModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId))
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const openAssignmentDialog = (moduleId: string) => {
    setAssignmentModuleId(moduleId)
    setShowAssignmentDialog(true)
  }

  const saveAssignment = (assignment: Assignment) => {
    if (assignmentModuleId) {
      setModules(prev => prev.map(m =>
        m.id === assignmentModuleId ? { ...m, assignment } : m
      ))
    }
    setShowAssignmentDialog(false)
    setAssignmentModuleId(null)
  }

  const removeAssignment = (moduleId: string) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, assignment: null } : m
    ))
  }

  const openQuizDialog = (moduleId: string) => {
    setQuizModuleId(moduleId)
    setShowQuizDialog(true)
  }

  const saveQuiz = (quiz: Quiz) => {
    if (quizModuleId) {
      setModules(prev => prev.map(m =>
        m.id === quizModuleId ? { ...m, quiz } : m
      ))
    }
    setShowQuizDialog(false)
    setQuizModuleId(null)
  }

  const removeQuiz = (moduleId: string) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, quiz: null } : m
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Course Builder</h1>
            <p className="text-muted-foreground">{course?.code} - {course?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SaveIcon className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={publishDraft} disabled={saving || modules.length === 0}>
            Create Version
          </Button>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modules</h2>
          <Button onClick={addModule} size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No modules yet. Start building your course!</p>
              <Button onClick={addModule}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Module
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {modules.map((module, index) => (
              <Card key={module.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <GripVerticalIcon className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {expandedModules.has(module.id) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <CardTitle className="text-base">{module.title}</CardTitle>
                    </button>
                    <div className="flex items-center gap-1">
                      {module.assignment && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Assignment
                        </span>
                      )}
                      {module.quiz && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Quiz
                        </span>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => editModule(module)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteModule(module.id)}>
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {module.description && (
                    <CardDescription className="ml-12">{module.description}</CardDescription>
                  )}
                </CardHeader>

                {expandedModules.has(module.id) && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Content Preview */}
                    {module.content && (
                      <div className="ml-12 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground line-clamp-3">{module.content}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="ml-12 flex flex-wrap gap-2">
                      {!module.assignment ? (
                        <Button variant="outline" size="sm" onClick={() => openAssignmentDialog(module.id)}>
                          <ClipboardListIcon className="h-4 w-4 mr-2" />
                          Add Assignment
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAssignmentDialog(module.id)}>
                            <ClipboardListIcon className="h-4 w-4 mr-2" />
                            Edit Assignment
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeAssignment(module.id)}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {!module.quiz ? (
                        <Button variant="outline" size="sm" onClick={() => openQuizDialog(module.id)}>
                          <HelpCircleIcon className="h-4 w-4 mr-2" />
                          Add Quiz
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openQuizDialog(module.id)}>
                            <HelpCircleIcon className="h-4 w-4 mr-2" />
                            Edit Quiz ({module.quiz.questions.length} questions)
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeQuiz(module.id)}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <FileUpload courseId={courseId} />

      {/* Module Dialog */}
      <ModuleDialog
        open={showModuleDialog}
        onOpenChange={setShowModuleDialog}
        module={editingModule}
        onSave={saveModule}
      />

      {/* Assignment Dialog */}
      <AssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
        assignment={assignmentModuleId ? modules.find(m => m.id === assignmentModuleId)?.assignment ?? null : null}
        onSave={saveAssignment}
      />

      {/* Quiz Dialog */}
      <QuizDialog
        open={showQuizDialog}
        onOpenChange={setShowQuizDialog}
        quiz={quizModuleId ? modules.find(m => m.id === quizModuleId)?.quiz ?? null : null}
        onSave={saveQuiz}
      />
    </div>
  )
}

// Module Dialog Component
function ModuleDialog({
  open,
  onOpenChange,
  module,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: Module | null
  onSave: (data: Partial<Module>) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (module) {
      setTitle(module.title)
      setDescription(module.description)
      setContent(module.content)
    } else {
      setTitle('')
      setDescription('')
      setContent('')
    }
  }, [module, open])

  const handleSave = () => {
    onSave({ title, description, content })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{module ? 'Edit Module' : 'Add Module'}</DialogTitle>
          <DialogDescription>
            Create a learning module with content for your students.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Title</Label>
            <Input
              id="module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Variables"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-desc">Description</Label>
            <Input
              id="module-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of this module"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-content">Content (Markdown)</Label>
            <Textarea
              id="module-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your lesson content here... Supports Markdown formatting."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {module ? 'Save Changes' : 'Add Module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Assignment Dialog Component
function AssignmentDialog({
  open,
  onOpenChange,
  assignment,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Assignment | null
  onSave: (data: Assignment) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueInDays, setDueInDays] = useState(7)
  const [pointsPossible, setPointsPossible] = useState(100)
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('both')

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title)
      setDescription(assignment.description)
      setInstructions(assignment.instructions)
      setDueInDays(assignment.dueInDays)
      setPointsPossible(assignment.pointsPossible)
      setSubmissionType(assignment.submissionType)
    } else {
      setTitle('')
      setDescription('')
      setInstructions('')
      setDueInDays(7)
      setPointsPossible(100)
      setSubmissionType('both')
    }
  }, [assignment, open])

  const handleSave = () => {
    onSave({
      title,
      description,
      instructions,
      dueInDays,
      pointsPossible,
      submissionType,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
          <DialogDescription>
            Create an assignment for students to complete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="assign-title">Title</Label>
            <Input
              id="assign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Week 1 Homework"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-desc">Description</Label>
            <Input
              id="assign-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-instructions">Instructions (Markdown)</Label>
            <Textarea
              id="assign-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detailed instructions for students..."
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assign-due">Due (days from enrollment)</Label>
              <Input
                id="assign-due"
                type="number"
                value={dueInDays}
                onChange={(e) => setDueInDays(parseInt(e.target.value) || 7)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-points">Points Possible</Label>
              <Input
                id="assign-points"
                type="number"
                value={pointsPossible}
                onChange={(e) => setPointsPossible(parseInt(e.target.value) || 100)}
                min={0}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Submission Type</Label>
            <div className="flex gap-4">
              {(['text', 'file', 'both'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="submissionType"
                    value={type}
                    checked={submissionType === type}
                    onChange={() => setSubmissionType(type)}
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {assignment ? 'Save Changes' : 'Add Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quiz Dialog Component
function QuizDialog({
  open,
  onOpenChange,
  quiz,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  onSave: (data: Quiz) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [attemptsAllowed, setAttemptsAllowed] = useState(1)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title)
      setDescription(quiz.description)
      setTimeLimit(quiz.timeLimit)
      setAttemptsAllowed(quiz.attemptsAllowed)
      setQuestions(quiz.questions)
    } else {
      setTitle('')
      setDescription('')
      setTimeLimit(null)
      setAttemptsAllowed(1)
      setQuestions([])
    }
  }, [quiz, open])

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: crypto.randomUUID(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 10,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const handleSave = () => {
    onSave({
      title,
      description,
      timeLimit,
      attemptsAllowed,
      questions,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{quiz ? 'Edit Quiz' : 'Add Quiz'}</DialogTitle>
          <DialogDescription>
            Create a quiz to assess student understanding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Title</Label>
              <Input
                id="quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Module 1 Quiz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiz-attempts">Attempts Allowed</Label>
              <Input
                id="quiz-attempts"
                type="number"
                value={attemptsAllowed}
                onChange={(e) => setAttemptsAllowed(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-desc">Description</Label>
            <Input
              id="quiz-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-time">Time Limit (minutes, leave empty for no limit)</Label>
            <Input
              id="quiz-time"
              type="number"
              value={timeLimit || ''}
              onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="No limit"
              min={1}
            />
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Questions ({questions.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {questions.map((q, index) => (
              <Card key={q.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Question {index + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, {
                        type: e.target.value as QuizQuestion['type'],
                        options: e.target.value === 'multiple_choice' ? ['', '', '', ''] : undefined,
                        correctAnswer: e.target.value === 'true_false' ? 'true' : (e.target.value === 'multiple_choice' ? 0 : ''),
                      })}
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                    <Input
                      type="number"
                      value={q.points}
                      onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })}
                      placeholder="Points"
                      min={0}
                    />
                  </div>
                  <Textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    placeholder="Enter question..."
                    rows={2}
                  />

                  {q.type === 'multiple_choice' && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === optIndex}
                            onChange={() => updateQuestion(q.id, { correctAnswer: optIndex })}
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...q.options!]
                              newOptions[optIndex] = e.target.value
                              updateQuestion(q.id, { options: newOptions })
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`tf-${q.id}`}
                          checked={q.correctAnswer === 'true'}
                          onChange={() => updateQuestion(q.id, { correctAnswer: 'true' })}
                        />
                        True
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`tf-${q.id}`}
                          checked={q.correctAnswer === 'false'}
                          onChange={() => updateQuestion(q.id, { correctAnswer: 'false' })}
                        />
                        False
                      </label>
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <Input
                      value={q.correctAnswer as string}
                      onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                      placeholder="Expected answer (for auto-grading reference)"
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {quiz ? 'Save Changes' : 'Add Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
