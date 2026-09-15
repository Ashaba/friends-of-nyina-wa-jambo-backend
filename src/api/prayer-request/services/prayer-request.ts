import { factories } from '@strapi/strapi';
import { getEmailContext, sendEmails } from '../../../utils/email';
import {
  PrayerRequestFields,
  prayerRequestAcknowledgement,
  prayerRequestNotification,
} from '../../../utils/email-templates';

const UID = 'api::prayer-request.prayer-request';

export default factories.createCoreService(UID, ({ strapi }) => ({
  /**
   * Tells the team an intention arrived, and tells the sender it was received.
   *
   * Called from the controller rather than an `afterCreate` lifecycle hook on
   * purpose: a hook would also fire when an editor corrects a typo in the
   * admin panel, mailing the sender a second time for something they did not
   * do. Only a genuine submission should announce itself.
   *
   * The notification needs an address an editor has set in Global. Without one
   * there is nowhere to send it, which is worth a log line because it means
   * intentions are piling up unseen in the admin panel.
   */
  async announce(request: PrayerRequestFields): Promise<void> {
    const context = await getEmailContext(strapi);
    const emails = [];

    if (context.notificationEmail) {
      emails.push(
        prayerRequestNotification(context, request, context.notificationEmail)
      );
    } else {
      strapi.log.warn(
        '[email] prayer intention stored but not announced: no notification address is set in Global'
      );
    }

    if (request.email) {
      emails.push(prayerRequestAcknowledgement(context, request, request.email));
    }

    await sendEmails(strapi, emails);
  },
}));
