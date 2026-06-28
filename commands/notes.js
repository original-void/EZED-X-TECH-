module.exports = {
    name: 'notes',
    async execute(sock, msg, { from, args, notesDB, sender }) {
        const [action,...rest] = args.split(' ');
        const text = rest.join(' ');
        const key = sender;
        const userNotes = notesDB.get(key) || [];
        if(action === 'save') { userNotes.push(text); notesDB.set(key, userNotes); return sock.sendMessage(from, { text: `🗒️ Saved note #${userNotes.length}` }); }
        if(action === 'list') { return sock.sendMessage(from, { text: `🗒️ *Your Notes:*\n${userNotes.map((n,i)=>`${i+1}. ${n}`).join('\n') || 'Empty'}` }); }
        if(action === 'del') { userNotes.splice(parseInt(rest[0])-1,1); notesDB.set(key, userNotes); return sock.sendMessage(from, { text: `🗒️ Deleted` }); }
        return sock.sendMessage(from, { text: '🗒️ Usage: `.notes save/list/del #`' });
    }
}
