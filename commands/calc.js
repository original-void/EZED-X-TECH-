const math = require('mathjs');
module.exports = {
    name: 'calc',
    async execute(sock, msg, { from, args }) {
        if (!args) return sock.sendMessage(from, { text: '🧮 Usage: `.calc 2+2*5`' });
        try {
            const result = math.evaluate(args);
            await sock.sendMessage(from, { text: `🧮 \`${args}\` = \`${result}\`` });
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Invalid math` });
        }
    }
}
