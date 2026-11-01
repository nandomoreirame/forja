// The user's home folder on Linux, macOS and Windows; the renderer cannot ask the OS for it.
const home = /^(?:\/home\/[^/]+|\/Users\/[^/]+|[A-Za-z]:\\Users\\[^\\]+)(?=$|[/\\])/

/** Shows a path under the home folder as `~/...`, so the user name never appears. */
export function displayPath(path: string) {
  return path.replace(home, '~')
}
