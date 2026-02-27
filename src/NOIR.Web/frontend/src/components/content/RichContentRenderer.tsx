/**
 * RichContentRenderer Component
 *
 * Parses HTML content and replaces special blocks with enhanced UIKit components:
 * - `<pre><code class="language-mermaid">` -> MermaidBlock
 * - `<pre><code class="language-*">` -> CodeBlock
 * - `$$...$$` / `$...$` text patterns -> MathBlock
 *
 * Drop-in replacement for `dangerouslySetInnerHTML={{ __html }}` with prose styling.
 * Heavy components (MermaidBlock, CodeBlock, MathBlock) are lazy-loaded via React.lazy.
 */

import { type ReactNode, type ErrorInfo, createElement, useMemo, Suspense, lazy, Component } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@uikit'

// ---------------------------------------------------------------------------
// Lazy-loaded heavy components
// ---------------------------------------------------------------------------

const LazyMermaidBlock = lazy(() =>
  import('@uikit/mermaid-block/MermaidBlock').then((m) => ({ default: m.MermaidBlock }))
)
const LazyCodeBlock = lazy(() =>
  import('@uikit/code-block/CodeBlock').then((m) => ({ default: m.CodeBlock }))
)
const LazyMathBlock = lazy(() =>
  import('@uikit/math-block/MathBlock').then((m) => ({ default: m.MathBlock }))
)

// ---------------------------------------------------------------------------
// Fallback skeletons for Suspense boundaries
// ---------------------------------------------------------------------------

const BlockSkeleton = () => (
  <div className="rounded-lg border bg-muted/30 p-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
)

const InlineSkeleton = () => <Skeleton className="inline-block h-4 w-16 align-middle" />

// ---------------------------------------------------------------------------
// Error boundary for rich content blocks
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Lightweight error boundary that catches render errors in rich content blocks
 * (Mermaid, CodeBlock, MathBlock) so a single broken block doesn't crash
 * the entire article view.
 */
class RichBlockErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RichContentRenderer] Block render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to render content block
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Math detection regexes
// ---------------------------------------------------------------------------

/** Display math: $$...$$ (block-level, centered) */
const DISPLAY_MATH_RE = /\$\$([\s\S]+?)\$\$/g

/** Inline math: $...$ (not preceded/followed by $, content cannot be empty or start/end with space) */
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g

// ---------------------------------------------------------------------------
// HTML attribute to React prop conversion
// ---------------------------------------------------------------------------

/** Map of HTML attribute names to their React equivalents */
const ATTR_NAME_MAP: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  enctype: 'encType',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  accesskey: 'accessKey',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  formaction: 'formAction',
  novalidate: 'noValidate',
  srcdoc: 'srcDoc',
  srcset: 'srcSet',
  usemap: 'useMap',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
}

/**
 * Convert an HTML style string to a React CSSProperties object.
 * e.g., "color: red; font-size: 14px;" -> { color: "red", fontSize: "14px" }
 */
const parseStyleString = (styleStr: string): Record<string, string> => {
  const style: Record<string, string> = {}
  const declarations = styleStr.split(';')

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':')
    if (colonIndex === -1) continue

    const property = declaration.slice(0, colonIndex).trim()
    const value = declaration.slice(colonIndex + 1).trim()

    if (!property || !value) continue

    // Convert kebab-case to camelCase (e.g., font-size -> fontSize)
    const camelCase = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    style[camelCase] = value
  }

  return style
}

/**
 * Convert a NamedNodeMap of HTML attributes to a React-compatible props object.
 */
const convertAttributes = (attributes: NamedNodeMap): Record<string, unknown> => {
  const props: Record<string, unknown> = {}

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i]
    const name = attr.name.toLowerCase()

    // Skip event handlers from HTML content (security)
    if (name.startsWith('on')) continue

    if (name === 'style') {
      props.style = parseStyleString(attr.value)
    } else {
      const reactName = ATTR_NAME_MAP[name] ?? name
      props[reactName] = attr.value
    }
  }

  return props
}

// ---------------------------------------------------------------------------
// Self-closing HTML elements (void elements)
// ---------------------------------------------------------------------------

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContentMetadata {
  /** Hint: content contains code blocks (pre > code) */
  hasCodeBlocks?: boolean
  /** Hint: content contains math formulas ($$...$$ or $...$) */
  hasMathFormulas?: boolean
  /** Hint: content contains mermaid diagrams */
  hasMermaidDiagrams?: boolean
}

export interface RichContentRendererProps {
  /** HTML content to render with enhanced blocks */
  html: string
  /** Additional CSS classes for the wrapper */
  className?: string
  /** Optional metadata hints to skip detection for unused features */
  contentMetadata?: ContentMetadata
}

// ---------------------------------------------------------------------------
// Core: DOM node to React element conversion
// ---------------------------------------------------------------------------

/**
 * Check whether math detection should be performed on text nodes.
 */
const shouldDetectMath = (metadata?: ContentMetadata): boolean => {
  // If no metadata provided, always detect
  if (!metadata) return true
  // If explicitly set to false, skip
  if (metadata.hasMathFormulas === false) return false
  return true
}

/**
 * Check whether code/mermaid detection should be performed.
 */
const shouldDetectCode = (metadata?: ContentMetadata): boolean => {
  if (!metadata) return true
  if (metadata.hasCodeBlocks === false && metadata.hasMermaidDiagrams === false) return false
  return true
}

/**
 * Process a text node: detect and replace math formulas with MathBlock components.
 * Returns either a plain string or an array of mixed string/ReactNode elements.
 */
