module.exports = {
    name: 'gpt',
    async execute(sock, msg, { from, args, callAI }) {
        if(!args) return sock.sendMessage(from, { text: '🧠 Usage: `.gpt who are you`' });
        await sock.sendMessage(from, { text: '🧠 Thinking...' });
        const res = await callAI(args);
        await sock.sendMessage(from, { text: `🧠 *AI:* ${res}` });
    }
}
