module.exports = {
  apps: [
    {
      name: 'webforge',
      script: 'npm',
      args: 'start',
      cwd: '.',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        TRUST_PROXY: 'true',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      time: true,
    },
  ],
}
