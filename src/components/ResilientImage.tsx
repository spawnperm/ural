import { useState } from 'react';
import { Compass } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  caption,
  className = '',
  fallbackTitle = 'Исторический архив Прикамья',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <figure className="flex flex-col h-full">
      <div className="relative overflow-hidden bg-[#EBE6DF] border border-[#E2DDD4] rounded-lg flex-1 min-h-[240px]">
        {!hasError ? (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover ${className}`}
          />
        ) : (
          <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EFECE6] via-[#E5E0D6] to-[#D9D3C7] text-[#44403C]">
            <Compass className="w-8 h-8 mb-3 text-[#1E3A8A]" strokeWidth={1.5} />
            <p className="font-medium text-sm text-[#1C1917]">{fallbackTitle}</p>
            <p className="text-xs text-[#57534E] mt-1 max-w-xs">{alt}</p>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-xs text-[#57534E] italic font-serif">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
