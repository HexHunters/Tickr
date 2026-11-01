// Backend paths the browser may reach through the same-origin proxy.
// Authorization stays with the backend: these routes still require the right role.
const proxyPath =
  /^(events(?:\/[\w-]+)*|config\/public|notifications\/(?:preferences\/me|me|[\w-]+)|users\/me(?:\/password)?|orders(?:\/[\w-]+)*|tickets(?:\/[\w-]+)*|admin\/(?:users|events|orders)(?:\/[\w-]+)*)$/

export function isProxyPath(path: string): boolean {
  return proxyPath.test(path)
}
