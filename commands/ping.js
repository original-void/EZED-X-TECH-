module.exports = {
    name: 'ping',
    async execute(sock, msg, { from }) {
        const start = Date.now();
        const sentMsg = await sock.sendMessage(from, { text: `🏓 Ponging...` });
        const end = Date.now();
        await sock.sendMessage(from, { text: `🏓 Pong \`${end - start}ms\``, edit: sentMsg.key });
    }
}
