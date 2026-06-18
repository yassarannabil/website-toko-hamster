"use client";

import { useState } from "react";
import { getRelativeMediaUrl } from "../data/hamsters";

interface HamsterImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: string;
}

export default function HamsterImage({ src, alt, className = "", fallbackIcon = "" }: HamsterImageProps) {
  const [error, setError] = useState(false);
  const mediaUrl = getRelativeMediaUrl(src ?? null);

  if (!mediaUrl || error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <span className="text-2xl">{fallbackIcon}</span>
      </div>
    );
  }

  return (
    <img
      src={mediaUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
