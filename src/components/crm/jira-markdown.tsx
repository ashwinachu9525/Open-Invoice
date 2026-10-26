"use client"

import * as React from "react"
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Table as TableIcon,
  Code,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Eye,
  Edit2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────
// Jira-Style Markdown Renderer
// ─────────────────────────────────────────────────────────────

export function JiraMarkdownViewer({ content, className }: { content: string; className?: string }) {
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null)

  if (!content || !content.trim()) {
    return <p className="text-xs text-muted-foreground italic">No description provided.</p>
  }

  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  // Parse lines into blocks: code blocks, tables, headings, checklists, lists, blockquotes, paragraphs
  const blocks: React.ReactNode[] = []
  const lines = content.split("\n")
  let i = 0
  let codeBlockCounter = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1. Fenced Code Blocks (```)
    if (line.trim().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim() || "text"
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```
      const fullCode = codeLines.join("\n")
      const currentIdx = codeBlockCounter++

      blocks.push(
        <div
          key={`code-${i}-${currentIdx}`}
          className="my-3 rounded-xl border border-white/10 bg-black/70 overflow-hidden shadow-inner group relative"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[10px] text-muted-foreground font-mono">
            <span>{lang}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleCopyCode(fullCode, currentIdx)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Copy code"
            >
              {copiedIdx === currentIdx ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <pre className="p-3 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
            <code>{fullCode}</code>
          </pre>
        </div>
      )
      continue
    }

    // 2. Tables (| ... |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i])
        i++
      }

      if (tableLines.length >= 2) {
        const headerRow = parseTableRow(tableLines[0])
        const dataRows = tableLines.slice(2).map(parseTableRow)

        blocks.push(
          <div
            key={`table-${i}`}
            className="my-3 overflow-x-auto rounded-xl border border-white/10 glass bg-white/[0.02]"
          >
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 font-semibold text-foreground">
                  {headerRow.map((col, idx) => (
                    <th key={idx} className="px-3 py-2 text-[11px] font-bold text-foreground">
                      {renderInlineTokens(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-muted-foreground">
                        {renderInlineTokens(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }
    }

    // 3. Headings (#, ##, ###)
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-foreground mt-3 mb-1">
          {renderInlineTokens(line.replace(/^###\s+/, ""))}
        </h4>
      )
      i++
      continue
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-foreground mt-4 mb-1.5 border-b border-white/5 pb-1">
          {renderInlineTokens(line.replace(/^##\s+/, ""))}
        </h3>
      )
      i++
      continue
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={`h1-${i}`} className="text-lg font-extrabold text-foreground mt-4 mb-2 border-b border-white/10 pb-1.5">
          {renderInlineTokens(line.replace(/^#\s+/, ""))}
        </h2>
      )
      i++
      continue
    }

    // 4. Blockquotes (> ...)
    if (line.startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].replace(/^>\s*/, ""))
        i++
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 border-l-2 border-indigo-400 pl-3 py-0.5 italic text-xs text-muted-foreground bg-indigo-500/5 rounded-r-lg"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineTokens(ql)}</p>
          ))}
        </blockquote>
      )
      continue
    }

    // 5. Checklists (- [ ] or - [x])
    if (/^\s*-\s*\[([ xX])\]\s+(.*)/.test(line)) {
      const checkItems: { done: boolean; text: string }[] = []
      while (i < lines.length && /^\s*-\s*\[([ xX])\]\s+(.*)/.test(lines[i])) {
        const match = lines[i].match(/^\s*-\s*\[([ xX])\]\s+(.*)/)
        if (match) {
          checkItems.push({
            done: match[1].toLowerCase() === "x",
            text: match[2],
          })
        }
        i++
      }
      blocks.push(
        <div key={`check-${i}`} className="my-2 space-y-1.5">
          {checkItems.map((item, cIdx) => (
            <div key={cIdx} className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={item.done}
                readOnly
                className="mt-0.5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 cursor-default"
              />
              <span className={cn(item.done ? "line-through text-muted-foreground" : "text-foreground")}>
                {renderInlineTokens(item.text)}
              </span>
            </div>
          ))}
        </div>
      )
      continue
    }

    // 6. Bullet Lists (- item or * item)
    if (/^\s*[-*]\s+(.*)/.test(line)) {
      const listItems: string[] = []
      while (i < lines.length && /^\s*[-*]\s+(.*)/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ""))
        i++
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-2 list-disc list-inside space-y-1 text-xs text-foreground/90 pl-1">
          {listItems.map((li, lIdx) => (
            <li key={lIdx}>{renderInlineTokens(li)}</li>
          ))}
        </ul>
      )
      continue
    }

    // 7. Numbered Lists (1. item)
    if (/^\s*\d+\.\s+(.*)/.test(line)) {
      const numItems: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+(.*)/.test(lines[i])) {
        numItems.push(lines[i].replace(/^\s*\d+\.\s+/, ""))
        i++
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-2 list-decimal list-inside space-y-1 text-xs text-foreground/90 pl-1">
          {numItems.map((ni, nIdx) => (
            <li key={nIdx}>{renderInlineTokens(ni)}</li>
          ))}
        </ol>
      )
      continue
    }

    // 8. Empty lines
    if (!line.trim()) {
      i++
      continue
    }

    // 9. Standard Paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-foreground/90 my-1">
        {renderInlineTokens(line)}
      </p>
    )
    i++
  }

  return <div className={cn("space-y-1 text-xs", className)}>{blocks}</div>
}

