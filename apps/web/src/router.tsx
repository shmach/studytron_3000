import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/app-layout'
import { CoursePage } from '@/pages/course-page'
import { CoursesPage } from '@/pages/courses-page'
import { NotFoundPage } from '@/pages/not-found-page'

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
])
