/**
 * Transactional email for the public form endpoints.
 *
 * Strapi Cloud injects an email provider at the platform level, which is why
 * there is deliberately no `email` block in `config/plugins.ts`: adding one
 * would replace the provider Cloud configures and silently break sending in
 * production. That provider's sender address is fixed and cannot be
 * overridden, so `from` is left unset here and Cloud's default applies.
 *
 * Locally there is no provider at all and every send fails. That is expected,
 * and the same swallow-and-log path covers production: a notification that
 * bounces must never cost us the submission that triggered it, so nothing in
 * this module throws.
 *
 * The Cloud allowance is roughly 1000 messages a month — ample for the
 * per-submission mail sent here, but not for a broadcast newsletter. Moving to
 * a dedicated provider later is a change to `config/plugins.ts`, not to this
 * file.
 */

import type { Core } from '@strapi/strapi';

/** A message ready to hand to the provider. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Where a reply should land, when that is not the fixed sender address. */
  replyTo?: string;
}

/** Site-wide values the templates need, read once per submission. */
export interface EmailContext {
  siteName: string;
  /** Where staff notifications go. Unset until an editor fills it in. */
  notificationEmail?: string;
}

const GLOBAL_UID = 'api::global.global';

const FALLBACK_SITE_NAME = 'Friends of Nyina wa Jambo';

/**
 * Escapes a visitor-supplied value for inclusion in an HTML body.
 *
 * Every string these templates interpolate came from a public form, so it is
 * assumed hostile: without this, an intention containing markup would break
 * the message or smuggle a link into staff mail.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Renders multi-line visitor text as escaped HTML paragraphs. */
export function escapeHtmlBlock(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

/**
 * Reads the site name and the staff notification address.
 *
 * `notificationEmail` is marked private in the Global schema, so it is
 * stripped from every API response; the document service used here is the
 * internal path and still sees it.
 */
export async function getEmailContext(
  strapi: Core.Strapi
): Promise<EmailContext> {
  try {
    const global = await strapi
      .documents(GLOBAL_UID)
      .findFirst({ fields: ['siteName', 'notificationEmail'] });

    return {
      siteName: global?.siteName || FALLBACK_SITE_NAME,
      notificationEmail: global?.notificationEmail || undefined,
    };
  } catch (error) {
    // Global is a single type an editor may not have filled in yet, and a
    // failure to read it must not stop the submission being stored.
    strapi.log.warn(
      `[email] could not read global settings: ${describeError(error)}`
    );
    return { siteName: FALLBACK_SITE_NAME };
  }
}

/**
 * Sends one message, reporting success rather than raising.
 *
 * Returns false for anything that went wrong — no provider configured, a
 * rejected recipient, a provider outage — after logging the reason. Callers
 * are submission handlers that have already stored the visitor's data and
 * should carry on regardless.
 */
export async function sendEmail(
  strapi: Core.Strapi,
  email: OutgoingEmail
): Promise<boolean> {
  try {
    await strapi.plugin('email').service('email').send(email);
    strapi.log.info(`[email] sent "${email.subject}"`);
    return true;
  } catch (error) {
    // The recipient is omitted from the log line: staff mail is routine, but a
    // prayer-request acknowledgement is addressed to someone who shared an
    // intention in confidence, and logs are read more widely than the mailbox.
    strapi.log.error(
      `[email] failed to send "${email.subject}": ${describeError(error)}`
    );
    return false;
  }
}

/** Sends several messages together, tolerating individual failures. */
export async function sendEmails(
  strapi: Core.Strapi,
  emails: OutgoingEmail[]
): Promise<void> {
  await Promise.all(emails.map((email) => sendEmail(strapi, email)));
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
