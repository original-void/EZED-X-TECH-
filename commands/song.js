const ytSearch = require('yt-search');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const YT_DLP_PATH = path.join(__dirname, '../bin/yt-dlp');

module.exports = {
    name: 'song',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎵 Usage: `.song juju on that beat`' });
        const sentMsg = await sock.sendMessage(from, { text: `🎵 Searching: ${args}...` });
        const filePath = path.join(__dirname, `../temp_${Date.now()}.mp3`);
        try {
            const video = (await ytSearch(args)).videos[0];
            if(!video) return sock.sendMessage(from, { text: '❌ No song found' });

            // V10.10.8 ANTI-BLOCK FLAGS
            const cmd = `${YT_DLP_PATH} -x --audio-format mp3 --audio-quality 0 --cookies-from-browser chrome --extractor-retries 3 --sleep-requests 1 -o "${filePath}" "${video.url}"`;
            await execAsync(cmd);

            const buffer = fs.readFileSync(filePath);
            await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3`, caption: `🎵 *${video.title}*` });
            fs.unlinkSync(filePath);
        } catch(e) {
            if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
            await sock.sendMessage(from, { text: `❌ Failed: YouTube blocked us. Try again in 1 min.\n${e.message}`, edit: sentMsg.key });
        }
    }
}
