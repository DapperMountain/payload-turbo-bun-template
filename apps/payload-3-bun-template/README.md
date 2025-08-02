# Overview

This is an opinionated setup of Payload 3, with the following features:

- Uses [Bun](https://bun.sh/)
- Centralized [Zod](https://zod.dev/) config
- Abstracted Role-based access controls
- Multi-tenant support
- Database seed scripts
- Unit test examples

## Development

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this project locally. To do so, follow these steps:

1. First clone the repo
1. Then `cd YOUR_PROJECT_REPO && cp .env.example .env`, making sure `DATA_SEED_ENABLED=1` if you want to start with a seeded database
1. Next run `docker compose up -d`
1. Now open `http://localhost:3001/admin` to access the admin panel
1. Log in using one of the users defined during the database seed process. If seeding is disabled, Payload will ask you to create an initial user.

That's it! Changes made in `./src` will be reflected in your app.

The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

### Local

1. First clone the repo
1. Then `cd YOUR_PROJECT_REPO && cp .env.example .env`, making sure `DATA_SEED_ENABLED=1` if you want to start with a seeded database
1. Next run `bun install && bun dev`
1. Now open `http://localhost:3001/admin` to access the admin panel
1. Log in using one of the users defined during the database seed process. If seeding is disabled, Payload will ask you to create an initial user.

That's it! Changes made in `./src` will be reflected in your app.

### Deployment

A [fly.io](https://fly.io) configuration is provided via [fly.toml](fly.toml).

## Acknowledgments

**[payload-tools](https://github.com/teunmooij/payload-tools)**: Portions of the access logic were adapted from the [payload-rbac](https://github.com/teunmooij/payload-tools/tree/main/packages/rbac) package within that repository.
