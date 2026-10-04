/**
 * Media fields whose image fills a fixed-shape slot on the website.
 *
 * The upload plugin config caps file size and type for every upload. Width,
 * height and shape depend on where the image is shown, so they are checked
 * here, per field, whenever an entry is saved or published.
 *
 * To give another media field its own requirement, add an entry to
 * IMAGE_SLOTS.
 */
import type { Core, Modules, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';

export const UPLOAD_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

// Formats every browser shows and the website's image optimizer can resize.
// HEIC, straight off an iPhone, is neither, so it is rejected at upload.
export const UPLOAD_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_ALLOWED_FORMATS_LABEL = 'JPEG, PNG or WebP';

type AspectRatio = readonly [width: number, height: number];

interface ImageRequirement {
  minWidth: number;
  minHeight: number;
  narrowestAspectRatio: AspectRatio;
  widestAspectRatio: AspectRatio;
}

interface ImageSlot {
  contentType: UID.ContentType;
  field: string;
  requirement: ImageRequirement;
}

interface StoredImage {
  name: string;
  width?: number | null;
  height?: number | null;
}

const IMAGE_SLOTS: ImageSlot[] = [
  {
    // Gallery tiles are 3:2 and at most 600 CSS pixels wide, so 1200 × 800
    // stays sharp on high-density screens. 4:3 admits phone photos as taken.
    contentType: 'api::gallery-photo.gallery-photo',
    field: 'image',
    requirement: {
      minWidth: 1200,
      minHeight: 800,
      narrowestAspectRatio: [4, 3],
      widestAspectRatio: [16, 9],
    },
  },
];

const WRITE_ACTIONS = new Set(['create', 'update', 'publish']);

const ratio = ([width, height]: AspectRatio): number => width / height;

function describeImageRequirement({
  minWidth,
  minHeight,
  narrowestAspectRatio,
  widestAspectRatio,
}: ImageRequirement): string {
  const shape = `${narrowestAspectRatio.join(':')} to ${widestAspectRatio.join(':')}`;
  const sizeLimitMb = UPLOAD_SIZE_LIMIT_BYTES / 1024 / 1024;
  return `Landscape photo (${shape}), at least ${minWidth} × ${minHeight} pixels. ${UPLOAD_ALLOWED_FORMATS_LABEL}, up to ${sizeLimitMb} MB.`;
}

function assertImageMeetsRequirement(
  image: StoredImage,
  requirement: ImageRequirement
): void {
  const { name, width, height } = image;
  if (!width || !height) {
    throw new errors.ValidationError(
      `${name} has no readable dimensions. ${describeImageRequirement(requirement)}`
    );
  }

  const aspectRatio = width / height;
  const fits =
    width >= requirement.minWidth &&
    height >= requirement.minHeight &&
    aspectRatio >= ratio(requirement.narrowestAspectRatio) &&
    aspectRatio <= ratio(requirement.widestAspectRatio);

  if (!fits) {
    throw new errors.ValidationError(
      `${name} is ${width} × ${height} pixels. ${describeImageRequirement(requirement)}`
    );
  }
}

/**
 * Rejects a save or publish whose image does not fit its slot.
 *
 * Checks the stored entry after the write, inside the same transaction, so
 * every write path is covered (the admin's save and publish, and a REST create
 * that publishes in one step) and a rejected image rolls the write back.
 */
export function enforceImageSlots(strapi: Core.Strapi): void {
  strapi.documents.use(async (context, next) => {
    const slots = IMAGE_SLOTS.filter(
      (slot) => slot.contentType === context.uid
    );
    if (!slots.length || !WRITE_ACTIONS.has(context.action)) return next();

    return strapi.db.transaction(async () => {
      const result = await next();
      const documentId =
        ('documentId' in context.params && context.params.documentId) ||
        (result as { documentId: string }).documentId;

      const populate = slots.map(
        ({ field }) => field
      ) as Modules.Documents.Params.Populate.Any<UID.ContentType>;
      const document = await strapi
        .documents(context.uid as UID.ContentType)
        .findOne({ documentId, populate });

      for (const { field, requirement } of slots) {
        const image = document?.[field] as StoredImage | null | undefined;
        if (image) assertImageMeetsRequirement(image, requirement);
      }

      return result;
    });
  });
}

/**
 * Turns on the Media Library's "Auto orientation" setting.
 *
 * Phones save portrait photos as landscape pixels plus a rotation tag. With
 * the setting off, Strapi records those raw dimensions, so a portrait photo
 * would pass a landscape slot and then be shown as a heavily cropped
 * portrait. Like the public permissions, it is enforced at every boot, so
 * switching it off in the admin panel will not stick.
 */
export async function measureImagesAsDisplayed(
  strapi: Core.Strapi
): Promise<void> {
  const upload = strapi.plugin('upload').service('upload');
  const settings = await upload.getSettings();
  if (settings.autoOrientation) return;

  await upload.setSettings({ ...settings, autoOrientation: true });
  strapi.log.info('Turned on Media Library auto orientation.');
}

/**
 * Shows each slot's requirement as help text under its field in the admin.
 *
 * Help text lives in the database, so it is written at boot. It is only filled
 * in when empty, so wording changed in the admin panel is kept.
 */
export async function describeImageSlotsInAdmin(
  strapi: Core.Strapi
): Promise<void> {
  const contentTypes = strapi
    .plugin('content-manager')
    .service('content-types');

  for (const { contentType, field, requirement } of IMAGE_SLOTS) {
    const model = contentTypes.findContentType(contentType);
    const configuration = await contentTypes.findConfiguration(model);
    const edit = configuration.metadatas[field].edit;
    if (edit.description) continue;

    edit.description = describeImageRequirement(requirement);
    await contentTypes.updateConfiguration(model, configuration);
  }
}
