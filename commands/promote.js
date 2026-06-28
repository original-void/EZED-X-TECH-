module.exports = { name: 'promote', async execute(sock, msg, { from, mentions, isGroup, botIsAdmin, senderIsAdmin }) {
    if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
    if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin 👑` });
    if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin 👑` });
    const target = mentions[0]; if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.promote @user`' });
    await sock.groupParticipantsUpdate(from, [target], 'promote');
    await sock.sendMessage(from, { text: `⬆️ Promoted @${target.split('@')[0]} to Admin`, mentions: [target] });
}}
