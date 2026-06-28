const axios = require('axios');

module.exports = {
    name: 'lyrics',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '📜 Usage: `.lyrics song name`' });
        const sentMsg = await sock.sendMessage(from, { text: `📜 Searching lyrics: ${args}...` });
        try {
            const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(args.split(' ')[0])}/${encodeURIComponent(args)}`);
            const lyrics = res.data.lyrics;
            if(!lyrics) return sock.sendMessage(from, { text: '❌ Lyrics not found', edit: sentMsg.key });
            
            // WhatsApp limit is ~4096 chars
            const chunks = lyrics.match(/[\s\S]{1,4000}/g) || [];
            await sock.sendMessage(from, { text: `📜 *${args}*\n\n${chunks[0]}`, edit: sentMsg.key });
            for(let i=1; i<chunks.length; i++) {
                await sock.sendMessage(from, { text: chunks[i] });
            }
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Lyrics not found for: ${args}`, edit: sentMsg.key });
        }
    }
}
