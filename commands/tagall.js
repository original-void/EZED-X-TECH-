module.exports = {
    name: 'tagall',
    async execute(sock, msg, { from, isGroup, groupMeta }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        const members = groupMeta.participants.map(p => p.id);
        await sock.sendMessage(from, { text: `📢 *TAG ALL* \n\nEveryone assemble!`, mentions: members });
    }
}
