import { defineHead } from 'void'

// No loader: the builder is a pure client tool (all state lives in the island),
// so this page auto-prerenders to a static, cookie-agnostic asset and the
// islands hydrate on load. `prerender = true` makes that explicit.
export const prerender = true

export const head = defineHead(() => ({
  title: 'Support Matrix Badge Builder',
  meta: [
    {
      name: 'description',
      content:
        'Build the self-contained napi-rs support-matrix badge URL for your README: paste napi.targets, mark tiers, set engines, copy the <picture> / PNG snippet.',
    },
  ],
}))
