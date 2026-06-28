module.exports = {
    name: 'translate',
    async execute(sock, msg, { from, args, callAI }) {
        const parts = args.split(' ');
        const lang = parts[0];
        const text = parts.slice(1).join(' ') || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
        if(!lang ||!text) return sock.sendMessage(from, { text: '🌍 Usage: `.translate sw Hello`' });
        const res = await callAI(`Translate this to ${lang}: ${text}`);
        await sock.sendMessage(from, { text: `🌍 *${lang}:* ${res}` });
    }
}
