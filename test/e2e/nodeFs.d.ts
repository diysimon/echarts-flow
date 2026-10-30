// The project typechecks against DOM types only; e2e specs run in Node and need this one call.
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
}
