import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: '#1a1a1a',
    primaryColor: '#3b82f6',
    primaryTextColor: '#e8e8e8',
    primaryBorderColor: '#444',
    lineColor: '#888',
    secondaryColor: '#2d2d2d',
    tertiaryColor: '#222',
    fontFamily: '"PingFang SC", "Noto Sans SC", system-ui, sans-serif',
  },
  securityLevel: 'loose',
})

let counter = 0

export default function MermaidBlock({ code }: { code: string }) {
  const id = useRef(`mermaid-${++counter}`)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    mermaid.render(id.current, code).then(({ svg }) => {
      if (!cancelled) setSvg(svg)
    }).catch((e: Error) => {
      if (!cancelled) setError(e.message)
    })
    return () => { cancelled = true }
  }, [code])

  if (error) {
    return (
      <pre className="text-red-400 text-xs p-3 bg-[#1e1e1e] rounded border border-red-900 overflow-x-auto">
        Mermaid error: {error}
      </pre>
    )
  }

  if (!svg) return <div className="text-[#555] text-xs p-3">渲染图表中...</div>

  return (
    <div
      className="my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
