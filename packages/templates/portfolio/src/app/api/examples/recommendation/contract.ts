import { z } from 'zod';

export const RECOMMENDATION_ENDPOINT = '/api/examples/recommendation';
export const MAX_TOPIC_LENGTH = 120;
export const recommendationSchema = z.object({ recommendation: z.string().min(1).max(500) });
export const serviceErrorSchema = z.object({
  error: z.enum(['configuration', 'invalid-input', 'unavailable', 'timeout', 'invalid-response']),
});
export type ServiceError = z.infer<typeof serviceErrorSchema>['error'];
