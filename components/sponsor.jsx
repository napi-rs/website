import { Button } from './ui/button'

export default function Sponsor() {
  return (
    <a
      className="w-full flex justify-center mt-2"
      style={{ backgroundColor: 'var(--color-pink-100)' }}
      href="https://github.com/sponsors/napi-rs"
      target="_blank"
    >
      <Button style={{ color: 'var(--color-pink-400)' }}>
        ♥️ Sponsor the <strong>NAPI-RS</strong> project
      </Button>
    </a>
  )
}
