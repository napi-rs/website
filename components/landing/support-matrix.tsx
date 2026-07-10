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

// Keep this list synchronized with the source repository's blocking
// `build_and_test` matrix. ABI compatibility is intentionally explained as a
// separate concept below and on the canonical support page.
const sourceCiNodeVersions = [22, 24, 26]

type LandingLocale = 'en' | 'cn' | 'pt-BR'

const copy = {
  en: {
    runtimeTitle: 'Runtime compatibility',
    abiTitle: 'Node-API ABI stability',
    abiDescription:
      'One binary can span compatible Node.js releases. The Node-API level sets the actual runtime floor.',
    sourceCi: 'Current napi-rs source CI:',
    runtimeDetail:
      'Use Node.js 22.13+ or 24+ for the current build CLI. Bun is best-effort in upstream CI; Deno is not in the blocking native-addon matrix.',
    supportLink: 'Read the complete support contract →',
    tableTitle: 'Generated template build targets',
    included: "Included in the maintained scaffold's build/package matrix.",
    excluded:
      'Not included in the maintained scaffold; it may require manual support or may be unavailable.',
    coverageLink: 'Accepted targets and test coverage →',
  },
  cn: {
    runtimeTitle: '运行时兼容性',
    abiTitle: 'Node-API ABI 稳定性',
    abiDescription:
      '一个二进制可以跨兼容的 Node.js 版本使用；Node-API 等级决定实际最低运行时。',
    sourceCi: 'napi-rs 源码仓库当前 CI：',
    runtimeDetail:
      '当前构建 CLI 建议使用 Node.js 22.13+ 或 24+。上游 CI 对 Bun 仅作尽力验证；Deno 不在阻塞式原生扩展矩阵中。',
    supportLink: '阅读完整支持约定 →',
    tableTitle: '模板生成的构建目标',
    included: '包含在维护中的脚手架构建与打包矩阵中。',
    excluded: '未包含在维护中的脚手架内；可能需要手动支持，也可能不可用。',
    coverageLink: '可接受的目标与测试覆盖范围 →',
  },
  'pt-BR': {
    runtimeTitle: 'Compatibilidade de runtime',
    abiTitle: 'Estabilidade de ABI do Node-API',
    abiDescription:
      'Um mesmo binário pode abranger versões compatíveis do Node.js. O nível do Node-API define o runtime mínimo real.',
    sourceCi: 'CI atual do código-fonte do napi-rs:',
    runtimeDetail:
      'Use Node.js 22.13+ ou 24+ com a CLI de build atual. Bun é best-effort no CI upstream; Deno não faz parte da matriz bloqueante de addons nativos.',
    supportLink: 'Leia o contrato completo de suporte →',
    tableTitle: 'Destinos de build gerados pelo template',
    included:
      'Incluído na matriz mantida de build e empacotamento do scaffold.',
    excluded:
      'Não incluído no scaffold mantido; pode exigir suporte manual ou estar indisponível.',
    coverageLink: 'Destinos aceitos e cobertura de testes →',
  },
} as const

const platformRows = [
  { name: 'Windows MSVC', support: [true, true, true, '-', '-'] },
  { name: 'macOS', support: ['-', true, true, '-', '-'] },
  { name: 'Linux glibc', support: ['-', true, true, true, '-'] },
  { name: 'Linux musl', support: ['-', true, true, '-', '-'] },
  { name: 'FreeBSD', support: ['-', true, '-', '-', '-'] },
  { name: 'Android', support: ['-', '-', true, true, '-'] },
  { name: 'WebAssembly', support: ['-', '-', '-', '-', true] },
]

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

// The `.node` class drives the green gradient border + title (see
// support-matrix.css). Keep ABI compatibility, CLI requirements, and current
// CI coverage visibly distinct: none is a substitute for either of the others.
const NodeSupport = ({ locale }: { locale: LandingLocale }) => {
  const text = copy[locale]
  const supportHref =
    locale === 'en'
      ? '/docs/more/support-compatibility'
      : `/${locale}/docs/more/support-compatibility`
  return (
    <Card className="node bg-card border-border" data-lg-reveal="fade-to-top">
      <CardHeader>
        <CardTitle className="gradient-title text-xl text-card-foreground">
          {text.runtimeTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="node-range flex items-center gap-3">
          <CheckCircle className="h-7 w-7 shrink-0 text-green-500" />
          <div className="flex flex-col">
            <span className="gradient-title text-2xl leading-tight font-semibold">
              {text.abiTitle}
            </span>
            <span className="text-muted-foreground text-sm">
              {text.abiDescription}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground mt-5 text-sm">{text.sourceCi}</p>
        <ul className="node-tags mt-5 flex flex-wrap gap-2">
          {sourceCiNodeVersions.map((version) => (
            <li key={version} className="node-tag">
              Node {version}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-sm">
          {text.runtimeDetail}
        </p>
        <a
          href={supportHref}
          className="mt-4 inline-block text-sm text-green-500 hover:underline"
        >
          {text.supportLink}
        </a>
      </CardContent>
    </Card>
  )
}

export function SupportMatrix({ locale = 'en' }: { locale?: LandingLocale }) {
  const text = copy[locale]
  const supportHref =
    locale === 'en'
      ? '/docs/more/support-compatibility'
      : `/${locale}/docs/more/support-compatibility`
  const platformSupport = {
    title: text.tableTitle,
    headers: ['ia32', 'x64', 'arm64', 'arm', 'WASI'],
    rows: platformRows,
  }
  return (
    <div className="support-matrix">
      <div className="pb-8">
        <NodeSupport locale={locale} />
      </div>
      <div>
        <SupportTable {...platformSupport} />
        <div className="mt-3 support-tips flex flex-wrap items-center gap-2 md:gap-4">
          <p className="flex items-center">
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
            {text.included}
          </p>
          <p className="flex items-center">
            <Ban className="h-3 w-3 text-muted-foreground opacity-50 mr-1" />{' '}
            {text.excluded}
          </p>
          <a href={supportHref} className="text-green-500 hover:underline">
            {text.coverageLink}
          </a>
        </div>
      </div>
    </div>
  )
}
