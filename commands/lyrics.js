const axios = require('axios');
module.exports = {
    name: 'lyrics',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '📝 Usage: `.lyrics song name`' });
        try {
            const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(args)}`);
            let lyrics = res.data.lyrics || '❌ Not found';
            if(lyrics.length > 1500) lyrics = lyrics.slice(0, 1500) + '...';
            await sock.sendMessage(from, { text: `📝 *${args}*\n\n${lyrics}` });
        } catch(e) { await sock.sendMessage(from, { text: `❌ Not found` }); }
    }
}
