#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const writeFile = promisify(fs.writeFile)

const BASE_URL = 'https://napi.rs'
const EXPORT_DIR = path.join(__dirname, '../.next/export')

async function getAllHtmlFiles(dir) {
  const files = []

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        // Convert file path to URL path
        const relativePath = path.relative(EXPORT_DIR, fullPath)
        let urlPath = relativePath.replace(/\.html$/, '').replace(/\\/g, '/') // Normalize for Windows

        // Handle index files - remove '/index' from path
        if (urlPath.endsWith('/index')) {
          urlPath = urlPath.replace('/index', '')
        }

        // Ensure path starts with /
        if (!urlPath.startsWith('/')) {
          urlPath = '/' + urlPath
        }

        // Skip error pages and files starting with underscore
        if (
          !urlPath.includes('/404') &&
          !urlPath.includes('/500') &&
          !urlPath.includes('/_')
        ) {
          files.push({
            url: urlPath,
            file: fullPath,
          })
        }
      }
    }
  }

  await walk(dir)
  return files
}

async function getLastModified(filePath) {
  try {
    const stats = await stat(filePath)
    return stats.mtime.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

async function generateSitemap() {
  console.log('🔍 Scanning for HTML files...')

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`)
    console.error('Please run the build command first.')
    process.exit(1)
  }

  const htmlFiles = await getAllHtmlFiles(EXPORT_DIR)
  console.log(`📄 Found ${htmlFiles.length} HTML files`)

  if (htmlFiles.length === 0) {
    console.warn('⚠️  No HTML files found to include in sitemap')
    return
  }

  // Generate sitemap XML
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  // Sort URLs for consistent output
  htmlFiles.sort((a, b) => a.url.localeCompare(b.url))

  for (const file of htmlFiles) {
    const lastmod = await getLastModified(file.file)

    sitemap += '  <url>\n'
    sitemap += `    <loc>${BASE_URL}${file.url}</loc>\n`
    sitemap += `    <lastmod>${lastmod}</lastmod>\n`

    // Set priority based on URL structure
    let priority = '0.5'
    if (
      file.url === '/' ||
      file.url === '/en' ||
      file.url === '/cn' ||
      file.url === '/pt-BR'
    ) {
      priority = '1.0'
    } else if (file.url.split('/').length === 2) {
      priority = '0.8'
    } else if (file.url.includes('/docs/')) {
      priority = '0.7'
    }

    sitemap += `    <priority>${priority}</priority>\n`
    sitemap += '  </url>\n'
  }

  sitemap += '</urlset>\n'

  // Write sitemap to export directory
  const sitemapPath = path.join(EXPORT_DIR, 'sitemap.xml')
  await writeFile(sitemapPath, sitemap, 'utf8')

  console.log(`✅ Sitemap generated successfully: ${sitemapPath}`)
  console.log(`📊 Included ${htmlFiles.length} URLs`)
  console.log(`🌐 Base URL: ${BASE_URL}`)

  // Also create a robots.txt if it doesn't exist
  const robotsPath = path.join(EXPORT_DIR, 'robots.txt')
  if (!fs.existsSync(robotsPath)) {
    const robotsContent = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`
    await writeFile(robotsPath, robotsContent, 'utf8')
    console.log(`🤖 robots.txt created: ${robotsPath}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap().catch((error) => {
    console.error('❌ Error generating sitemap:', error)
    process.exit(1)
  })
}

export { generateSitemap }
