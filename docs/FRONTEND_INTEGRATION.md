# Frontend Integration Guide

This document describes how to integrate the Friends of Nyina wa Jambo frontend with this Strapi backend.

## API Endpoints

The Strapi backend exposes the following REST API endpoints:

### Single Types
- `GET /api/global` - Global site settings (site name, description, SEO)
- `GET /api/about` - About page content

### Collection Types
- `GET /api/articles` - List all articles
- `GET /api/articles/:id` - Get a specific article
- `GET /api/articles?filters[slug][$eq]=my-article` - Get article by slug
- `GET /api/categories` - List all categories
- `GET /api/authors` - List all authors

## Populating Relations

Strapi v5 requires explicit population of relations. Use the `populate` parameter:

```bash
# Populate all relations (use with caution)
GET /api/articles?populate=*

# Populate specific relations
GET /api/articles?populate[cover]=true&populate[author][populate][avatar]=true&populate[category]=true

# Deep populate with blocks
GET /api/articles?populate[blocks][populate]=*
```

## Authentication

For public content, ensure the content types have public permissions enabled in the Strapi admin:

1. Go to Settings > Users & Permissions plugin > Roles
2. Click on "Public"
3. Enable `find` and `findOne` for the content types you want to expose

## Environment Variables

### Backend (.env)
```
FRONTEND_URL=http://localhost:3000  # For CORS
```

### Frontend (.env.local)
```
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token-here  # Optional, for authenticated requests
```

## Response Format

Strapi v5 returns data in the following format:

```json
{
  "data": {
    "id": 1,
    "documentId": "abc123",
    "attributes": {
      "title": "My Article",
      "slug": "my-article",
      ...
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 10
    }
  }
}
```

## Local Development

1. Start the Strapi backend:
   ```bash
   cd friends-of-nyina-wa-jambo-backend
   npm run develop
   ```
   Backend runs on http://localhost:1337

2. Start the Next.js frontend:
   ```bash
   cd friends-of-nyina-wa-jambo-frontend
   npm run dev
   ```
   Frontend runs on http://localhost:3000

3. Access Strapi admin at http://localhost:1337/admin
