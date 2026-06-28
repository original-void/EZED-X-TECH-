module.exports = {
    name: 'antilink',
    async execute(sock, msg, { from, args, isGroup, botIsAdmin, senderIsAdmin, groupSettings }) {
        if(!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
        if(!botIsAdmin) return sock.sendMessage(from, { text: `❌ Bot must be Admin 👑` });
        if(!senderIsAdmin) return sock.sendMessage(from, { text: `❌ You must be Admin 👑` });
        const settings = groupSettings.get(from) || {};
        if(args === 'on') { settings.antilink = true; }
        else if(args === 'off') { settings.antilink = false; }
        else return sock.sendMessage(from, { text: '🚫 Usage: `.antilink on/off`' });
        groupSettings.set(from, settings);
        await sock.sendMessage(from, { text: `🚫 Antilink: ${settings.antilink? 'ON' : 'OFF'}` });
    }
}
