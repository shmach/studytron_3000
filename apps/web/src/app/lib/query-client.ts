import { QueryClient } from '@tanstack/react-query';

/**
 * The vault only changes when the skill (or the user, in Obsidian) writes to it,
 * so a short staleTime avoids refetching on every navigation while still picking
 * up edits on window focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});
