/**
 * Runs once when the server starts.
 *
 * Next calls `register` in every runtime, so runtime-specific code is imported
 * inside the guard rather than at the top of the file: a static import of a
 * Node built-in is a build warning when this module is compiled for the Edge
 * runtime, even where the code around it never runs.
 *
 * The IPv6 workaround this loads is development-only. Production is left on the
 * Node defaults, where IPv6 works.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'development') {
    await import('./instrumentation-node')
  }
}
