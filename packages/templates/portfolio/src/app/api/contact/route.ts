import { handleContactRequest } from '../../../features/contact/server';
import { resolveContactSender } from '../../../integrations/contact/sender';

export function POST(request: Request): Promise<Response> {
  return handleContactRequest(request, resolveContactSender);
}
