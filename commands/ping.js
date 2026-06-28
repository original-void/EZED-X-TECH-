module.exports = {
    name: 'ping',
    async execute(sock, msg, { from }) {
        const start = Date.now(); // V10.2: Start timer BEFORE sending
        const sentMsg = await sock.sendMessage(from, { text: `🏓 Ponging...` });
        const end = Date.now(); // End timer AFTER WhatsApp confirms
        await sock.sendMessage(from, { text: `🏓 Pong \`${end - start}ms\``, edit: sentMsg.key }); // Edit instead of spam
    }
}
