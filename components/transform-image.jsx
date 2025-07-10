import { ChromaSubsampling, Transformer } from '@napi-rs/image'
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
import nasaImage from './nasa-4928x3279.png'

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

export default function TransformImage() {
  const imageRef = useRef(null)
  const transformedRef = useRef(null)
  const [fetchImagePromise, setFetchImagePromise] = useState(null)
  const [imageSize, setImageSize] = useState(0)
  const [transformedSize, setTransformedSize] = useState(0)
  const [format, setFormat] = useState('webp')
  const [quality, setQuality] = useState(75)
  const [isTransforming, setIsTransforming] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const promise = fetch(nasaImage.src)
      .then((res) => res.bytes())
      .then((bytes) => {
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes.buffer)]),
        )
        imageRef.current.src = url
        setImageSize(bytes.length)
        return bytes
      })
    setFetchImagePromise(promise)
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
      .then((bytes) => {
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

        const transformer = new Transformer(bytes)
        switch (format) {
          case 'webp':
            return transformer.webp(quality)
          case 'avif':
            return transformer.avif({
              threads: 4,
              quality,
              alphaQuality: quality,
              chromaSubsampling: ChromaSubsampling.Yuv420,
            })
          case 'jpeg':
            return transformer.jpeg(quality)
        }
      })
      .then((transformedBytes) => {
        const mimeType =
          format === 'webp'
            ? 'image/webp'
            : format === 'avif'
              ? 'image/avif'
              : 'image/jpeg'
        const transformedUrl = URL.createObjectURL(
          new Blob([Uint8Array.from(transformedBytes)], {
            type: mimeType,
          }),
        )
        transformedRef.current.src = transformedUrl
        setProgress(100)
        setTransformedSize(transformedBytes.length)
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setIsTransforming(false)
        clearInterval(intervalId)
      })
  }, [fetchImagePromise, isTransforming, format, quality])

  if (isTransforming && transformedRef.current) {
    transformedRef.current.src = nasaImage.blurDataURL
  }

  return (
    <div
      className="flex mt-4 flex-col"
      style={{
        padding: '20px',
        backgroundColor:
          'hsl(var(--nextra-primary-hue)var(--nextra-primary-saturation)3%/.1)',
      }}
    >
      <div className="flex flex-col">
        <img
          alt="original image"
          width={4928}
          ref={imageRef}
          src={nasaImage.blurDataURL}
        />
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
            onChange={setQuality}
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
          alt="transformed webp image"
          src={nasaImage.blurDataURL}
          ref={transformedRef}
          width={4928}
        />
        <span className="font-mono text-center w-full pt-2">
          Size: {prettyBytes(transformedSize)}
        </span>
      </div>
    </div>
  )
}
