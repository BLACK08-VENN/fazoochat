const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize))
    if (i + chunkSize >= text.length) break
  }
  return chunks
}
