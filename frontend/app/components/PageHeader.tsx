"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: boolean;
}

export default function PageHeader({ title, subtitle, backButton }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {backButton && (
          <button 
            onClick={() => router.back()} 
            className="absolute left-4 top-10 sm:top-14 p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-md text-sm text-brand-100/80 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <svg
        className="absolute bottom-0 left-0 w-full text-surface"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,60 L0,60 Z" />
      </svg>
    </header>
  );
}
