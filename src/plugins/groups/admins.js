export default {
    name: 'admins',
    description: 'Etiqueta a todos los administradores del grupo',
    comand: ['admins'],
    isQuoted: true,
    exec: async (m, { sock }) => {
        await sock.sendMessage(m.from, {
            forward: m.quoted,
            contextInfo: { mentionedJid: m.admins, remoteJid: m.from }
        });
    },
    isAdmin: true,
    isGroup: true
}
