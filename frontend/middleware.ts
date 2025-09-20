import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Only need to specify API health endpoint as public
const isPublicRoute = createRouteMatcher([
  '/api/health'
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except public ones (Clerk handles auth pages automatically)
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};