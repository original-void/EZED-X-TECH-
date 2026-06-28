module.exports = {
    name: 'jid',
    async execute(sock, msg, { from }) {
        await sock.sendMessage(from, { text: `🆔 \`${from}\`` });
    }
}
