# Sitemap Generation

This project includes automated sitemap generation for the napi-rs website after the site is built.

## Overview

The sitemap generation system creates a complete XML sitemap of all generated HTML pages, including support for multiple languages (English, Chinese, Portuguese) as configured in the Next.js i18n setup.

## Files

- `scripts/generate-sitemap.js` - Main script that scans exported HTML files and generates sitemap.xml
- `scripts/test-sitemap.js` - Test script to validate the generated sitemap
- The generated files are placed in `.next/export/`:
  - `sitemap.xml` - Complete XML sitemap following the sitemap protocol
  - `robots.txt` - Basic robots.txt file with sitemap reference

## Usage

### Manual Generation

After building the site, run:

```bash
yarn sitemap
```

### Testing

To verify the sitemap was generated correctly:

```bash
yarn test:sitemap
```

### Build with Sitemap

To build and generate sitemap in one command:

```bash
yarn build:with-sitemap
```

### Automatic Generation

The sitemap is automatically generated after successful builds via the `postbuild` hook.

## Features

- **Comprehensive URL Discovery**: Scans all generated HTML files in the export directory
- **Multi-language Support**: Handles all language variants (en, cn, pt-BR)
- **SEO Optimization**:
  - Sets appropriate priorities based on URL structure
  - Includes last modification timestamps
  - Follows XML sitemap protocol
- **Error Handling**: Graceful error handling and informative console output
- **Validation**: Built-in testing to ensure sitemap integrity

## Sitemap Structure

The generated sitemap includes:

- All public pages from the documentation site
- Blog posts and changelog entries
- Multiple language versions
- Proper priority weighting (1.0 for home pages, 0.8 for main sections, 0.7 for docs, 0.5 for others)
- Last modification timestamps for each URL

## Configuration

The base URL is configured as `https://napi.rs` and can be modified in the `generate-sitemap.js` script if needed.

## Output

Typical output includes ~340 URLs covering:

- Documentation pages in multiple languages
- Blog posts and announcements
- Changelog entries
- CLI documentation
- Concept guides

The sitemap file is approximately 52KB and is placed in the export directory to be served with the static site.
