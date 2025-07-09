import { useSSG } from 'nextra/data'
import { ExternalLink } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function LinkPreview({ href }: { href: string }) {
  const { linkPreview } = useSSG()
  const { json: linkMeta, og, userAvatar } = linkPreview[href]
  return (
    <div
      className="flex justify-center w-full cursor-pointer"
      onClick={() => {
        window.open(href, '_blank')
      }}
    >
      <Card
        className="w-full gap-2 py-3 backdrop-blur"
        style={{ border: 'solid 1px oklch(0.922 0 0)', marginTop: '10px' }}
      >
        <CardHeader>
          <CardTitle className="text-shadow-lg">
            {linkMeta.title}{' '}
            <span className="text-sm font-light">
              <span
                style={{
                  backgroundImage: `url(data:image/png;base64,${userAvatar})`,
                  backgroundSize: 'cover',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'inline-block',
                  verticalAlign: 'text-bottom',
                  marginLeft: '4px',
                }}
              />{' '}
              @{linkMeta.user.login}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between">
          <div className="flex-col justify-between w-1/2 flex">
            <p className="link-preview-body line-clamp-4 text-sm">
              {linkMeta.body}
            </p>
            <p className="flex text-sm align-center">
              <span className="inline-block align-middle">
                <Github
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'inline-block',
                  }}
                />
              </span>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-block',
                }}
              >
                {linkMeta.repoUrl}
              </span>
              <ExternalLink
                style={{ marginLeft: '30px', marginTop: '2px' }}
                size={16}
              />
            </p>
          </div>
          <div className="flex w-2/5">
            <img src={`data:image/png;base64,${og}`} alt="preview" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function Github({ style }) {
  return (
    <svg
      className="w-5 h-5 mr-2"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}
