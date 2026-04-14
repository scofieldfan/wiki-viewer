import { useState } from 'react'
import MermaidBlock from './MermaidBlock'

interface Props {
  language: string | undefined
  code: string
  children: React.ReactNode
}

export default function CodeBlock({ language, code, children }: Props) {
  const [copied, setCopied] = useState(false)

  if (language === 'mermaid') {
    return <MermaidBlock code={code} />
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative group my-4">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-[10px] text-[#555] font-mono select-none">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-[11px] rounded opacity-0 group-hover:opacity-100 transition-opacity bg-[#333] text-[#aaa] hover:bg-[#444] hover:text-white"
      >
        {copied ? '已复制' : '复制'}
      </button>
      <pre className="!mt-0">{children}</pre>
    </div>
  )
}
