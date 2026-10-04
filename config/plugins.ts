import {
  UPLOAD_ALLOWED_TYPES,
  UPLOAD_SIZE_LIMIT_BYTES,
} from '../src/utils/image-slots';

export default () => ({
  upload: {
    config: {
      sizeLimit: UPLOAD_SIZE_LIMIT_BYTES,
      security: { allowedTypes: UPLOAD_ALLOWED_TYPES },
    },
  },
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        title: 'Friends of Nyina wa Jambo API',
        description: 'Strapi CMS API for the Friends of Nyina wa Jambo website',
        version: '1.0.0',
      },
    },
  },
});
