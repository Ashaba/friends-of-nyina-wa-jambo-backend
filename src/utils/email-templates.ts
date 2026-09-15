/**
 * The messages the public forms send.
 *
 * Each builder returns both a plain-text and an HTML body. Text is not a
 * courtesy here: these go to parish volunteers and to people who asked for
 * prayer, on whatever mail client they happen to use, and a text part is what
 * survives the ones that refuse HTML.
 *
 * Styling stays inline and minimal for the same reason — mail clients strip
 * stylesheets, so anything richer would degrade unevenly.
 */

import { EmailContext, OutgoingEmail, escapeHtml, escapeHtmlBlock } from './email';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://friendsofnyinawajambo.org';

/** Wraps body HTML in the shared shell: a heading, the content, a signature. */
function layout(siteName: string, heading: string, body: string): string {
  return [
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1F2937;max-width:600px;margin:0 auto;padding:24px;">',
    `<h1 style="font-size:20px;color:#4A90E2;margin:0 0 16px;">${escapeHtml(heading)}</h1>`,
    body,
    '<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />',
    `<p style="font-size:13px;color:#6B7280;margin:0;">${escapeHtml(siteName)}<br />`,
    `<a href="${escapeHtml(FRONTEND_URL)}" style="color:#4A90E2;">${escapeHtml(FRONTEND_URL)}</a></p>`,
    '</div>',
  ].join('\n');
}

/** One `label: value` row, used by the staff notification. */
function detail(label: string, value: string): string {
  return `<p style="margin:0 0 8px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

export interface PrayerRequestFields {
  name?: string;
  email?: string;
  category: string;
  intention: string;
  isPublic: boolean;
}

/**
 * Tells the team an intention arrived, with enough of it in the body that a
 * volunteer can pray over it without opening the admin panel.
 *
 * `replyTo` is set to the sender when they gave an address, so answering the
 * notification answers the person — the sender address itself is fixed by the
 * provider and cannot be used for that.
 */
export function prayerRequestNotification(
  context: EmailContext,
  fields: PrayerRequestFields,
  to: string
): OutgoingEmail {
  const from = fields.name ?? 'Anonymous';
  const contact = fields.email ?? 'not given';
  const sharing = fields.isPublic
    ? 'Yes — may be shared with the community'
    : 'No — keep private';

  const text = [
    `A new prayer intention was submitted on ${context.siteName}.`,
    '',
    `Category: ${fields.category}`,
    `From: ${from}`,
    `Email: ${contact}`,
    `May be shared publicly: ${sharing}`,
    '',
    'Intention:',
    fields.intention,
  ].join('\n');

  const html = layout(
    context.siteName,
    'New prayer intention',
    [
      detail('Category', fields.category),
      detail('From', from),
      detail('Email', contact),
      detail('May be shared publicly', sharing),
      '<p style="margin:16px 0 8px;"><strong>Intention:</strong></p>',
      `<blockquote style="margin:0;padding:12px 16px;background:#F9FAFB;border-left:3px solid #4A90E2;">${escapeHtmlBlock(fields.intention)}</blockquote>`,
    ].join('\n')
  );

  return {
    to,
    subject: `New prayer intention — ${fields.category}`,
    text,
    html,
    replyTo: fields.email,
  };
}

/**
 * Confirms to the sender that their intention arrived.
 *
 * Only sent when they chose to give an address. Their own words are quoted
 * back — to the address they supplied and nowhere else — so they can see
 * exactly what was received.
 */
export function prayerRequestAcknowledgement(
  context: EmailContext,
  fields: PrayerRequestFields,
  to: string
): OutgoingEmail {
  const greeting = fields.name ? `Dear ${fields.name},` : 'Dear friend,';

  const text = [
    greeting,
    '',
    'Your prayer intention has been received, and it will be brought before',
    'Our Lady of Kibeho, Nyina wa Jambo, in the prayers of our community.',
    '',
    'This is what you shared with us:',
    '',
    fields.intention,
    '',
    'You are in our prayers.',
  ].join('\n');

  const html = layout(
    context.siteName,
    'Your prayer intention has been received',
    [
      `<p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>`,
      '<p style="margin:0 0 16px;">Your prayer intention has been received, and it will be brought before Our Lady of Kibeho, Nyina wa Jambo, in the prayers of our community.</p>',
      '<p style="margin:0 0 8px;">This is what you shared with us:</p>',
      `<blockquote style="margin:0 0 16px;padding:12px 16px;background:#F9FAFB;border-left:3px solid #4A90E2;">${escapeHtmlBlock(fields.intention)}</blockquote>`,
      '<p style="margin:0;">You are in our prayers.</p>',
    ].join('\n')
  );

  return {
    to,
    subject: 'Your prayer intention has been received',
    text,
    html,
  };
}

/**
 * Welcomes a new subscriber.
 *
 * The list of what they will receive mirrors what the newsletter page promised
 * them; if that page changes, this should follow. There is no unsubscribe
 * endpoint yet, so the message asks them to reply — an honest instruction that
 * actually works, rather than a link that does not.
 */
export function newsletterWelcome(
  context: EmailContext,
  firstName: string,
  to: string
): OutgoingEmail {
  const items = [
    'A daily message from Our Lady of Kibeho, with a guided reflection',
    'Prayer intentions from the community',
    'Announcements of pilgrimages, retreats, and feast day celebrations',
    'Reminders when communal novenas begin',
  ];

  const text = [
    `Dear ${firstName},`,
    '',
    `Welcome to ${context.siteName}. Thank you for joining us.`,
    '',
    'You can expect:',
    ...items.map((item) => `  - ${item}`),
    '',
    `Visit us any time at ${FRONTEND_URL}`,
    '',
    'If you would rather not receive these, simply reply to this message and',
    'we will remove you from the list.',
  ].join('\n');

  const html = layout(
    context.siteName,
    `Welcome to ${context.siteName}`,
    [
      `<p style="margin:0 0 16px;">Dear ${escapeHtml(firstName)},</p>`,
      `<p style="margin:0 0 16px;">Welcome to ${escapeHtml(context.siteName)}. Thank you for joining us.</p>`,
      '<p style="margin:0 0 8px;">You can expect:</p>',
      `<ul style="margin:0 0 16px;padding-left:20px;">${items
        .map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`)
        .join('')}</ul>`,
      '<p style="margin:0;font-size:14px;color:#6B7280;">If you would rather not receive these, simply reply to this message and we will remove you from the list.</p>',
    ].join('\n')
  );

  return {
    to,
    subject: `Welcome to ${context.siteName}`,
    text,
    html,
  };
}
