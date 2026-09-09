import createClient from 'openapi-fetch'

import type { components, paths } from './schema'

/** Base URL of the local-server API. Override with VITE_API_BASE_URL in a .env file. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/**
 * Typed fetch client generated from the server's OpenAPI schema.
 * Every path, parameter and response body is checked against `schema.d.ts`,
 * which is regenerated with `npm run generate:types`.
 */
export const api = createClient<paths>({ baseUrl: API_BASE_URL })

// Convenience aliases so the rest of the app never imports from schema.d.ts directly.
export type CourseBundle = components['schemas']['CourseBundle']
export type Course = components['schemas']['Course']
export type Module = components['schemas']['Module']
export type Topic = components['schemas']['Topic']
export type TopicMeta = components['schemas']['TopicMeta']
export type TopicStatus = TopicMeta['status']
export type Subtopic = components['schemas']['Subtopic']
export type Lesson = components['schemas']['Lesson']
export type ExerciseSet = components['schemas']['ExerciseSet']
export type Attempt = components['schemas']['Attempt']

/** Error thrown by the hooks when the API answers with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
