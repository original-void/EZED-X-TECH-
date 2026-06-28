const ytSearch = require('yt-search');
const ytDlpExec = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'video',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎥 Usage: `.video name` or url' });
        const sentMsg = await sock.sendMessage(from, { text: `🎥 Downloading: ${args}...` });
        try {
            let url = args.includes('http')? args : (await ytSearch(args)).videos[0].url;

            const filePath = path.join(__dirname, `../temp_${Date.now()}.mp4`);
            await ytDlpExec(url, {
                output: filePath,
                format: 'bv*[height<=480]+ba/b[height<=480]',
                noPlaylist: true,
                noCheckCertificates: true,
                preferInsecure: true,
                maxFilesize: '16M' // WhatsApp limit
            });

            const stats = fs.statSync(filePath);
            if(stats.size > 16 * 1024 * 1024) {
                fs.unlinkSync(filePath);
                return sock.sendMessage(from, { text: '❌ Video too big. Max 16MB', edit: sentMsg.key });
            }

            const buffer = fs.readFileSync(filePath);
            await sock.sendMessage(from, { video: buffer, caption: `🎥 Video`, edit: sentMsg.key });
            fs.unlinkSync(filePath);
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}`, edit: sentMsg.key });
        }
    }
}
