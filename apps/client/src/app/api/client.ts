import createClient from 'openapi-fetch';

import type { components, paths } from './schema';

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

/**
 * Typed fetch client generated from the server's OpenAPI schema.
 * Every path, parameter and response body is checked against `schema.d.ts`,
 * which is regenerated with `npm run generate:types`.
 */
export const api = createClient<paths>({ baseUrl: API_BASE_URL });

export type CourseBundle = components['schemas']['CourseBundle'];
export type Course = components['schemas']['Course'];
export type Module = components['schemas']['Module'];
export type Topic = components['schemas']['Topic'];
export type TopicMeta = components['schemas']['TopicMeta'];
export type TopicStatus = TopicMeta['status'];
export type Subtopic = components['schemas']['Subtopic'];
export type Lesson = components['schemas']['Lesson'];
export type ExerciseSet = components['schemas']['ExerciseSet'];
export type Attempt = components['schemas']['Attempt'];
export type Job = components['schemas']['Job'];
export type JobKind = components['schemas']['JobKind'];
export type JobStatus = components['schemas']['JobStatus'];
export type PendingDecision = components['schemas']['PendingDecision'];

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
