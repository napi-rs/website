import { useSSG } from 'nextra/ssg'

export function Sponsors() {
  const sponsorsSVG = useSSG()
  sponsorsSVG
    .replace(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="468">',
      '',
    )
    .replace('</svg>', '')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 800 468"
      dangerouslySetInnerHTML={{ __html: sponsorsSVG }}
    ></svg>
  )
}
