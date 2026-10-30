// Build flags. tools/build/build.mjs rewrites `dev: true` to `dev: false` with --release.
/** Dev builds read `?seed=N` and log warnings to the console. */
export const BUILD = Object.freeze({ dev: true });
