'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UploadIcon, Loader2Icon, FileArchiveIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

interface CourseUploadProps {
  courseId: string
}

export function CourseUpload({ courseId }: CourseUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        toast.error('Please select a ZIP file')
        return
      }
      setFile(selectedFile)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (notes.trim()) {
        formData.append('metadata', JSON.stringify({ notes: notes.trim() }))
      }

      const response = await fetch(`/api/courses/${courseId}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadResult({
          success: false,
          message: data.error || 'Upload failed',
          details: data.errors,
        })
        return
      }

      setUploadResult({
        success: true,
        message: `Successfully uploaded ${data.uploadedFiles} files as Version ${data.version.version_number}`,
        details: data.errors,
      })

      toast.success('Course content uploaded successfully')

      // Reset form after short delay
      setTimeout(() => {
        setFile(null)
        setNotes('')
        setUploadResult(null)
        setOpen(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        router.refresh()
      }, 1500)
    } catch (error) {
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!uploading) {
      setOpen(isOpen)
      if (!isOpen) {
        setFile(null)
        setNotes('')
        setUploadResult(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <UploadIcon className="h-4 w-4 mr-2" />
          Upload New Version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Course Content</DialogTitle>
          <DialogDescription>
            Upload a ZIP file containing your course modules. The ZIP should contain a <code>modules/</code> folder with your course content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Course Content (ZIP)</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileArchiveIcon className="h-4 w-4" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Version Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Describe the changes in this version..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
              rows={3}
            />
          </div>

          {/* Expected Structure Info */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-2">Expected ZIP structure:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`modules/
├── 01-introduction/
│   ├── module.json
│   ├── content.md
│   └── resources/
└── 02-topic-name/
    ├── module.json
    ├── content.md
    ├── assignment.json (optional)
    └── quiz.json (optional)`}
            </pre>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`rounded-md p-3 text-sm ${
                uploadResult.success
                  ? 'bg-green-500/15 text-green-600'
                  : 'bg-destructive/15 text-destructive'
              }`}
            >
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <AlertCircleIcon className="h-4 w-4" />
                )}
                {uploadResult.message}
              </div>
              {uploadResult.details && uploadResult.details.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs">
                  {uploadResult.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
