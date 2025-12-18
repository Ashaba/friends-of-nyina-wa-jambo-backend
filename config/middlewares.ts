export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean),
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
