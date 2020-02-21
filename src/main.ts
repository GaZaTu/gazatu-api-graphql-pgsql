import { App } from './app'

new App()
  .listen({ useLogger: (process.env.NODE_ENV !== 'production') })
  .then(() => console.log('listening'))
