module.exports = {
    name: 'leave',
    async execute(sock, msg, { from, isGroup, isOwner }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        if(!isOwner) return sock.sendMessage(from, { text: '❌ Owner only' });
        
        await sock.sendMessage(from, { text: '👋 EZED X TECH is leaving... Bye!' });
        await sock.groupLeave(from);
    }
}
