**Project Description**

- **Overview:**: A real-time chat backend built with NestJS and TypeScript. It provides authentication (JWT access + refresh tokens), presence tracking, WebSocket-based real-time messaging (Socket.IO-compatible gateway), and persistence via Prisma. The project is organized into feature modules such as `auth`, `users`, `chat`, `message`, and `notification`.

**Tech Stack**

- **Framework**: NestJS (modular, decorators-based server)
- **Language**: TypeScript
- **Database / ORM**: Prisma (schema in `prisma/schema.prisma`) — typically used with PostgreSQL or MySQL via `DATABASE_URL`.
- **Auth**: JWT (access + refresh tokens) using `@nestjs/jwt` and Passport strategies
- **Real-time**: WebSocket gateway implemented with NestJS Gateway + `socket.io` types (server-side `socket.io` usage in `src/chat/chat.gateway.ts`).
- **Cache / Presence**: Redis (optional) — presence and caching helpers are present in `src/redis` and `src/presence`.
- **Other libs**: `bcrypt` for password hashing, `cookie-parser` for cookie handling, `class-validator` / `class-transformer` for DTO validation.

**Getting Started**

- **Prerequisites**:
  - Node.js (v18+ recommended)
  - npm (or yarn/pnpm)
  - A running relational database (Postgres / MySQL) and a configured `DATABASE_URL` for Prisma
  - (Optional) Redis instance for presence/caching if you plan to enable those features

- **Environment**:
  - Create a `.env` file in the project root containing at minimum:
    - `DATABASE_URL` (Prisma)
    - `JWT_ACCESS_SECRET` (string)
    - `JWT_REFRESH_SECRET` (string)
    - `PORT` (optional)
    - `REDIS_URL` (optional)

- **Install Dependencies**:

```powershell
cd /path/to/chat-backend
npm install
```

- **Prisma setup / Migrations**:

```powershell
# generate prisma client
npx prisma generate

# Run migrations in development (creates and applies a migration)
npx prisma migrate dev

# Or deploy migrations in production
npx prisma migrate deploy
```

- **Run the app**:

```powershell
# development (watch)
npm run start:dev

# production
npm run build
npm run start:prod
```

**Environment examples**

Create a `.env` with (example values):

```
DATABASE_URL="postgresql://user:pass@localhost:5432/chatdb"
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"
PORT=7000
REDIS_URL="redis://localhost:6379"
```

**API Endpoints**

- **Authentication** (`src/auth/auth.controller.ts`)
  - `POST /auth/register` : Register a new user. Request body: registration DTO (email, password, ...). Returns `accessToken` and sets an HTTP-only `refresh_token` cookie.
  - `POST /auth/login` : Login with credentials. Request body: login DTO (email, password). Returns `accessToken` and sets `refresh_token` cookie.
  - `POST /auth/refresh` : Exchange refresh cookie for a new access token. Uses a guard that reads the `refresh_token` cookie. Returns a fresh `accessToken` and rotates the refresh cookie.
  - `POST /auth/logout` : Invalidates refresh token server-side and clears the `refresh_token` cookie. Requires a valid access token.

- **WebSocket (Real-time)** (`src/chat/chat.gateway.ts`)
  - Connect: When initializing a socket connection, pass the JWT access token in the `auth` handshake payload, for example:

```js
// client-side socket.io connect example
const socket = io(SERVER_URL, { auth: { token: ACCESS_TOKEN } });
```

  - Events emitted by server:
    - `presence_update` : informs relevant friend rooms of user online/offline changes
    - `user_typing` : volatile typing indicator forwarded to a chat room

  - Client -> Server events handled:
    - `join_chat` (payload: `chatId`) — join a chat room
    - `typing` (payload: `{ chatId, isTyping }`) — forwarded as `user_typing` to the room

- **Other REST modules**
  - The repo contains additional controllers and modules for `users`, `chat`, `message`, and `notification` (look under `src/`). Inspect those controllers for full REST API details and request/response DTOs.

**Notes & Security**

- Access tokens are short-lived and returned in responses (`accessToken`). Refresh tokens are stored in a secure, httpOnly cookie scoped to `/auth/refresh` and rotated on refresh.
- Make sure to set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values in production and to run over HTTPS so cookies set with `secure: true` are usable.

**Troubleshooting**

- If strategies complain about missing config during app bootstrap, ensure `ConfigModule` (or a `.env` loader) is initialized early and that `ConfigService` is available to providers that need environment values.
- Prisma errors: ensure `DATABASE_URL` is valid and migrations have been applied.

**Development Tips**

- Use `npm run start:dev` for automatic reloads during development.
- Use Postman / HTTP client for auth endpoints, and a Socket.IO client (or your frontend) for realtime testing.

**License**

- This project is licensed under the MIT License. See `LICENSE` for details.
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
