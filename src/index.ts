import type { Core } from '@strapi/strapi';

/**
 * API actions the website needs available to unauthenticated visitors.
 *
 * Read-only, and deliberately so. The two public forms are NOT listed here:
 * every legitimate submission is relayed by the Next.js server action, which
 * authenticates with the API token, so anonymous writes have no reason to work
 * and are left forbidden. That keeps the spam-reachable surface down to one
 * origin we control and can rate-limit, rather than the open internet.
 *
 * Consequence worth knowing before rotating credentials: the frontend's token
 * must carry create access for the two form content types, or submissions fail
 * with a 403 and visitors see the generic failure copy.
 *
 * Permissions live in the database, not in this repo, so a fresh environment
 * starts with none — including Strapi Cloud, where the seed scripts cannot be
 * run. Granting them at boot makes a deploy self-sufficient. The flip side:
 * revoking one in the admin panel will not stick across a restart, so remove
 * it from this list instead.
 */
const PUBLIC_PERMISSIONS = [
  'api::daily-message.daily-message.find',
  'api::daily-message.daily-message.findOne',
];

async function grantPublicPermissions(strapi: Core.Strapi): Promise<void> {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn(
      'No public role found; skipped granting public API permissions.'
    );
    return;
  }

  for (const action of PUBLIC_PERMISSIONS) {
    const existing = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (existing) continue;

    await strapi
      .query('plugin::users-permissions.permission')
      .create({ data: { action, role: publicRole.id } });
    strapi.log.info(`Granted public permission: ${action}`);
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicPermissions(strapi);
  },
};
