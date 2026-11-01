/// <reference types="vite/client" />

declare module 'virtual:forja-mock-library' {
  const library: import('./shared/api/mock-library').MockLibrary
  export default library
}
