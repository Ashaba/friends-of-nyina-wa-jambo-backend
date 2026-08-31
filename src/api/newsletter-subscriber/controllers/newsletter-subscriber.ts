import { factories } from '@strapi/strapi';
import {
  SubmissionError,
  normalizeEmail,
  requireText,
  stringList,
  trimmedText,
} from '../../../utils/form-submission';

const UID = 'api::newsletter-subscriber.newsletter-subscriber';

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Public subscribe endpoint.
   *
   * Replaces the core `create` for three reasons: an anonymous caller must not
   * be able to set arbitrary fields, the stored record holds a real person's
   * address and so is never echoed back, and re-subscribing a known address
   * should refresh their preferences rather than fail the unique constraint.
   */
  async create(ctx) {
    const body = ctx.request.body as { data?: Record<string, unknown> } | undefined;
    const payload = body?.data ?? {};

    let subscriber: {
      firstName: string;
      lastName?: string;
      email: string;
      preferences: string[];
      active: boolean;
    };

    try {
      const email = normalizeEmail(payload.email);
      if (!email) throw new SubmissionError('An email address is required.');

      subscriber = {
        firstName: requireText(payload.firstName, 80, 'A first name'),
        lastName: trimmedText(payload.lastName, 80),
        email,
        preferences: stringList(payload.preferences, 12, 120),
        active: true,
      };
    } catch (error) {
      if (error instanceof SubmissionError) return ctx.badRequest(error.message);
      throw error;
    }

    const existing = await strapi
      .documents(UID)
      .findFirst({ filters: { email: subscriber.email } });

    if (existing) {
      await strapi
        .documents(UID)
        .update({ documentId: existing.documentId, data: subscriber });
    } else {
      await strapi.documents(UID).create({ data: subscriber });
    }

    ctx.body = { data: { subscribed: true } };
  },
}));
