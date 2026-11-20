import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyCodeBlockProps {
  code: string;
  label?: string;
}

export function CopyCodeBlock({ code, label }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border border-[#E2DDD4] rounded-lg overflow-hidden bg-[#1C1917] text-[#F5F3EE]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2E2A27] bg-[#25221F]">
        <span className="font-mono text-xs text-[#A8A29E] truncate">{label || 'Конфигурация'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E7E5E4] hover:text-white bg-[#332E2A] hover:bg-[#443E39] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs leading-relaxed font-mono overflow-x-auto text-[#F5F3EE] tabular-nums">
        <code>{code}</code>
      </pre>
    </div>
  );
}
