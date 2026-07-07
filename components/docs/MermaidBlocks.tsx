// MermaidBlocks — progressive enhancement for ```mermaid code fences.
//
// @void/md has no mermaid support: a ```mermaid fence SSRs as a plain
// highlighted code block (`<div class="language-mermaid">…<pre class="shiki">`).
// This island renders NOTHING itself — on mount it scans the page for those
// blocks and, ONLY if any exist, lazy-imports mermaid (its own chunk, like the
// luge pattern in components/landing/luge.tsx — pages without diagrams never
// fetch it) and swaps each block for the rendered SVG. The original code block
// stays in the DOM (hidden) as the fallback: a parse/render failure keeps it
// visible (console.warn, never a blank hole), and its source text feeds theme
// re-renders.
//
// THEME: the site sets BOTH `.dark` and `data-theme` on <html> in lockstep
// (middleware/01.head.ts bootstrap + ThemeToggle). We key off `data-theme` and
// re-render every diagram via a MutationObserver when it flips.
//
// ISLAND: 'load' via the three docs layout.island.tsx entries. Islands hydrate
// without Router/Shared context — this component only touches the DOM.
import { useEffect } from 'react'

interface Block {
  /** The @void/md fence wrapper (`div.language-mermaid`). */
  wrapper: HTMLElement
  /** Raw mermaid source, read once from the fence's `<pre><code>` text. */
  source: string
  /** Container the rendered SVG is injected into (inserted before wrapper). */
  host: HTMLElement
}

/** Unique-id counter across passes — mermaid.render requires fresh ids. */
let seq = 0

export default function MermaidBlocks() {
  useEffect(() => {
    const wrappers = Array.from(
      document.querySelectorAll<HTMLElement>('.void-md div.language-mermaid'),
    )
    if (wrappers.length === 0) return

    let disposed = false
    const blocks: Block[] = []
    for (const wrapper of wrappers) {
      const source = wrapper.querySelector('pre code')?.textContent?.trim()
      if (!source) continue
      const host = document.createElement('div')
      host.className = 'mermaid-diagram'
      host.hidden = true
      // insertAdjacentElement, not `.before()` — the worker types in this
      // repo's tsconfig shadow lib.dom's ChildNode.before with HTMLRewriter's.
      wrapper.insertAdjacentElement('beforebegin', host)
      blocks.push({ wrapper, source, host })
    }
    if (blocks.length === 0) return

    const currentTheme = () =>
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'dark'
        : 'default'

    let rendered: string | null = null
    const renderAll = async () => {
      const theme = currentTheme()
      if (disposed || theme === rendered) return
      // Lazy: mermaid is only fetched once a page actually has a diagram.
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        // Never inject mermaid's error diagram into the page — on failure the
        // original code block stays visible instead.
        suppressErrorRendering: true,
        theme,
      })
      for (const { wrapper, source, host } of blocks) {
        try {
          const { svg } = await mermaid.render(`mermaid-block-${seq++}`, source)
          if (disposed) return
          host.innerHTML = svg
          host.hidden = false
          wrapper.style.display = 'none'
        } catch (err) {
          console.warn(
            '[mermaid] failed to render diagram, keeping the code block',
            err,
          )
        }
      }
      rendered = theme
    }

    // Serialize passes: a theme toggle during an in-flight pass queues a
    // follow-up instead of interleaving initialize()/render() calls. Per-block
    // failures are caught above; this catch only fires if the mermaid import
    // itself fails (e.g. offline) — the code blocks simply stay as they are.
    let queue = Promise.resolve()
    const request = () => {
      queue = queue
        .then(renderAll)
        .catch((err) => console.warn('[mermaid] failed to load', err))
    }

    request()

    const observer = new MutationObserver(request)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [])

  return null
}
