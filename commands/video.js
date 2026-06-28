const ytSearch = require('yt-search');
const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs');
const path = require('path');
const ytDlp = new YTDlpWrap('/usr/local/bin/yt-dlp');

module.exports = {
    name: 'video',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎥 Usage: `.video name` or url' });
        const sentMsg = await sock.sendMessage(from, { text: `🎥 Downloading: ${args}...` });
        try {
            let url = args.includes('http')? args : (await ytSearch(args)).videos[0].url;

            const filePath = path.join(__dirname, `../temp_${Date.now()}.mp4`);
            await ytDlp.execPromise([url, '-f', 'bv*[height<=480]+ba/b[height<=480]', '-o', filePath, '--max-filesize', '16M']);

            const buffer = fs.readFileSync(filePath);
            await sock.sendMessage(from, { video: buffer, caption: `🎥 Video`, edit: sentMsg.key });
            fs.unlinkSync(filePath);
        } catch(e) {
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}`, edit: sentMsg.key });
        }
    }
}
