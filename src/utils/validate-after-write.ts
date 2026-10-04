import type { Core, Modules, UID } from '@strapi/strapi';

const WRITE_ACTIONS = new Set(['create', 'update', 'publish']);

/**
 * Rejects a save or publish of `contentType` when `validate` throws.
 *
 * Checks the stored entry after the write, inside the same transaction, so
 * every write path is covered (the admin's save and publish, and a REST create
 * that publishes in one step) and a rejected entry rolls the write back.
 */
export function validateAfterWrite<TContentType extends UID.ContentType>(
  strapi: Core.Strapi,
  contentType: TContentType,
  validate: (document: Modules.Documents.AnyDocument) => void,
  populate: string[] = []
): void {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== contentType || !WRITE_ACTIONS.has(context.action)) {
      return next();
    }

    return strapi.db.transaction(async () => {
      const result = await next();
      const documentId =
        ('documentId' in context.params && context.params.documentId) ||
        (result as { documentId: string }).documentId;

      const document = await strapi.documents(contentType).findOne({
        documentId,
        populate: populate as Modules.Documents.Params.Populate.Any<TContentType>,
      });
      if (document) validate(document);

      return result;
    });
  });
}
