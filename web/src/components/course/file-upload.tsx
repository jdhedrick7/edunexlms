'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  UploadIcon,
  FileIcon,
  Trash2Icon,
  Loader2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  FolderIcon,
  ImageIcon,
  FileTextIcon,
  VideoIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface UploadedFile {
  name: string
  size: number
  type: string
  path?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface FileUploadProps {
  courseId: string
  onFilesUploaded?: () => void
}

export function FileUpload({ courseId, onFilesUploaded }: FileUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as const,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
      // Store actual files for upload
      const input = fileInputRef.current
      if (input) {
        const dt = new DataTransfer()
        Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f))
        // Append to existing
        if (input.files) {
          Array.from(input.files).forEach(f => dt.items.add(f))
        }
        input.files = dt.files
      }
    }
  }, [handleFiles])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    // Also remove from input
    const input = fileInputRef.current
    if (input?.files) {
      const dt = new DataTransfer()
      Array.from(input.files).forEach((f, i) => {
        if (i !== index) dt.items.add(f)
      })
      input.files = dt.files
    }
  }

  const uploadFiles = async () => {
    const input = fileInputRef.current
    if (!input?.files || input.files.length === 0) {
      toast.error('No files to upload')
      return
    }

    setUploading(true)

    const formData = new FormData()
    Array.from(input.files).forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await fetch(`/api/courses/${courseId}/files`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Update file statuses
      setFiles(prev => prev.map((f, i) => ({
        ...f,
        status: 'success' as const,
        path: data.files?.[i]?.path,
      })))

      toast.success(`Uploaded ${data.uploadedCount} files successfully`)

      // Clear after delay
      setTimeout(() => {
        setFiles([])
        if (input) input.value = ''
        onFilesUploaded?.()
        router.refresh()
      }, 2000)

    } catch (error) {
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed',
      })))
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon
    if (type.startsWith('video/')) return VideoIcon
    if (type === 'application/pdf' || type.startsWith('text/')) return FileTextIcon
    return FileIcon
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderIcon className="h-5 w-5" />
          Course Files
        </CardTitle>
        <CardDescription>
          Upload PDFs, documents, images, videos, and other resources. These will be stored in your course and can be organized into modules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.json,.zip"
          />
          <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Browse Files
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Supports: Images, Videos, PDFs, Documents, Spreadsheets, Presentations, Text files
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{files.length} file(s) selected</span>
              <Button
                size="sm"
                onClick={uploadFiles}
                disabled={uploading || files.every(f => f.status === 'success')}
              >
                {uploading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
              {files.map((file, index) => {
                const Icon = getFileIcon(file.type)
                return (
                  <div key={index} className="flex items-center gap-3 p-3">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'success' && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <span title={file.error}>
                          <AlertCircleIcon className="h-5 w-5 text-destructive" />
                        </span>
                      )}
                      {file.status === 'uploading' && (
                        <Loader2Icon className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
