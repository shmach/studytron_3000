import { MarkdownHooks } from 'react-markdown';
import rehypeShiki from '@shikijs/rehype';
import remarkGfm from 'remark-gfm';

import { cn } from '@app/lib/utils';
import { Skeleton } from '@ui/components/ui/Skeleton';

// Plugin lists live at module scope so their identity is stable across renders;
// a new array each render would make react-markdown rebuild the whole pipeline.
const remarkPlugins = [remarkGfm];

const rehypePlugins: React.ComponentProps<
  typeof MarkdownHooks
>['rehypePlugins'] = [
  [
    rehypeShiki,
    {
      themes: { light: 'github-light', dark: 'github-dark' },
      // Emit both palettes as CSS variables (--shiki-light / --shiki-dark) and
      // let index.css pick one, so the app's .dark class switches colors
      // without re-highlighting.
      defaultColor: false,
      // Load grammars on demand; this makes the pipeline async, hence MarkdownHooks.
      lazy: true,
      // Fenced blocks without a language (ASCII diagrams) and unknown
      // languages render as plain monospace text instead of failing.
      defaultLanguage: 'text',
      fallbackLanguage: 'text',
    },
  ],
];

interface MarkdownProps {
  children: string;
  className?: string;
}

/** Renders vault Markdown (GFM + syntax highlighting). Raw HTML is never rendered. */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:text-foreground prose-pre:border',
        className,
      )}
    >
      <MarkdownHooks
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        fallback={<MarkdownSkeleton />}
      >
        {children}
      </MarkdownHooks>
    </div>
  );
}

function MarkdownSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
