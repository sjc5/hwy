Notes about this setup:

1. It's using Vercel.
2. You need to set `NODEJS_HELPERS=0` in your production environment variables for Hono post requests to work on Vercel serverless.
3. It's using npm directly, to avoid interacting with pnpm at all, which is used for the overall monorepo.
