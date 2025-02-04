export default {
    name: 'delfake',
    params: ['prefix'],
    description: 'Eliminar un prefijo de número falso de la lista',
    comand: ['delfake'],
    exec: async (m, { sock, db }) => {
        if (!db.data.chats[m.from].antifake) return m.reply('➤ Comando: delfake ⧉ Error: El antifake no está habilitado en este grupo.');
        
        const index = db.data.chats[m.from].fake.indexOf(m.args[0]);
        if (index === -1) return m.reply(`➤ Comando: delfake ⧉ Error: El prefijo ${m.args[0]} no se encuentra en la lista de números falsos.`);
        
        db.data.chats[m.from].fake.splice(index, 1);
        await m.reply(`➤ Comando: delfake ⧉ Prefijo ${m.args[0]} eliminado de la lista de números falsos.`);
    },
    isAdmin: true,
    isGroup: true
}
