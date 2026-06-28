module.exports = {
    name: 'guess',
    async execute(sock, msg, { from, guessGames }) {
        const num = Math.floor(Math.random() * 100) + 1;
        guessGames.set(from, { num, tries: 0 });
        await sock.sendMessage(from, { text: `🔢 *GUESS GAME*\nI'm thinking 1-100.\nReply \`.g 50\`` });
    }
}
