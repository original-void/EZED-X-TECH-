module.exports = {
    name: 'warnings',
    async execute(sock, msg, { from, mentions, isGroup, warningsDB }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        const target = mentions[0] || msg.key.participant;
        const key = `${from}_${target}`;
        const warns = warningsDB.get(key) || 0;
        await sock.sendMessage(from, { text: `📊 @${target.split('@')[0]} has ${warns}/3 warns`, mentions: [target] });
    }
}
