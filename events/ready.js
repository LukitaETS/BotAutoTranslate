module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot conectado como ${client.user.tag}`);
  }
};
