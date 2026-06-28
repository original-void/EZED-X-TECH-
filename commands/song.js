const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'song',
    desc: 'Download song as MP3 file',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎵 Usage: `.song song name`' });
        
        const sentMsg = await sock.sendMessage(from, { text: `🎵 Searching: *${args}*...` });
        try {
            const search = await ytSearch(args);
            const video = search.videos[0];
            if(!video) return sock.sendMessage(from, { text: '❌ No song found', edit: sentMsg.key });

            await sock.sendMessage(from, { text: `⬇️ Downloading: *${video.title}*...`, edit: sentMsg.key });

            // 1. Get direct MP3 link from Cobalt
            const res = await axios.post('https://api.cobalt.tools/api/json', {
                url: video.url,
                aFormat: "mp3",
                isAudioOnly: true,
                filenameStyle: "classic"
            }, { headers: { 'Accept': 'application/json', 'Origin': 'https://cobalt.tools' } });

            if(res.data.status!== 'success') throw new Error(res.data.error?.code || 'Cobalt API failed');

            // 2. DOWNLOAD THE FILE TO BOT RAM
            const audioBuffer = (await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 60000 })).data;
            
            // 3. SEND THE FILE, NOT LINK
            await sock.sendMessage(from, { 
                audio: audioBuffer, 
                mimetype: 'audio/mpeg', 
                fileName: `${video.title}.mp3`, 
                caption: `🎵 *${video.title}* | ${video.timestamp}` 
            }, { edit: sentMsg.key });

        } catch(e) {
            console.log(e);
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}\n\nTip: API is rate limited. Wait 1 min and try again.`, edit: sentMsg.key });
        }
    }
}
