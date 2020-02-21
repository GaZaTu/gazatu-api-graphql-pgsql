const { spawn } = require('child_process')

spawn(process.argv[2], process.argv.slice(3), {
  stdio: 'inherit',
})
