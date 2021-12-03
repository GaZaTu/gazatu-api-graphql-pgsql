declare module 'node-fetch' {
  namespace nodeFetch { }
  const nodeFetch: typeof fetch
  export = nodeFetch
}
