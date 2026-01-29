'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircleIcon, CheckCircleIcon, FileIcon, UploadIcon, Loader2Icon, XIcon, DownloadIcon } from 'lucide-react'
import { toast } from 'sonner'

interface UploadedFile {
  name: string
  path: string
  size: number
  type: string
}

interface SubmissionFormProps {
  courseId: string
  assignmentPath: string
  assignmentTitle: string
  submissionTypes: ('text' | 'file')[]
  existingSubmission?: {
    id: string
    text_content: string | null
    files?: UploadedFile[]
    status: string | null
    submitted_at: string | null
  }
  isGraded?: boolean
}

export function SubmissionForm({
  courseId,
  assignmentPath,
  assignmentTitle,
  submissionTypes,
  existingSubmission,
  isGraded = false,
}: SubmissionFormProps) {
  const router = useRouter()
  const [textContent, setTextContent] = useState(existingSubmission?.text_content || '')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingSubmission?.files || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const allowsText = submissionTypes.includes('text')
  const allowsFile = submissionTypes.includes('file')

  const hasContent = textContent.trim().length > 0 || selectedFiles.length > 0 || uploadedFiles.length > 0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(prev => [...prev, ...files])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (): Promise<UploadedFile[]> => {
    if (selectedFiles.length === 0) return uploadedFiles

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('courseId', courseId)
      formData.append('assignmentPath', assignmentPath)
      selectedFiles.forEach(file => formData.append('files', file))

      const response = await fetch('/api/submissions/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload files')
      }

      const data = await response.json()
      const newFiles = [...uploadedFiles, ...data.files]
      setUploadedFiles(newFiles)
      setSelectedFiles([])
      return newFiles
    } finally {
      setIsUploading(false)
    }
  }

  const downloadFile = async (file: UploadedFile) => {
    try {
      const response = await fetch(`/api/submissions/upload?courseId=${courseId}&filePath=${encodeURIComponent(file.path)}`)
      if (!response.ok) throw new Error('Failed to get download URL')
      const data = await response.json()
      window.open(data.url, '_blank')
    } catch {
      toast.error('Failed to download file')
    }
  }

  const handleSubmit = async () => {
    if (!hasContent) {
      toast.error('Please enter your submission')
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmDialog(false)
    setIsSubmitting(true)

    try {
      // Upload any pending files first
      let finalFiles = uploadedFiles
      if (selectedFiles.length > 0) {
        finalFiles = await uploadFiles()
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          assignmentPath,
          textContent: textContent.trim() || null,
          files: finalFiles,
          status: 'submitted',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit assignment')
      }

      toast.success('Assignment submitted successfully')
      router.push(`/courses/${courseId}/assignments/${encodeURIComponent(assignmentPath)}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSubmitting(true)

    try {
      // Upload any pending files first
      let finalFiles = uploadedFiles
      if (selectedFiles.length > 0) {
        finalFiles = await uploadFiles()
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          assignmentPath,
          textContent: textContent.trim() || null,
          files: finalFiles,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save draft')
      }

      toast.success('Draft saved')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isGraded) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <AlertCircleIcon className="h-5 w-5" />
            <p>This assignment has been graded and cannot be modified.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Submit Assignment</CardTitle>
          <CardDescription>
            {existingSubmission?.status === 'draft' && (
              <Badge variant="secondary" className="mr-2">Draft</Badge>
            )}
            {existingSubmission?.status === 'submitted' && (
              <Badge variant="default" className="mr-2">Submitted</Badge>
            )}
            {existingSubmission
              ? 'Update your submission below'
              : 'Complete your submission below'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {allowsText && (
            <div className="space-y-2">
              <Label htmlFor="text-submission">Text Submission</Label>
              <Textarea
                id="text-submission"
                placeholder="Enter your submission here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[200px]"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {textContent.length} characters
              </p>
            </div>
          )}

          {allowsFile && (
            <div className="space-y-2">
              <Label htmlFor="file-submission">File Upload</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Input
                  id="file-submission"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting || isUploading}
                />
                <Label
                  htmlFor="file-submission"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <UploadIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload files or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, images, documents, code files (max 10MB each)
                  </span>
                </Label>
              </div>

              {/* Previously uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium">Uploaded Files</p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded"
                    >
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => downloadFile(file)}
                      >
                        <DownloadIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => removeUploadedFile(index)}
                        disabled={isSubmitting}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending files to upload */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium">Files to Upload</p>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded"
                    >
                      <FileIcon className="h-4 w-4" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => removeSelectedFile(index)}
                        disabled={isSubmitting || isUploading}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={uploadFiles}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-4 w-4 mr-2" />
                        Upload Now
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              'Save Draft'
            )}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasContent}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Assignment'
            )}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this assignment? You can modify your
              submission until it is graded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>Assignment:</strong> {assignmentTitle}
            </p>
            {textContent && (
              <p className="text-sm mt-2">
                <strong>Content:</strong> {textContent.substring(0, 100)}
                {textContent.length > 100 && '...'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit}>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
