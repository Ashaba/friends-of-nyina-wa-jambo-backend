import { factories } from '@strapi/strapi';
import {
  SubmissionError,
  flag,
  normalizeEmail,
  requireText,
  trimmedText,
} from '../../../utils/form-submission';
import { PrayerRequestFields } from '../../../utils/email-templates';

const UID = 'api::prayer-request.prayer-request';

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Public prayer-intention endpoint.
   *
   * Replaces the core `create` so an anonymous caller cannot set arbitrary
   * fields, and so the response confirms receipt without echoing the stored
   * intention back over the wire. Name and email are optional by design — the
   * form invites an anonymous "please pray for me".
   */
  async create(ctx) {
    const body = ctx.request.body as { data?: Record<string, unknown> } | undefined;
    const payload = body?.data ?? {};

    let request: PrayerRequestFields;

    try {
      request = {
        name: trimmedText(payload.name, 80),
        email: normalizeEmail(payload.email),
        category: trimmedText(payload.category, 60) ?? 'General',
        intention: requireText(payload.intention, 5000, 'A prayer intention'),
        isPublic: flag(payload.isPublic),
      };
    } catch (error) {
      if (error instanceof SubmissionError) return ctx.badRequest(error.message);
      throw error;
    }

    await strapi.documents(UID).create({ data: request });

    // Sent after the intention is safely stored, and never allowed to fail the
    // request: an intention recorded but unannounced is a problem for staff to
    // notice, whereas a 500 here would lose the intention and tell the sender
    // to write it out again.
    await strapi.service(UID).announce(request);

    ctx.body = { data: { received: true } };
  },
}));
