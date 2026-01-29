import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const EMBEDDING_MODEL = 'text-embedding-ada-002'
const CHUNK_SIZE = 1000 // characters per chunk
const CHUNK_OVERLAP = 200 // overlap between chunks

/**
 * Generate embedding for a text string using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
  })

  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map(t => t.trim()),
  })

  return response.data.map(d => d.embedding)
}

/**
 * Split text into overlapping chunks for embedding
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()

    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // Move start position with overlap
    start = end - overlap
    if (start < 0) start = 0
    if (end >= text.length) break
  }

  return chunks
}

/**
 * Process a document for embedding - splits into chunks and generates embeddings
 */
export async function processDocumentForEmbedding(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<{
  chunks: string[]
  embeddings: number[][]
  metadata: Record<string, unknown>[]
}> {
  const chunks = chunkText(content)

  if (chunks.length === 0) {
    return { chunks: [], embeddings: [], metadata: [] }
  }

  const embeddings = await generateEmbeddings(chunks)

  const metadataArray = chunks.map((_, index) => ({
    ...metadata,
    chunkIndex: index,
    totalChunks: chunks.length,
  }))

  return { chunks, embeddings, metadata: metadataArray }
}

/**
 * Format search results for LLM context
 */
export function formatSearchResults(
  results: Array<{
    content: string
    file_path: string
    metadata: Record<string, unknown>
    similarity: number
  }>
): string {
  if (results.length === 0) {
    return 'No relevant course materials found.'
  }

  return results
    .map((result, index) => {
      const source = result.file_path.split('/').pop() || result.file_path
      return `[Source ${index + 1}: ${source}]\n${result.content}\n`
    })
    .join('\n---\n')
}
