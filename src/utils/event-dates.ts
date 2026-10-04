import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { validateAfterWrite } from './validate-after-write';

/**
 * Rejects an event whose end date is before its start date.
 *
 * The website lists events by start date and shows the two dates as a range,
 * so a backwards pair would be listed in the wrong place and read
 * "November 27 – 19".
 */
export function enforceEventDateOrder(strapi: Core.Strapi): void {
  validateAfterWrite(strapi, 'api::event.event', ({ startDate, endDate }) => {
    // Both are YYYY-MM-DD, so comparing the text compares the dates.
    if (endDate && startDate && endDate < startDate) {
      throw new errors.ValidationError(
        'The end date is before the start date.'
      );
    }
  });
}
