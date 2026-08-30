import { factories } from '@strapi/strapi';

/**
 * Only `create` is registered. An intention is a confidence — often with the
 * sender's name and address attached — so there is deliberately no route that
 * could ever list or expose one. Even the intentions marked `isPublic` are
 * shared by an editor, not served straight from this endpoint.
 */
export default factories.createCoreRouter('api::prayer-request.prayer-request', {
  only: ['create'],
});
