import { clerkMiddleware } from "@clerk/nextjs/server";

// All routes are public — demo app, no sign-in required.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte?|ttf|woff2?|png|jpg|jpeg|gif|svg|ico|webp)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
