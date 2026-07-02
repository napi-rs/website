// Barrel for the docs theme chrome components.
//
// NOTE on islands: re-exporting a component here does NOT make it an island.
// The `with { island }` import attribute is honoured ONLY in the per-locale
// `pages/{en,cn,pt-BR}/docs/layout.island.tsx` entry files, which import the
// island components directly (Navbar, Sidebar, Toc, NotTranslatedBanner). This
// barrel is for the structural shell + static chrome and for type imports.
export { default as DocsLayout } from './DocsLayout'
export type { DocsLayoutProps, DocsLayoutSlots } from './DocsLayout'
export { default as Logo } from './Logo'
export { default as Navbar } from './Navbar'
export { default as Sidebar } from './Sidebar'
export { default as Toc } from './Toc'
export { default as Breadcrumb } from './Breadcrumb'
export { default as Pager } from './Pager'
export { default as EditOnGithub } from './EditOnGithub'
export { default as NotTranslatedBanner } from './NotTranslatedBanner'
export { default as Footer } from './Footer'
export { default as ThemeToggle } from './ThemeToggle'
export { default as LangSwitcher } from './LangSwitcher'
export { default as SearchDialog } from './SearchDialog'
