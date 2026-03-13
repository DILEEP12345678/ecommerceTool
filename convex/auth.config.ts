// Tells Convex to trust JWTs issued by Clerk.
// Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard:
//   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-domain.clerk.accounts.dev
// Also requires a "convex" JWT template configured in your Clerk dashboard.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