// ─────────────────────────────────────────────────────────────
// Inline Formatter: Bold, Italic, Link, Inline Code, Strikethrough
// ─────────────────────────────────────────────────────────────

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((s) => s.trim())
}

function renderInlineTokens(text: string): React.ReactNode {
  if (!text) return null

  // Tokenize text into inline segments
  // Patterns: Links [label](url), Bold **text**, Italic *text*, Code `code`, Strike ~~text~~
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~)/g
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (!part) return null

    // Link: [label](url)
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/)
      if (match) {
        const [, label, url] = match
        const href = url.startsWith("http") || url.startsWith("/") ? url : `https://${url}`
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-0.5 mx-0.5"
          >
            <span>{label}</span>
            <ExternalLink className="h-2.5 w-2.5 inline opacity-70" />
          </a>
        )
      }
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }

    // Italic: *text* (or "italian")
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      )
    }

    // Inline Code: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 font-mono text-[11px] text-pink-400 border border-white/5"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={index} className="line-through text-muted-foreground">
          {part.slice(2, -2)}
        </del>
      )
    }

    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

// ─────────────────────────────────────────────────────────────
// Jira Rich Markdown Editor with Toolbar
// ─────────────────────────────────────────────────────────────

interface JiraMarkdownEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}

export function JiraMarkdownEditor({
  value,
  onChange,
  placeholder = "Write a description with **bold**, *italic*, [links](url), tables, and `code`...",
  minHeight = "min-h-[140px]",
  className,
}: JiraMarkdownEditorProps) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const insertFormatting = (prefix: string, suffix = "", defaultText = "") => {
    const el = textareaRef.current
    if (!el) {
      onChange(`${value}${prefix}${defaultText}${suffix}`)
      return
    }

    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const selected = value.substring(start, end) || defaultText

    const replacement = `${prefix}${selected}${suffix}`
    const newValue = value.substring(0, start) + replacement + value.substring(end)
    onChange(newValue)

    setTimeout(() => {
      el.focus()
      const newCursorPos = start + prefix.length + selected.length
      el.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  const insertTable = () => {
    const tableTemplate = `\n| Item / Task | Priority | Status |\n| --- | --- | --- |\n| Client Requirement | High | Ready |\n| Scope Definition | Medium | In Progress |\n`
    insertFormatting(tableTemplate)
  }

  const insertCodeBlock = () => {
    const codeTemplate = `\n\`\`\`ts\n// Code snippet or JSON payload\nconst config = {\n  verified: true,\n};\n\`\`\`\n`
    insertFormatting(codeTemplate)
  }

  const insertChecklist = () => {
    const checkTemplate = `\n- [ ] Acceptance criteria 1\n- [ ] Acceptance criteria 2\n- [x] Verified requirement\n`
    insertFormatting(checkTemplate)
  }

  return (
    <div className={cn("rounded-xl border border-white/10 glass overflow-hidden", className)}>
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-1.5 bg-white/5 border-b border-white/10 gap-1 text-xs">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => insertFormatting("**", "**", "bold text")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10 font-bold"
            title="Bold (**text**)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => insertFormatting("*", "*", "italic text")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10 italic"
            title="Italic (*text*)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => insertFormatting("[", "](https://example.com)", "link title")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Insert Link ([text](url))"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={insertTable}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Insert Markdown Table"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={insertCodeBlock}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Insert Code Snippet (```)"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={insertChecklist}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Insert Checklist (- [ ])"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => insertFormatting("\n- ", "", "List item")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Bullet List (- item)"
          >
            <List className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => insertFormatting("\n> ", "", "Quoted requirement")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/10"
            title="Blockquote (> text)"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Edit vs Preview Toggle */}
        <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn(
              "px-2 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
              mode === "edit" ? "bg-white/15 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Edit2 className="h-3 w-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "px-2 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
              mode === "preview" ? "bg-white/15 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {mode === "edit" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-xs p-3 font-sans leading-relaxed resize-y",
            minHeight
          )}
        />
      ) : (
        <div className={cn("p-3.5 bg-black/20 text-xs overflow-y-auto", minHeight)}>
          <JiraMarkdownViewer content={value} />
        </div>
      )}
    </div>
  )
}
