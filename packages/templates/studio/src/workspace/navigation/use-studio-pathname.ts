'use client';
import { usePathname } from 'next/navigation';
import { studioPathname } from './studio-url';

export function useStudioPathname(): string {
  return studioPathname(usePathname());
}
