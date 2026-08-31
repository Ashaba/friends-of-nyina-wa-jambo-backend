import { factories } from '@strapi/strapi';

/**
 * Only `create` is registered. The subscriber list is personal data, so no
 * find/update/delete route exists to be accidentally opened up to the public
 * role in Settings → Roles; editors read the list in the admin panel instead.
 */
export default factories.createCoreRouter(
  'api::newsletter-subscriber.newsletter-subscriber',
  { only: ['create'] }
);
