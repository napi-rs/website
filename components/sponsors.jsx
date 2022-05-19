import { useSSG } from 'nextra/ssg'

export function Sponsors() {
  const sponsorsSVG = useSSG()
  const reg =
    /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink" width="([0-9]+)" height="([0-9]+)">/
  const [_, width, height] = reg.exec(sponsorsSVG)
  const svgInner = sponsorsSVG.replace(reg, '').replace('</svg>', '')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${width} ${height}`}
      dangerouslySetInnerHTML={{ __html: svgInner }}
    ></svg>
  )
}
