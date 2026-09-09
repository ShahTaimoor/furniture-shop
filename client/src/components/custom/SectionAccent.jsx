import React from 'react';
import { cn } from '@/lib/utils';

const SectionAccent = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    width="48"
    height="10"
    viewBox="0 0 48 10"
    fill="none"
    className={cn('block', className)}
  >
    <path
      d="M2 7C10 1 17 1 24 5C31 9 38 9 46 3"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export default SectionAccent;
