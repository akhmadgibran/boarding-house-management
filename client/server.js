/**
 * Passenger Entry Point for cPanel - Next.js Standalone
 *
 * With `output: 'standalone'` in next.config.ts, Next.js generates
 * its own server at .next/standalone/server.js.
 * This file simply delegates to that generated server.
 */
process.chdir(__dirname);
void import("./.next/standalone/server.js");
