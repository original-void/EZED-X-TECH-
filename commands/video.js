const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'video',
    desc: 'Download video as MP4 file',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎥 Usage: `.video name` or url' });
        
        const sentMsg = await sock.sendMessage(from, { text: `🎥 Searching: *${args}*...` });
        try {
            let url = args.includes('http')? args : (await ytSearch(args)).videos[0].url;

            await sock.sendMessage(from, { text: `⬇️ Downloading video...`, edit: sentMsg.key });

            // 1. Get 480p MP4 link from Cobalt. 480p = under 16MB for WhatsApp
            const res = await axios.post('https://api.cobalt.tools/api/json', {
                url: url,
                vQuality: "480",
                isAudioOnly: false,
                filenameStyle: "classic"
            }, { headers: { 'Accept': 'application/json', 'Origin': 'https://cobalt.tools' } });

            if(res.data.status!== 'success') throw new Error(res.data.error?.code || 'Cobalt API failed');

            // 2. DOWNLOAD THE FILE TO BOT RAM
            const videoBuffer = (await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 90000, maxContentLength: 16 * 1024 * 1024 })).data;
            
            // 3. SEND THE FILE, NOT LINK
            await sock.sendMessage(from, { video: videoBuffer, caption: `🎥 Video` }, { edit: sentMsg.key });

        } catch(e) {
            console.log(e);
            if(e.code === 'ERR_BAD_REQUEST') {
                return sock.sendMessage(from, { text: `❌ Video too big for WhatsApp >16MB. Try a shorter video.`, edit: sentMsg.key });
            }
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}\n\nTip: API is rate limited. Wait 1 min.`, edit: sentMsg.key });
        }
    }
}
