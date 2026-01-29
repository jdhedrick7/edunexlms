'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FolderOpen,
  FileText,
  ClipboardList,
  HelpCircle,
  ChevronRight,
  Lock
} from 'lucide-react'

export interface ModuleItem {
  name: string
  path: string
  type: 'folder' | 'content' | 'assignment' | 'quiz'
  title?: string
  order?: number
  published?: boolean
  unlockDate?: string | null
  children?: ModuleItem[]
}

interface ModuleListProps {
  courseId: string
  modules: ModuleItem[]
  isStaff?: boolean
}

function ModuleIcon({ type }: { type: ModuleItem['type'] }) {
  switch (type) {
    case 'folder':
      return <FolderOpen className="size-4 text-muted-foreground" />
    case 'assignment':
      return <ClipboardList className="size-4 shrink-0" />
    case 'quiz':
      return <HelpCircle className="size-4 shrink-0" />
    default:
      return <FileText className="size-4 shrink-0" />
  }
}

function ModuleNode({
  item,
  courseId,
  depth = 0,
  isStaff = false
}: {
  item: ModuleItem
  courseId: string
  depth?: number
  isStaff?: boolean
}) {
  const pathname = usePathname()
  const href = `/courses/${courseId}/modules/${item.path}`
  const isActive = pathname === href
  const isLocked = !isStaff && item.unlockDate && new Date(item.unlockDate) > new Date()
  const isUnpublished = !isStaff && item.published === false

  // Don't show unpublished items to students
  if (isUnpublished) {
    return null
  }

  if (item.type === 'folder') {
    return (
      <div className="space-y-1">
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            depth > 0 && 'ml-4'
          )}
          style={{ paddingLeft: depth > 0 ? `${depth * 16 + 12}px` : undefined }}
        >
          <FolderOpen className="size-4 text-muted-foreground" />
          <span>{item.title || item.name}</span>
          {isStaff && item.published === false && (
            <span className="ml-auto text-xs text-yellow-600">(Draft)</span>
          )}
        </div>
        {item.children && item.children.length > 0 && (
          <div className="space-y-0.5">
            {item.children
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((child) => (
                <ModuleNode
                  key={child.path}
                  item={child}
                  courseId={courseId}
                  depth={depth + 1}
                  isStaff={isStaff}
                />
              ))}
          </div>
        )}
      </div>
    )
  }

  if (isLocked) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60',
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 16 + 12}px` : undefined }}
      >
        <Lock className="size-4" />
        <span className="flex-1 truncate">{item.title || item.name}</span>
        <span className="text-xs">
          {new Date(item.unlockDate!).toLocaleDateString()}
        </span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      style={{ paddingLeft: depth > 0 ? `${depth * 16 + 12}px` : undefined }}
    >
      <ModuleIcon type={item.type} />
      <span className="flex-1 truncate">{item.title || item.name}</span>
      {isStaff && item.published === false && (
        <span className="text-xs text-yellow-600">(Draft)</span>
      )}
      <ChevronRight className="size-4 shrink-0 opacity-50" />
    </Link>
  )
}

export function ModuleList({ courseId, modules, isStaff = false }: ModuleListProps) {
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FolderOpen className="size-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          No modules yet
        </p>
        {isStaff && (
          <p className="mt-1 text-xs text-muted-foreground">
            Publish a course version to add content
          </p>
        )}
      </div>
    )
  }

  return (
    <nav className="space-y-1">
      {modules
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((module) => (
          <ModuleNode
            key={module.path}
            item={module}
            courseId={courseId}
            isStaff={isStaff}
          />
        ))}
    </nav>
  )
}
