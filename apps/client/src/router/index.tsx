import { createBrowserRouter } from 'react-router';

import { AppLayout } from '@ui/components/AppLayout';
import { CoursePage } from '@ui/pages/CoursePage';
import { CoursesPage } from '@ui/pages/CoursesPage';
import { NotFoundPage } from '@ui/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: CoursesPage },
      { path: 'courses/:slug', Component: CoursePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
