// Type declarations for Next.js 13.5.1 navigation hooks
// These hooks exist at runtime but TypeScript definitions may be incomplete

declare module 'next/navigation' {
  export function useRouter(): {
    push(href: string): void;
    replace(href: string): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(href: string): void;
  };

  export function usePathname(): string;
  
  export function useSearchParams(): URLSearchParams | null;
  
  export function useParams<T = Record<string, string>>(): T;
  
  export function useSelectedLayoutSegment(): string | null;
  
  export function useSelectedLayoutSegments(): string[];
  
  export function redirect(url: string): never;
  
  export function notFound(): never;
}
