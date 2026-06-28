module.exports = {
    name: 'tictactoe',
    async execute(sock, msg, { from, tttGames, newTTT, tttBoard }) {
        const game = newTTT();
        tttGames.set(from, {...game, player: msg.key.participant });
        await sock.sendMessage(from, { text: `❌⭕ *TIC TAC TOE*\nYou are X. Bot is O.\n${tttBoard(game.board)}` });
    }
}
