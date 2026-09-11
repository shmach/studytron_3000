import { createBrowserRouter } from 'react-router';

import { AppLayout } from '@ui/components/app-layout';
import { CoursePage } from '@ui/pages/course-page';
import { CoursesPage } from '@ui/pages/courses-page';
import { NotFoundPage } from '@ui/pages/not-found-page';

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
