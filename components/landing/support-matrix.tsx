import cx from 'classnames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, Ban } from 'lucide-react'

// Supported Node.js majors — every LTS + Current line napi-rs tests in CI.
// Add new majors here; the card derives its range headline + tags from this.
const nodeVersions = [10, 12, 14, 16, 18, 20, 22, 24, 26]

const platformSupport = {
  title: 'Platform support',
  headers: ['i686', 'x64', 'aarch64', 'arm', 'riscv64', 's390x', 'ppc64le'],
  rows: [
    { name: 'Windows', support: [true, true, true, '-', '-', '-', '-'] },
    { name: 'macOS', support: ['-', true, true, '-', '-', '-', '-'] },
    { name: 'Linux', support: ['-', true, true, true, true, true, true] },
    { name: 'Linux musl', support: ['-', true, true, true, '-', '-', '-'] },
    { name: 'FreeBSD', support: ['-', true, '-', '-', '-', '-', '-'] },
    { name: 'Android', support: ['-', '-', true, true, '-', '-', '-'] },
  ],
}

interface SupportTableProps {
  className?: string
  title: string
  headers: string[]
  rows: Array<{
    name: string
    support: (boolean | string)[]
  }>
}

const SupportTable = ({
  title,
  headers,
  rows,
  className,
}: SupportTableProps) => {
  return (
    <Card
      className={cx('bg-card border-border', className)}
      data-lg-reveal="fade-to-top"
    >
      <CardHeader>
        <CardTitle className="gradient-title text-xl text-card-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]"></TableHead>
              {headers.map((header, index) => (
                <TableHead
                  key={index}
                  className="gradient-title text-center font-medium"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={index}
                className="hover:bg-muted/30 transition-colors"
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                {row.support.map((supported, cellIndex) => (
                  <TableCell key={cellIndex} className="text-center">
                    {supported === true || supported === '✓' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : supported === false || supported === '-' ? (
                      <Ban className="h-4 w-4 text-muted-foreground mx-auto opacity-50" />
                    ) : (
                      <span className="text-green-500">✅</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Node.js card — a range headline + per-version tags. Replaces the old sparse
// single-row table so it stays balanced as new Node majors land (the matrix
// shape only ever had one "Support" row, all green). The `.node` class drives
// the green gradient border + title (see support-matrix.css).
const NodeSupport = () => {
  const first = nodeVersions[0]
  const last = nodeVersions[nodeVersions.length - 1]
  return (
    <Card className="node bg-card border-border" data-lg-reveal="fade-to-top">
      <CardHeader>
        <CardTitle className="gradient-title text-xl text-card-foreground">
          Node.js
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="node-range flex items-center gap-3">
          <CheckCircle className="h-7 w-7 shrink-0 text-green-500" />
          <div className="flex flex-col">
            <span className="gradient-title text-2xl leading-tight font-semibold">
              v{first} → v{last}
            </span>
            <span className="text-muted-foreground text-sm">
              All LTS &amp; Current releases — officially tested in the napi-rs
              repo.
            </span>
          </div>
        </div>
        <ul className="node-tags mt-5 flex flex-wrap gap-2">
          {nodeVersions.map((version) => (
            <li key={version} className="node-tag">
              {version}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function SupportMatrix() {
  return (
    <div className="support-matrix">
      <div className="pb-8">
        <NodeSupport />
      </div>
      <div>
        <SupportTable {...platformSupport} />
        <div className="mt-3 support-tips flex flex-wrap items-center gap-2 md:gap-4">
          <p className="flex items-center">
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" /> Means
            official tested in napi-rs repo.
          </p>
          <p className="flex items-center">
            <Ban className="h-3 w-3 text-muted-foreground opacity-50 mr-1" />{' '}
            Means no official Node.js release.
          </p>
        </div>
      </div>
    </div>
  )
}
