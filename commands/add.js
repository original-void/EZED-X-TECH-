module.exports = {
    name: 'add',
    async execute(sock, msg, { from, args, isGroup, botIsAdmin, senderIsAdmin }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin 👑` });
        if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin 👑` });
        const num = args.replace(/[^0-9]/g, '');
        if (!num) return sock.sendMessage(from, { text: '👑 Usage: `.add 2547...`' });
        const jid = `${num}@s.whatsapp.net`;
        await sock.groupParticipantsUpdate(from, [jid], 'add');
        await sock.sendMessage(from, { text: `➕ Added @${num}`, mentions: [jid] });
    }
}
