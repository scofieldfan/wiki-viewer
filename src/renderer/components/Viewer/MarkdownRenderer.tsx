import { useMemo, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import matter from 'gray-matter'
import CodeBlock from './CodeBlock'

interface Props {
  content: string
  filePath: string
  onNavigate: (resolvedPath: string) => void
}

const pathUtils = {
  dirname(p: string): string {
    const idx = p.lastIndexOf('/')
    return idx >= 0 ? p.slice(0, idx) : '.'
  },
  isAbsolute(p: string): boolean {
    return p.startsWith('/')
  },
  resolve(base: string, rel: string): string {
    if (rel.startsWith('/')) return rel
    const parts = [...base.split('/'), ...rel.split('/')]
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '..') resolved.pop()
      else if (part && part !== '.') resolved.push(part)
    }
    return '/' + resolved.join('/')
  }
}

function processWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => {
    const label = (alias ?? target).trim()
    const href = target.trim()
    return `[${label}](${href})`
  })
}

function WikiImage({ src, alt, filePath }: { src?: string; alt?: string; filePath: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('')

  useEffect(() => {
    if (!src) return
    if (src.startsWith('http')) { setResolvedSrc(src); return }
    window.wikiAPI.resolveImage(filePath, src).then((abs) => {
      setResolvedSrc(`wiki-file://local${abs}`)
    })
  }, [src, filePath])

  if (!resolvedSrc) return null
  return <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" className="rounded-md max-w-full" />
}

export default function MarkdownRenderer({ content, filePath, onNavigate }: Props) {
  const processedContent = useMemo(() => {
    if (!content) return ''
    try {
      const { content: stripped } = matter(content)
      return processWikiLinks(stripped)
    } catch {
      return processWikiLinks(content.replace(/^---[\s\S]*?---\n?/, ''))
    }
  }, [content])

  const fileDir = filePath ? pathUtils.dirname(filePath) : ''

  const handleLinkClick = (href: string) => {
    if (!href) return
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.wikiAPI.openExternal(href)
      return
    }
    const resolved = pathUtils.isAbsolute(href) ? href : pathUtils.resolve(fileDir, href)
    if (resolved.endsWith('.md')) onNavigate(resolved)
  }

  return (
    <ReactMarkdown
      className="prose prose-invert max-w-none"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }], rehypeHighlight]}
      components={{
        a({ href, children, ...props }) {
          const isExternal = href?.startsWith('http')
          return (
            <a
              {...props}
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={(e) => { e.preventDefault(); handleLinkClick(href ?? '') }}
            >
              {children}
            </a>
          )
        },
        img({ src, alt }) {
          return <WikiImage src={src} alt={alt} filePath={filePath} />
        },
        pre({ children }) {
          // Pass-through — CodeBlock wraps the pre
          return <>{children}</>
        },
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className ?? '')
          const language = match?.[1]
          const raw = String(children)
          // Block code: has a language class OR spans multiple lines
          const isBlock = !!language || raw.includes('\n')

          if (isBlock) {
            const code = raw.replace(/\n$/, '')
            return (
              <CodeBlock language={language} code={code}>
                <code className={className}>{children}</code>
              </CodeBlock>
            )
          }

          return <code className="not-prose bg-[#252525] text-[#e2c58b] px-[0.45em] py-[0.15em] rounded text-[0.875em] font-mono">{children}</code>
        }
      }}
    >
      {processedContent}
    </ReactMarkdown>
  )
}
