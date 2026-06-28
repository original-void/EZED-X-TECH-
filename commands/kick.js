module.exports = {
    name: 'kick',
    async execute(sock, msg, { from, mentions, isGroup, botIsAdmin, senderIsAdmin }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin 👑` });
        if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin 👑` });
        
        const target = mentions[0];
        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.kick @user`' });
        await sock.groupParticipantsUpdate(from, [target], 'remove');
        await sock.sendMessage(from, { text: `👢 Kicked @${target.split('@')[0]}`, mentions: [target] });
    }
}
