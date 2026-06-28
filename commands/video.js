const ytSearch = require('yt-search');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
    name: 'video',
    async execute(sock, msg, { from, args }) {
        if(!args) return sock.sendMessage(from, { text: '🎥 Usage: `.video name` or url' });
        const sentMsg = await sock.sendMessage(from, { text: `🎥 Downloading: ${args}...` });
        const filePath = path.join(__dirname, `../temp_${Date.now()}.mp4`);
        try {
            let url = args.includes('http')? args : (await ytSearch(args)).videos[0].url;

            await execAsync(`/usr/local/bin/yt-dlp -f "bv*[height<=480]+ba/b[height<=480]" --max-filesize 16M -o "${filePath}" "${url}"`);

            const buffer = fs.readFileSync(filePath);
            await sock.sendMessage(from, { video: buffer, caption: `🎥 Video`, edit: sentMsg.key });
            fs.unlinkSync(filePath);
        } catch(e) {
            if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
            await sock.sendMessage(from, { text: `❌ Failed: ${e.message}`, edit: sentMsg.key });
        }
    }
}
