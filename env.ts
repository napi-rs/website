import { defineEnv, string } from 'void/env'

// Declare every env key here so `env.X` / `c.env.X` are typed and validated.
// Read values via `import { env } from "void/env"`.
export default defineEnv({
  // GitHub Releases API token, used server-side by the changelog loaders.
  // Set in `.env.local` for dev and as a Void secret for prod (`void secret put GITHUB_TOKEN`).
  GITHUB_TOKEN: string().secret().optional(),
})
