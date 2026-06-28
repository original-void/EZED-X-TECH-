const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
module.exports = {
    name: 'song',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎵 Usage: `.song juju on that beat`' });
        await sock.sendMessage(from, { text: `🎵 Searching: ${args}...` });
        try {
            const video = (await ytSearch(args)).videos[0];
            if(!video) return sock.sendMessage(from, { text: '❌ No song found' });
            const stream = ytdl(video.url, { filter: 'audioonly' });
            const chunks = []; for await (const chunk of stream) chunks.push(chunk);
            await sock.sendMessage(from, { audio: Buffer.concat(chunks), mimetype: 'audio/mpeg', fileName: `${video.title}.mp3`, caption: `🎵 *${video.title}*` });
        } catch(e) { await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }); }
    }
}
