module.exports = {
    name: 'warn',
    async execute(sock, msg, { from, mentions, isGroup, botIsAdmin, senderIsAdmin, warningsDB }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin 👑` });
        if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin 👑` });
        const target = mentions[0]; if (!target) return sock.sendMessage(from, { text: '⚠️ Usage: `.warn @user`' });
        const key = `${from}_${target}`;
        const warns = (warningsDB.get(key) || 0) + 1;
        warningsDB.set(key, warns);
        if(warns >= 3) {
            warningsDB.delete(key);
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            return sock.sendMessage(from, { text: `👢 @${target.split('@')[0]} Kicked. 3/3 warns.`, mentions: [target] });
        }
        await sock.sendMessage(from, { text: `⚠️ Warned @${target.split('@')[0]} ${warns}/3`, mentions: [target] });
    }
}
