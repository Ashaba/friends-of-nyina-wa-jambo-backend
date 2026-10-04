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
import type { Core, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { validateAfterWrite } from './validate-after-write';

export const UPLOAD_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

// Formats every browser shows and the website's image optimizer can resize.
// HEIC, straight off an iPhone, is neither, so it is rejected at upload.
export const UPLOAD_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_ALLOWED_FORMATS_LABEL = 'JPEG, PNG or WebP';

type AspectRatio = readonly [width: number, height: number];

// "croppedToFit" accepts any shape, portrait included, because the website
// crops the photo to its slot. It is the easiest rule for editors to meet.
type ImageShape =
  | { kind: 'croppedToFit' }
  | {
      kind: 'landscape';
      narrowestAspectRatio: AspectRatio;
      widestAspectRatio: AspectRatio;
    };

interface ImageRequirement {
  minWidth: number;
  minHeight: number;
  shape: ImageShape;
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
      shape: {
        kind: 'landscape',
        narrowestAspectRatio: [4, 3],
        widestAspectRatio: [16, 9],
      },
    },
  },
  {
    // The featured event banner is 21:9 and at most 1024 CSS pixels wide.
    // 1200 wide is met by a phone photo forwarded over WhatsApp, either way up.
    contentType: 'api::event.event',
    field: 'image',
    requirement: {
      minWidth: 1200,
      minHeight: 600,
      shape: { kind: 'croppedToFit' },
    },
  },
  {
    // Video cards are 16:9 and at most 368 CSS pixels wide.
    contentType: 'api::video.video',
    field: 'thumbnail',
    requirement: {
      minWidth: 800,
      minHeight: 450,
      shape: { kind: 'croppedToFit' },
    },
  },
];

const ratio = ([width, height]: AspectRatio): number => width / height;

function fitsShape(aspectRatio: number, shape: ImageShape): boolean {
  switch (shape.kind) {
    case 'croppedToFit':
      return true;
    case 'landscape':
      return (
        aspectRatio >= ratio(shape.narrowestAspectRatio) &&
        aspectRatio <= ratio(shape.widestAspectRatio)
      );
  }
}

function describeImageRequirement({
  minWidth,
  minHeight,
  shape,
}: ImageRequirement): string {
  const size = `at least ${minWidth} × ${minHeight} pixels`;
  const sizeLimitMb = UPLOAD_SIZE_LIMIT_BYTES / 1024 / 1024;
  const formats = `${UPLOAD_ALLOWED_FORMATS_LABEL}, up to ${sizeLimitMb} MB.`;

  switch (shape.kind) {
    case 'croppedToFit':
      return `Photo of any shape, ${size}. The website crops it to fit, so keep the subject near the middle. ${formats}`;
    case 'landscape':
      return `Landscape photo (${shape.narrowestAspectRatio.join(':')} to ${shape.widestAspectRatio.join(':')}), ${size}. ${formats}`;
  }
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

  const fits =
    width >= requirement.minWidth &&
    height >= requirement.minHeight &&
    fitsShape(width / height, requirement.shape);

  if (!fits) {
    throw new errors.ValidationError(
      `${name} is ${width} × ${height} pixels. ${describeImageRequirement(requirement)}`
    );
  }
}

/**
 * Rejects a save or publish whose image does not fit its slot.
 */
export function enforceImageSlots(strapi: Core.Strapi): void {
  const contentTypes = new Set(IMAGE_SLOTS.map((slot) => slot.contentType));

  for (const contentType of contentTypes) {
    const slots = IMAGE_SLOTS.filter(
      (slot) => slot.contentType === contentType
    );
    validateAfterWrite(
      strapi,
      contentType,
      (document) => {
        for (const { field, requirement } of slots) {
          const image = document[field] as StoredImage | null | undefined;
          if (image) assertImageMeetsRequirement(image, requirement);
        }
      },
      slots.map(({ field }) => field)
    );
  }
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
