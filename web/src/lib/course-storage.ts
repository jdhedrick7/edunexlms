import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ModuleItem } from '@/components/course/module-list'

export interface ModuleMetadata {
  title: string
  order: number
  published: boolean
  unlockDate?: string | null
  prerequisites?: string[]
}

/**
 * Fetches the module structure from a course version's storage path.
 * Returns a hierarchical list of modules with their content items.
 */
export async function fetchCourseModules(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  storagePath: string
): Promise<ModuleItem[]> {
  const bucketName = `inst-${institutionId}`

  // List all files in the version's modules directory
  const { data: files, error } = await supabase.storage
    .from(bucketName)
    .list(`${storagePath}/modules`, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (error || !files) {
    console.error('Error fetching course modules:', error)
    return []
  }

  const modules: ModuleItem[] = []

  // Process each folder (module)
  for (const folder of files.filter(f => f.id === null)) {
    // It's a folder if id is null
    const modulePath = `${storagePath}/modules/${folder.name}`

    // Fetch module.json for metadata
    const metadata = await fetchModuleMetadata(supabase, bucketName, modulePath)

    // List contents of this module
    const { data: moduleContents } = await supabase.storage
      .from(bucketName)
      .list(modulePath, { limit: 100 })

    const children: ModuleItem[] = []

    if (moduleContents) {
      for (const item of moduleContents) {
        if (item.name === 'module.json') continue
        if (item.name === 'resources') continue // Skip resources folder

        let itemType: ModuleItem['type'] = 'content'
        let title = item.name.replace(/\.(md|json)$/, '')

        if (item.name === 'assignment.json') {
          itemType = 'assignment'
          // Fetch assignment title
          const assignmentData = await fetchJsonFile<{ title?: string }>(supabase, bucketName, `${modulePath}/${item.name}`)
          title = assignmentData?.title || 'Assignment'
        } else if (item.name === 'quiz.json') {
          itemType = 'quiz'
          // Fetch quiz title
          const quizData = await fetchJsonFile<{ title?: string }>(supabase, bucketName, `${modulePath}/${item.name}`)
          title = quizData?.title || 'Quiz'
        } else if (item.name === 'content.md') {
          itemType = 'content'
          title = metadata?.title || folder.name
        }

        children.push({
          name: item.name,
          path: `${folder.name}/${item.name.replace(/\.(md|json)$/, '')}`,
          type: itemType,
          title,
        })
      }
    }

    modules.push({
      name: folder.name,
      path: folder.name,
      type: 'folder',
      title: metadata?.title || folder.name,
      order: metadata?.order ?? 999,
      published: metadata?.published ?? true,
      unlockDate: metadata?.unlockDate,
      children: children.sort((a, b) => {
        // Sort: content first, then assignment, then quiz
        const typeOrder = { content: 0, assignment: 1, quiz: 2, folder: 3 }
        return typeOrder[a.type] - typeOrder[b.type]
      }),
    })
  }

  return modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Fetches module.json metadata for a module
 */
async function fetchModuleMetadata(
  supabase: SupabaseClient<Database>,
  bucketName: string,
  modulePath: string
): Promise<ModuleMetadata | null> {
  return fetchJsonFile(supabase, bucketName, `${modulePath}/module.json`)
}

/**
 * Fetches and parses a JSON file from storage
 */
async function fetchJsonFile<T = Record<string, unknown>>(
  supabase: SupabaseClient<Database>,
  bucketName: string,
  filePath: string
): Promise<T | null> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(filePath)

  if (error || !data) {
    return null
  }

  try {
    const text = await data.text()
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Fetches the content of a specific module item (markdown or JSON)
 */
export async function fetchModuleContent(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  storagePath: string,
  modulePath: string
): Promise<{
  content: string | Record<string, unknown> | null
  contentType: 'markdown' | 'assignment' | 'quiz' | 'unknown'
}> {
  const bucketName = `inst-${institutionId}`
  const parts = modulePath.split('/')
  const moduleName = parts[0]
  const itemName = parts[1] || 'content'

  // Determine the file path and type
  let filePath = `${storagePath}/modules/${moduleName}`
  let contentType: 'markdown' | 'assignment' | 'quiz' | 'unknown' = 'unknown'

  if (itemName === 'content' || itemName === moduleName) {
    filePath = `${filePath}/content.md`
    contentType = 'markdown'
  } else if (itemName === 'assignment') {
    filePath = `${filePath}/assignment.json`
    contentType = 'assignment'
  } else if (itemName === 'quiz') {
    filePath = `${filePath}/quiz.json`
    contentType = 'quiz'
  } else {
    // Try markdown first, then json
    const mdPath = `${filePath}/${itemName}.md`
    const jsonPath = `${filePath}/${itemName}.json`

    const { data: mdData } = await supabase.storage.from(bucketName).download(mdPath)
    if (mdData) {
      return { content: await mdData.text(), contentType: 'markdown' }
    }

    const { data: jsonData } = await supabase.storage.from(bucketName).download(jsonPath)
    if (jsonData) {
      const text = await jsonData.text()
      const parsed = JSON.parse(text)
      const type = parsed.type === 'quiz' ? 'quiz' : parsed.type === 'assignment' ? 'assignment' : 'unknown'
      return { content: parsed, contentType: type }
    }

    return { content: null, contentType: 'unknown' }
  }

  const { data, error } = await supabase.storage.from(bucketName).download(filePath)

  if (error || !data) {
    return { content: null, contentType }
  }

  const text = await data.text()

  if (contentType === 'markdown') {
    return { content: text, contentType }
  }

  try {
    return { content: JSON.parse(text), contentType }
  } catch {
    return { content: null, contentType: 'unknown' }
  }
}

/**
 * Gets a signed URL for a resource file in the course
 */
export async function getResourceUrl(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  storagePath: string,
  resourcePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const bucketName = `inst-${institutionId}`
  const fullPath = `${storagePath}/${resourcePath}`

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(fullPath, expiresIn)

  if (error || !data) {
    return null
  }

  return data.signedUrl
}
