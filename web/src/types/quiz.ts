// Quiz JSON file structure (stored in course materials)
export interface QuizQuestion {
  type: 'multiple_choice' | 'short_answer'
  question: string
  points: number
  options?: string[] // For multiple_choice only
  correctIndex?: number // For multiple_choice only
}

export interface Quiz {
  type: 'quiz'
  title: string
  timeLimit: number // in minutes
  attempts: number // max attempts allowed
  showAnswers?: boolean // whether to show correct answers after submission
  questions: QuizQuestion[]
}

// Answer format stored in quiz_attempts.answers
export interface QuizAnswers {
  [questionIndex: number]: string | number | null // string for short_answer, number (index) for multiple_choice
}

// Extended quiz attempt with grading info per question
export interface QuestionResult {
  questionIndex: number
  correct: boolean | null // null for short_answer (needs manual grading)
  pointsEarned: number | null
  pointsPossible: number
  studentAnswer: string | number | null
  correctAnswer?: number // For multiple_choice, the correct index
}

export interface GradedQuizAttempt {
  id: string
  courseId: string
  userId: string
  quizPath: string
  attemptNumber: number
  answers: QuizAnswers
  score: number | null
  maxScore: number
  startedAt: string
  submittedAt: string | null
  questionResults?: QuestionResult[]
}
