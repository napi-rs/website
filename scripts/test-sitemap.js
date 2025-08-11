#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EXPORT_DIR = path.join(__dirname, '../.next/export')
const SITEMAP_PATH = path.join(EXPORT_DIR, 'sitemap.xml')
const ROBOTS_PATH = path.join(EXPORT_DIR, 'robots.txt')

async function testSitemap() {
  console.log('🧪 Testing sitemap generation...')

  // Check if export directory exists
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error('❌ Export directory not found. Please run build first.')
    process.exit(1)
  }

  // Check if sitemap exists
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('❌ Sitemap not found. Please run "yarn sitemap" first.')
    process.exit(1)
  }

  // Check if robots.txt exists
  if (!fs.existsSync(ROBOTS_PATH)) {
    console.error('❌ robots.txt not found.')
    process.exit(1)
  }

  // Read and validate sitemap
  const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8')

  // Basic XML validation
  if (!sitemapContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    console.error('❌ Invalid XML header in sitemap')
    process.exit(1)
  }

  if (
    !sitemapContent.includes(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
  ) {
    console.error('❌ Invalid urlset in sitemap')
    process.exit(1)
  }

  // Count URLs
  const urlMatches = sitemapContent.match(/<loc>.*?<\/loc>/g)
  const urlCount = urlMatches ? urlMatches.length : 0

  if (urlCount === 0) {
    console.error('❌ No URLs found in sitemap')
    process.exit(1)
  }

  // Check if base URL is correct
  const hasCorrectBaseUrl = urlMatches.some((url) =>
    url.includes('https://napi.rs/'),
  )
  if (!hasCorrectBaseUrl) {
    console.error('❌ Incorrect base URL in sitemap')
    process.exit(1)
  }

  // Validate robots.txt
  const robotsContent = fs.readFileSync(ROBOTS_PATH, 'utf8')
  if (!robotsContent.includes('Sitemap: https://napi.rs/sitemap.xml')) {
    console.error('❌ Incorrect sitemap reference in robots.txt')
    process.exit(1)
  }

  console.log(`✅ Sitemap validation passed!`)
  console.log(`📊 Found ${urlCount} URLs`)
  console.log(
    `📄 Sitemap size: ${(fs.statSync(SITEMAP_PATH).size / 1024).toFixed(1)} KB`,
  )
  console.log(`🤖 robots.txt size: ${fs.statSync(ROBOTS_PATH).size} bytes`)

  // Show sample URLs
  console.log('\n📋 Sample URLs:')
  const sampleUrls = urlMatches
    .slice(0, 5)
    .map((url) => url.replace(/<\/?loc>/g, '').trim())
  sampleUrls.forEach((url) => console.log(`   ${url}`))

  if (urlCount > 5) {
    console.log(`   ... and ${urlCount - 5} more`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testSitemap().catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
}

export { testSitemap }