const processTextNode = (text: string, detectMath: boolean, keyPrefix: string): ReactNode => {
  if (!detectMath || (!text.includes('$'))) {
    return text
  }

  // Combine display and inline math detection in a single pass
  // Process display math first ($$...$$), then inline math ($...$)
  const segments: ReactNode[] = []
  let lastIndex = 0
  let segmentKey = 0

  // First pass: find all display math
  const displayMatches: Array<{ start: number; end: number; formula: string }> = []
  let match: RegExpExecArray | null

  // Reset regex state
  DISPLAY_MATH_RE.lastIndex = 0
  while ((match = DISPLAY_MATH_RE.exec(text)) !== null) {
    displayMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      formula: match[1],
    })
  }

  // Second pass: find all inline math (excluding regions covered by display math)
  const inlineMatches: Array<{ start: number; end: number; formula: string }> = []
  INLINE_MATH_RE.lastIndex = 0
  while ((match = INLINE_MATH_RE.exec(text)) !== null) {
    const isInsideDisplay = displayMatches.some(
      (dm) => match!.index >= dm.start && match!.index < dm.end
    )
    if (!isInsideDisplay) {
      inlineMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        formula: match[1],
      })
    }
  }

  // Merge and sort all matches by position
  const allMatches = [
    ...displayMatches.map((m) => ({ ...m, displayMode: true })),
    ...inlineMatches.map((m) => ({ ...m, displayMode: false })),
  ].sort((a, b) => a.start - b.start)

  if (allMatches.length === 0) {
    return text
  }

  for (const m of allMatches) {
    // Add text before this match
    if (m.start > lastIndex) {
      segments.push(text.slice(lastIndex, m.start))
    }

    segments.push(
      <RichBlockErrorBoundary key={`${keyPrefix}-math-${segmentKey}`}>
        <Suspense fallback={m.displayMode ? <BlockSkeleton /> : <InlineSkeleton />}>
          <LazyMathBlock
          formula={m.formula.trim()}
            displayMode={m.displayMode}
          />
        </Suspense>
      </RichBlockErrorBoundary>
    )
    segmentKey++
    lastIndex = m.end
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }

  return segments.length === 1 ? segments[0] : segments
}

/**
 * Extract the language identifier from a <code> element's class attribute.
 * Looks for "language-xxx" pattern. Returns null if not found.
 */
const extractLanguage = (codeElement: Element): string | null => {
  const classList = codeElement.getAttribute('class') || ''
  const langMatch = classList.match(/language-(\S+)/)
  return langMatch ? langMatch[1] : null
}

/**
 * Recursively convert a DOM node into a React element tree.
 * Replaces special patterns (code blocks, mermaid, math) with UIKit components.
 */
const convertNode = (
  node: Node,
  key: string,
  detectMath: boolean,
  detectCode: boolean,
): ReactNode => {
  // ---- Text nodes ----
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text) return null
    return processTextNode(text, detectMath, key)
  }

  // ---- Comment nodes → skip ----
  if (node.nodeType === Node.COMMENT_NODE) {
    return null
  }

  // ---- Element nodes ----
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  const tagName = element.tagName.toLowerCase()

  // ---- Special case: <pre> containing <code> ----
  if (tagName === 'pre' && detectCode) {
    const codeChild = element.querySelector(':scope > code')

    if (codeChild) {
      const language = extractLanguage(codeChild)
      const codeText = codeChild.textContent ?? ''

      // Mermaid diagram
      if (language === 'mermaid') {
        return (
          <RichBlockErrorBoundary key={key}>
            <Suspense fallback={<BlockSkeleton />}>
              <LazyMermaidBlock code={codeText} />
            </Suspense>
          </RichBlockErrorBoundary>
        )
      }

      // Code block with or without language
      return (
        <RichBlockErrorBoundary key={key}>
          <Suspense fallback={<BlockSkeleton />}>
            <LazyCodeBlock
              code={codeText}
              language={language ?? 'text'}
              showLineNumbers={false}
              showCopyButton={true}
            />
          </Suspense>
        </RichBlockErrorBoundary>
      )
    }
  }

  // ---- Generic element: convert attributes and recurse into children ----
  const props = convertAttributes(element.attributes)
  props.key = key

  // Void elements have no children
  if (VOID_ELEMENTS.has(tagName)) {
    return createElement(tagName, props)
  }

  // Recurse into child nodes
  const children: ReactNode[] = []
  const childNodes = element.childNodes

  for (let i = 0; i < childNodes.length; i++) {
    const child = convertNode(childNodes[i], `${key}-${i}`, detectMath, detectCode)
    if (child !== null) {
      if (Array.isArray(child)) {
        // processTextNode may return an array of segments
        children.push(...child)
      } else {
        children.push(child)
      }
    }
  }

  return createElement(tagName, props, ...children)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RichContentRenderer = ({
  html,
  className,
  contentMetadata,
}: RichContentRendererProps) => {
  const content = useMemo(() => {
    if (!html || !html.trim()) {
      return null
    }

    // Parse HTML string into a DOM tree using the browser's DOMParser
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const detectMath = shouldDetectMath(contentMetadata)
    const detectCode = shouldDetectCode(contentMetadata)

    // Convert all body child nodes to React elements
    const nodes: ReactNode[] = []
    const bodyChildren = doc.body.childNodes

    for (let i = 0; i < bodyChildren.length; i++) {
      const node = convertNode(bodyChildren[i], `rc-${i}`, detectMath, detectCode)
      if (node !== null) {
        if (Array.isArray(node)) {
          nodes.push(...node)
        } else {
          nodes.push(node)
        }
      }
    }

    return nodes
  }, [html, contentMetadata])

  if (!content || content.length === 0) {
    return null
  }

  return (
    <div className={cn('prose prose-neutral dark:prose-invert max-w-none', className)}>
      {content}
    </div>
  )
}
