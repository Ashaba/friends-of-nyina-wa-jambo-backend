# Friends of Nyina wa Jambo - Backend (Strapi CMS)

This is the backend for the Friends of Nyina wa Jambo website.

### `development env `

Run the Postgres database with Docker Compose

```
docker-compose up -d
```

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## Deployment

This is deployed with every merge to the main branch.
