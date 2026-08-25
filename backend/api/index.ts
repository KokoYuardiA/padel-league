// Vercel serverless entrypoint — every request is routed here by
// vercel.json's rewrite rule, and handled by the same Express app used
// for local dev / traditional hosts.
export { default } from '../src/index'
