import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';

import { queryClient } from '@app/lib/query-client';
import { router } from '@router/index';
import { ThemeProvider } from '@app/context/ThemeContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider storageKey="studytron:theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
