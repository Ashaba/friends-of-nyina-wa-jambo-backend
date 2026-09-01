export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Public origin Strapi serves itself on. Drives the admin panel's absolute
  // links and the `/` -> `/admin` redirect, so it must be the custom domain in
  // production or the browser lands back on the *.strapiapp.com host.
  url: env('URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
