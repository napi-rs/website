import { useState, useCallback, useRef, useEffect } from 'react'
import prettyBytes from 'pretty-bytes'
import { ChevronsUpDownIcon, CheckIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TransformEngine } from './engine'
import { ChromaSubsampling, OUTPUT_MIME } from './protocol'
// Vite resolves an image import to its emitted URL STRING (not a {src,
// blurDataURL} object like the old Next image loader), so this is used directly.
import nasaImage from './nasa-4928x3279.png'
// Build-time LQIP (tiny blurred WebP data URI) for the result slot, produced by
// scripts/build-demo-lqip.mjs — replaces the old Next `nasaImage.blurDataURL`.
import { NASA_LQIP } from './lqip.gen'

const imageFormats = [
  {
    value: 'webp',
    label: 'Webp',
  },
  {
    value: 'avif',
    label: 'Avif',
  },
  {
    value: 'jpeg',
    label: 'Jpeg',
  },
]

export function ImageFormatSelector({ onSelect }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('webp')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[100px] justify-between"
          style={{ border: 'solid 1px oklch(0.922 0 0)', padding: '8px 12px' }}
        >
          {value
            ? imageFormats.find((format) => format.value === value)?.label
            : 'Select format...'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No format found.</CommandEmpty>
            <CommandGroup>
              {imageFormats.map((format) => (
                <CommandItem
                  key={format.value}
                  value={format.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue)
                    setOpen(false)
                    onSelect(format.value)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === format.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {format.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Shared outer shell so the SSR placeholder, the cross-origin-isolation
// fallback, and the live demo are visually identical — no hydration flicker.
function Shell({ children = null }) {
  return (
    <div
      className="flex mt-4 flex-col"
      style={{
        padding: '20px',
        backgroundColor:
          'hsl(var(--nextra-primary-hue)var(--nextra-primary-saturation)3%/.1)',
      }}
    >
      {children}
    </div>
  )
}

function StaticFallback() {
  return (
    <Shell>
      <div
        className="flex flex-col items-center text-center"
        style={{ padding: '40px 0' }}
      >
        <p className="font-mono">
          This in-browser @napi-rs/image demo needs cross-origin isolation
          (SharedArrayBuffer), which this environment does not provide.
        </p>
      </div>
    </Shell>
  )
}

export default function TransformImage() {
  // Mount gate: render an identical SSR shell until the component is mounted on
  // the client, so the `self.crossOriginIsolated` read below never runs during
  // SSR and never causes a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const imageRef = useRef(null)
  const transformedRef = useRef(null)
  const engineRef = useRef(null)
  const [fetchImagePromise, setFetchImagePromise] = useState(null)
  const [imageSize, setImageSize] = useState(0)
  const [transformedSize, setTransformedSize] = useState(0)
  const [transformedUrl, setTransformedUrl] = useState(null)
  const [format, setFormat] = useState('webp')
  const [quality, setQuality] = useState(75)
  const [isTransforming, setIsTransforming] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!mounted) {
      return
    }
    const promise = fetch(nasaImage)
      .then((res) => res.bytes())
      .then((bytes) => {
        const url = URL.createObjectURL(
          // fetch() bytes are always backed by a real (non-shared) ArrayBuffer;
          // narrow ArrayBufferLike so the Blob part typechecks under TS 6 libs.
          new Blob([new Uint8Array(bytes.buffer as ArrayBuffer)]),
        )
        if (imageRef.current) {
          imageRef.current.src = url
        }
        setImageSize(bytes.length)
        return bytes
      })
    setFetchImagePromise(promise)
  }, [mounted])

  // Tear down the worker when the component unmounts.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  const startTransform = useCallback(() => {
    if (!fetchImagePromise || isTransforming) {
      return
    }
    setIsTransforming(true)
    setProgress(0)
    setTransformedSize(0)
    let intervalId = null
    fetchImagePromise
      .then(async (bytes) => {
        setProgress(10)
        intervalId = setInterval(
          () => {
            setProgress((prev) => {
              if (prev < 90) {
                return prev + (format === 'avif' ? 1 : 5)
              }
              return prev
            })
          },
          format === 'webp' ? 400 : format === 'avif' ? 600 : 30,
        )

        if (!engineRef.current) {
          engineRef.current = new TransformEngine()
        }
        // The worker takes ownership of the transferred buffer, so hand it a
        // copy and keep the cached `bytes` intact for the next transform.
        const res = await engineRef.current.transform(
          format,
          quality,
          ChromaSubsampling.Yuv420,
          bytes.buffer.slice(0),
        )
        if (!res.ok) {
          throw new Error(res.error)
        }
        return res
      })
      .then((res) => {
        const nextUrl = URL.createObjectURL(
          new Blob([res.bytes], { type: OUTPUT_MIME[res.outFormat] }),
        )
        setTransformedUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return nextUrl
        })
        if (transformedRef.current) {
          transformedRef.current.src = nextUrl
        }
        setProgress(100)
        setTransformedSize(res.bytes.byteLength)
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setIsTransforming(false)
        clearInterval(intervalId)
      })
  }, [fetchImagePromise, isTransforming, format, quality])

  // Revoke the last transformed object URL on unmount.
  useEffect(() => {
    return () => {
      if (transformedUrl) {
        URL.revokeObjectURL(transformedUrl)
      }
    }
  }, [transformedUrl])

  // Hoisted to the top level so the hook is called unconditionally on every
  // render. It used to be declared inline in the post-mount JSX
  // (`onChange={useCallback(...)}`), but the component returns an early
  // `<Shell />` before mount, so that inline hook changed the hook count between
  // renders and tripped React's "Rendered more hooks than during the previous
  // render." Rules-of-Hooks error.
  const handleQualityChange = useCallback((e) => {
    const { value: valueString } = e.target
    const value = parseInt(valueString)
    if (value < 0) {
      e.target.value = 0
    } else if (value > 100) {
      e.target.value = 100
    }
    setQuality(value)
  }, [])

  // Before mount: render the identical shell so SSR and the first client paint
  // match. After mount: if the page is not cross-origin isolated, the wasm
  // transcoder can't run, so show a non-interactive fallback in the same shell.
  if (!mounted) {
    return <Shell />
  }
  if (!self.crossOriginIsolated) {
    return <StaticFallback />
  }

  return (
    <Shell>
      <div className="flex flex-col">
        {/* The original slot shows the full imported image immediately. The
            result slot below is instead seeded with a build-time LQIP (a tiny
            blurred WebP data URI from scripts/build-demo-lqip.mjs, generated
            with @napi-rs/image) — this replaces the old Next `blurDataURL` and
            reads as a blurry "no result yet" placeholder until a transcode swaps
            in the real result blob (transformedRef.current.src = nextUrl). */}
        <img alt="original image" width={4928} ref={imageRef} src={nasaImage} />
        <span className="font-mono text-center pt-2">
          Original Size: {prettyBytes(imageSize)}
        </span>
      </div>
      <div
        className="flex items-center flex-wrap justify-between"
        style={{ margin: '10px 0' }}
      >
        <ImageFormatSelector onSelect={setFormat} />
        <span className="flex items-center my-2">
          <span className="ml-2">Quality:</span>
          <Input
            className="image-quality-input"
            type="number"
            style={{ width: '80px', margin: '0 10px', padding: '0 10px' }}
            placeholder="Quality (0-100)"
            value={quality}
            onChange={handleQualityChange}
          />
        </span>
        <Button
          onClick={startTransform}
          style={{
            border: 'solid 1px oklch(0.922 0 0)',
            padding: '8px 12px',
            backgroundColor:
              'color-mix(in oklab,var(--primary)90%,transparent)',
            color: 'var(--primary-foreground)',
          }}
        >
          Transform image to {format}
        </Button>
      </div>
      <div className="flex flex-col">
        <Progress style={{ borderRadius: '0px' }} value={progress} />
        <img
          alt="transformed image"
          ref={transformedRef}
          width={4928}
          src={NASA_LQIP}
        />
        <span className="font-mono text-center w-full pt-2">
          Size: {prettyBytes(transformedSize)}
        </span>
      </div>
    </Shell>
  )
}
