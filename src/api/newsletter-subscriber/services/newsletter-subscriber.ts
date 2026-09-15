import { factories } from '@strapi/strapi';
import { getEmailContext, sendEmail } from '../../../utils/email';
import { newsletterWelcome } from '../../../utils/email-templates';

const UID = 'api::newsletter-subscriber.newsletter-subscriber';

export default factories.createCoreService(UID, ({ strapi }) => ({
  /**
   * Greets a new subscriber.
   *
   * Only ever called for an address that was not already on the list. Someone
   * updating their preferences has been greeted before, and re-greeting them
   * would read as a mistake as well as spending the monthly sending allowance
   * twice.
   */
  async welcome(firstName: string, email: string): Promise<void> {
    const context = await getEmailContext(strapi);
    await sendEmail(strapi, newsletterWelcome(context, firstName, email));
  },
}));
