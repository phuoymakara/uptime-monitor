module.exports = {
  apps: [
    {
      name: "uptime-uat",
      script: "yarn",
      args: "start",
      env: {
        PORT: Number(process.env.PORT) || 4004
      }
    }
  ]
}
