import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — merge class names, de-duping conflicting Tailwind utilities (last wins).
 *
 * The standard helper for building variant-driven components (with CVA). Lets you
 * compose conditional classes and have `twMerge` resolve conflicts, e.g.
 * cn('px-2 text-muted', isActive && 'text-gold', className).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
