module.exports = {
    name: 'grammar',
    async execute(sock, msg, { from, args, callAI }) {
        const text = args || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
        if(!text) return sock.sendMessage(from, { text: '✅ Usage: `.grammar text` or reply to text' });
        const res = await callAI(`Fix the grammar and spelling only: ${text}`);
        await sock.sendMessage(from, { text: `✅ *Fixed:*\n${res}` });
    }
}
