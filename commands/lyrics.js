const axios = require('axios');

module.exports = {
    name: 'lyrics',
    desc: 'Get song lyrics',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '📜 Usage: `.lyrics song name`' });
        const sentMsg = await sock.sendMessage(from, { text: `📜 Searching lyrics: *${args}*...` });
        try {
            const res = await axios.get(`https://some-random-api.com/others/lyrics?title=${encodeURIComponent(args)}`);
            const lyrics = res.data.lyrics;
            const title = res.data.title;
            if(!lyrics) throw new Error('Not found');
            
            const chunks = lyrics.match(/[\s\S]{1,4000}/g) || [];
            await sock.sendMessage(from, { text: `📜 *${title}*\n\n${chunks[0]}`, edit: sentMsg.key });
            for(let i=1; i<chunks.length; i++) {
                await sock.sendMessage(from, { text: chunks[i] });
            }
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Lyrics not found for: ${args}`, edit: sentMsg.key });
        }
    }
}
