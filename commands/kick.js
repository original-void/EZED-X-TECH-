module.exports = {
    name: 'kick',
    async execute(sock, msg, { from, mentions, isGroup, getNumber }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        
        const groupMeta = await sock.groupMetadata(from).catch(()=>null);
        if(!groupMeta) return sock.sendMessage(from, { text: '❌ Could not get group data' });

        const senderNum = getNumber(msg.key.participant || from);
        const botNum = getNumber(sock.user.id);
        
        const senderIsAdmin = groupMeta.participants.find(p => getNumber(p.id) === senderNum)?.admin;
        const botIsAdmin = groupMeta.participants.find(p => getNumber(p.id) === botNum)?.admin;
        
        let debug = `🧪 *KICK DEBUG V10.1*\n`;
        debug += `Bot LID: ${botNum}\nBot Admin: ${botIsAdmin}\n`;
        debug += `You LID: ${senderNum}\nYou Admin: ${senderIsAdmin}\n\n`;
        debug += `*All members LID:*\n`;
        groupMeta.participants.forEach(p => {
            debug += `-> ${getNumber(p.id)} Admin: ${p.admin}\n`;
        });
        
        await sock.sendMessage(from, { text: debug }); // Send debug to group

        if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin. Current: ${botIsAdmin}` });
        if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin. Current: ${senderIsAdmin}` });
        
        const target = mentions[0];
        if (!target) return sock.sendMessage(from, { text: '👑 Usage: `.kick @user`' });
        
        try {
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            await sock.sendMessage(from, { text: `👢 Kicked @${target.split('@')[0]}`, mentions: [target] });
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Kick failed: ${e.message}` });
        }
    }
}
