export default {
    name: 'addfake',
    params: ['prefix'],
    description: 'Agregar un prefijo de número falso a la lista',
    comand: ['addfake'],
    exec: async (m, { sock, db }) => {
        if (!db.data.chats[m.from].antifake) return m.reply('➤ Comando: addfake ⧉ Error: El antifake no está habilitado en este grupo.');
        
        db.data.chats[m.from].fake.push(m.args[0]);
        await m.reply(`➤ Comando: addfake ⧉ Prefijo ${m.args[0]} agregado a la lista de números falsos.`);
    },
    isAdmin: true,
    isGroup: true
}
