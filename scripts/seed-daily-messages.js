'use strict';

/**
 * Seeds Daily Messages and grants public read access to them.
 *
 * Run with: npm run seed:daily-messages
 *
 * Idempotent — an entry is created only when no message exists for that date,
 * so re-running never overwrites content edited in the admin panel.
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const UID = 'api::daily-message.daily-message';

/** Messages of Our Lady of Kibeho, seeded from today forward — one per day. */
const MESSAGES = [
  {
    message:
      'Repent, repent, repent! When I tell you this, I am not addressing myself merely to you, child, but I am addressing myself to the whole world.',
    source: 'Our Lady to Alphonsine, November 28, 1981',
    reflection:
      'Let us examine our hearts today and turn back to God with sincere repentance and love.',
  },
  {
    message:
      'The world is in rebellion against God. Too many sins are committed. There is no more love, no more peace. If you do not repent and convert your hearts, you will all fall into an abyss.',
    source: 'Our Lady to Marie Claire, 1982',
    reflection: 'Today, let us be instruments of love and peace in our families and communities.',
  },
  {
    message: 'Pray, pray, pray! Never tire of praying. The Rosary is a powerful weapon against evil.',
    source: 'Our Lady to the Visionaries',
    reflection:
      "Take time today to pray the Rosary and experience the power of Our Lady's intercession.",
  },
  {
    message:
      'I have come to calm you, because I have heard your prayers. I would like your companions also to have faith, because I have not come only for you, I have come for all my children.',
    source: 'Our Lady to Alphonsine, November 28, 1981',
    reflection:
      "Remember that Mary's love extends to all her children. Share this message of hope with someone today.",
  },
  {
    message:
      'What I ask of you is to pray. Pray without ceasing. The world is going badly. If you want to know what is happening, listen: The world is in revolt against God.',
    source: 'Our Lady to Nathalie, 1982',
    reflection:
      'Persevere in prayer today, even when it feels difficult. Your prayers are heard in heaven.',
  },
  {
    message:
      'No one arrives in Heaven without suffering. Do not be afraid of suffering. I am suffering along with you. I will help you if you desire.',
    source: 'Our Lady to Alphonsine',
    reflection:
      'Offer your sufferings today in union with Christ and trust that Mary walks beside you.',
  },
  {
    message:
      'My children, I love you. Love one another as I love you. Forgive one another and ask God to forgive you.',
    source: 'Our Lady of Kibeho',
    reflection:
      "Is there someone you need to forgive today? Let Mary's love inspire you to extend mercy.",
  },
];

/** YYYY-MM-DD, `offset` days from today. */
function dateFrom(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

async function grantPublicReadAccess(strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    console.warn('No public role found; skipping permission setup.');
    return;
  }

  for (const action of [`${UID}.find`, `${UID}.findOne`]) {
    const existing = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (existing) {
      console.log(`Public permission already present: ${action}`);
      continue;
    }

    await strapi
      .query('plugin::users-permissions.permission')
      .create({ data: { action, role: publicRole.id } });
    console.log(`Granted public permission: ${action}`);
  }
}

async function seedMessages(strapi) {
  for (const [index, entry] of MESSAGES.entries()) {
    const date = dateFrom(index);

    const existing = await strapi.documents(UID).findFirst({ filters: { date } });
    if (existing) {
      console.log(`Skipping ${date} — a message already exists.`);
      continue;
    }

    await strapi.documents(UID).create({ data: { ...entry, date, active: true } });
    console.log(`Created daily message for ${date}.`);
  }
}

async function run() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    await grantPublicReadAccess(app);
    await seedMessages(app);
    console.log('Daily messages seeded.');
  } finally {
    await app.destroy();
  }
}

run().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
