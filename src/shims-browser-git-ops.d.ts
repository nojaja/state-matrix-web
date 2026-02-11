declare module 'browser-git-ops' {
  // Minimal ambient typing to satisfy TypeScript build.
  // Replace `any` with library-provided types if available later.
  export const OpfsStorage: any
  export const VirtualFS: any
  export default VirtualFS
}
