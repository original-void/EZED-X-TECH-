module.exports = {
    name: 'rps',
    async execute(sock, msg, { from, args }) {
        const choices = ['rock', 'paper', 'scissors'];
        const bot = choices[Math.floor(Math.random() * 3)];
        const user = args.toLowerCase();
        if(!choices.includes(user)) return sock.sendMessage(from, { text: '✊ Usage: `.rps rock/paper/scissors`' });
        let result = 'Draw';
        if((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) result = 'You Win!';
        else if(user!== bot) result = 'Bot Wins!';
        await sock.sendMessage(from, { text: `✊ *RPS*\nYou: ${user} vs Bot: ${bot}\n*${result}*` });
    }
}
