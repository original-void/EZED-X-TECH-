const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
module.exports = {
    name: 'video',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎥 Usage: `.video name` or url' });
        try {
            let url = args.includes('http')? args : (await ytSearch(args)).videos[0].url;
            const info = await ytdl.getInfo(url);
            if(parseInt(info.videoDetails.lengthSeconds) > 600) return sock.sendMessage(from, { text: '❌ Max 10min' });
            const stream = ytdl(url, { quality: 'lowestvideo' });
            const chunks = []; for await (const chunk of stream) chunks.push(chunk);
            await sock.sendMessage(from, { video: Buffer.concat(chunks), caption: `🎥 *${info.videoDetails.title}*` });
        } catch(e) { await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }); }
    }
}
