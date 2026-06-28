module.exports = {
    name: 'hidetag',
    async execute(sock, msg, { from, args, isGroup, groupMeta }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        const members = groupMeta.participants.map(p => p.id);
        const text = args || '👻 Hidden tag';
        await sock.sendMessage(from, { text: text, mentions: members });
    }
}
