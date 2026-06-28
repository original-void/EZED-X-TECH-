module.exports = {
    name: 'mute',
    async execute(sock, msg, { from, isGroup, botIsAdmin, senderIsAdmin }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin 👑` });
        if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin 👑` });
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: `🔇 Group muted. Only admins can chat.` });
    }
}
