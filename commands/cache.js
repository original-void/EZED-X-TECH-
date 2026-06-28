module.exports = {
    name: 'cache',
    async execute(sock, msg, { from, isOwner, msgStore, vvStore }) {
        if(!isOwner) return sock.sendMessage(from, { text: '❌ Owner only' });
        msgStore.clear(); vvStore.clear();
        await sock.sendMessage(from, { text: '🧹 Cache cleared. Bot is fresh now ✅' });
    }
}
