module.exports = {
    name: 'ping',
    async execute(sock, msg, { from }) {
        const s = Date.now();
        await sock.sendMessage(from, { text: `🏓 Pong \`${Date.now() - s}ms\`` });
    }
}
