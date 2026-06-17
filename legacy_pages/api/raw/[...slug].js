import fs from 'fs/promises'
import path from 'path'

const LOCALES = ['en', 'cn', 'pt-BR']
const DEFAULT_LOCALE = 'en'
const PAGES_DIR = path.join(process.cwd(), 'pages')

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let { slug } = req.query

  // If slug is undefined, try to parse from the URL (handles middleware rewrites)
  // The x-middleware-rewrite header contains the original path
  if (!slug || slug.length === 0) {
    // Parse from the URL directly - handle both direct API calls and middleware rewrites
    const url = req.url || ''
    const apiRawMatch = url.match(/^\/api\/raw\/(.+)$/)
    const mdMatch = url.match(/^\/(.+)\.md$/)

    if (apiRawMatch) {
      slug = apiRawMatch[1].split('/')
    } else if (mdMatch) {
      // This is a rewritten request from middleware
      slug = mdMatch[1].split('/')
    }
  }

  if (!slug || slug.length === 0) {
    return res.status(404).json({ error: 'Not found' })
  }

  // Parse locale - prefer header (from middleware), then from slug
  let locale = req.headers['x-raw-md-locale'] || DEFAULT_LOCALE
  const pathParts = Array.isArray(slug) ? [...slug] : slug.split('/')

  // Only extract locale from slug if not provided via header (direct API access)
  if (!req.headers['x-raw-md-locale'] && LOCALES.includes(pathParts[0])) {
    locale = pathParts.shift()
  }

  const docPath = pathParts.join('/')

  // Validate path to prevent directory traversal
  const normalizedPath = path.normalize(docPath)
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  // Try to find the file (mdx first, then md)
  const extensions = ['.mdx', '.md']
  let content = null

  for (const ext of extensions) {
    const filePath = path.join(PAGES_DIR, `${docPath}.${locale}${ext}`)

    // Double-check the resolved path is within PAGES_DIR
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(PAGES_DIR)) {
      return res.status(400).json({ error: 'Invalid path' })
    }

    try {
      content = await fs.readFile(filePath, 'utf-8')
      break
    } catch {
      continue
    }
  }

  if (!content) {
    return res.status(404).json({ error: 'Document not found' })
  }

  // Set appropriate headers
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${pathParts[pathParts.length - 1]}.md"`,
  )
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')

  return res.status(200).send(content)
}
