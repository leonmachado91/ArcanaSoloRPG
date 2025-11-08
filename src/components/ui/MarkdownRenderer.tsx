// components/ui/MarkdownRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    children: string;
    className?: string; // Allow custom classes for the container
}

/**
 * Renders a Markdown string into styled React components.
 * This component provides consistent styling for common Markdown elements,
 * aligned with the application's design system, and sanitizes the output
 * for security.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children, className }) => {
    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h3: ({ node, ...props }) => <h3 className="font-display text-lg text-amber-400 mt-3 mb-1" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2 pl-2" {...props} />,
                    li: ({ node, ...props }) => <li className="font-body-serif" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-amber-300" {...props} />,
                    p: ({ node, ...props }) => <p className="my-1 font-body-serif" {...props} />,
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;