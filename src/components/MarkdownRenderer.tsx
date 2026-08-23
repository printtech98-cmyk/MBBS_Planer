import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-slate-800 mt-5 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-slate-800 mt-4 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-slate-800 mt-3 mb-1.5 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-slate-700 leading-relaxed my-2">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="text-sm text-slate-700 leading-relaxed list-disc pl-5 my-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-sm text-slate-700 leading-relaxed list-decimal pl-5 my-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-sm border-collapse border border-slate-200">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-semibold text-slate-700 text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-1.5 text-slate-700">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-sky-200 pl-3 my-2 text-sm text-slate-600 italic">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 p-3 rounded-xl bg-slate-100 text-slate-700 text-xs overflow-x-auto">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-4 border-slate-200" />,
          a: ({ children, href }) => (
            <a href={href} className="text-sky-600 hover:text-sky-700 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
