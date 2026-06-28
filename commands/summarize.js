module.exports = {
    name: 'summarize',
    async execute(sock, msg, { from, args, callAI }) {
        const text = args || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
        if(!text) return sock.sendMessage(from, { text: '📄 Usage: `.summarize text` or reply to text' });
        await sock.sendMessage(from, { text: '📄 Summarizing...' });
        const res = await callAI(`Summarize this in 3 bullets: ${text}`);
        await sock.sendMessage(from, { text: `📄 *Summary:*\n${res}` });
    }
}
