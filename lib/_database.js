import { parsePhoneNumber } from "libphonenumber-js"
import fs from 'fs'
import { language, timezone } from "./_language.js";

export default async function database (m, { sock, db }) {

    const code = m.metadata ? await sock.groupInviteCode(m.from).catch(_ => null) : false
    let isNumber = v => typeof v == 'number' && !isNaN(v);
    let isBoolean = v => typeof v == 'boolean' && Boolean(v);

    let SET_DEFAULT_WELCOME = "*¤* Bienvenido a @group!\n\n_@action_\n\n*◈ Time:* @time\n\n@desc"
    let SET_DEFAULT_BYE = "*¤* Adiós @user!\n\n_@action_\n\n*◈ Time:* @time\n\n@desc"
    let SET_DEFAULT_DEMOTE = "*¤* Usuario degradado @user!\n\n_@action_\n\n*◈ Time:* @time\n*◈ Rol:* miembro\n\n@desc"
    let SET_DEFAULT_PROMOTE = "*¤* Usuario promovido @user!\n\n_@action_\n\n*◈ Time:* @time\n*◈ Rol:* administrador\n\n@desc"
    let SET_DEFAULT_MODIFY = "*¤* Grupo modificado!\n\n_@action_\n\n*◈ Time:* @time\n\n@desc"
    

    if (Object.values(await sock.fetchBlocklist()).includes(m.sender)) return

    if (m.metadata && (m.from.endsWith('@g.us'))) {
        let chat = db.data.chats[m.from];
        if (typeof chat != 'object') db.data.chats[m.from] = {};

        if (chat) {
            if (!('name' in chat)) chat.name = m.metadata.subject;
            if (!('code' in chat)) chat.code = m.isBotAdmin ? code : null;
            if (!('messages' in chat)) chat.messages = { add: SET_DEFAULT_WELCOME, remove: SET_DEFAULT_BYE, demote: SET_DEFAULT_DEMOTE, promote: SET_DEFAULT_PROMOTE, modify: SET_DEFAULT_MODIFY };
            if (!isBoolean(chat.mute)) chat.mute = false;
            if (!isBoolean(chat.notify)) chat.notify = false;
            if (!isBoolean(chat.welcome)) chat.welcome = false;
            if (!isBoolean(chat.badword)) chat.badword = false;
            if (!isBoolean(chat.antione)) chat.antione = false;
            if (!isBoolean(chat.antileg)) chat.antileg = false;
            if (!isBoolean(chat.antilink)) chat.antilink = false;
            if (!isBoolean(chat.antifake)) chat.antifake = false;
            if (!isBoolean(chat.antidelete)) chat.antidelete = false;
            if (typeof chat.link != 'object') chat.link = [];
            if (typeof chat.fake != 'object') chat.fake = [];
            if (typeof chat.badlist != 'object') chat.badlist = [];

        } else {
            db.data.chats[m.from] = {
                name: m.metadata.subject,
                code: m.isBotAdmin ? code : null,
                messages: { add: SET_DEFAULT_WELCOME, demote: SET_DEFAULT_DEMOTE, promote: SET_DEFAULT_PROMOTE, remove: SET_DEFAULT_BYE, modify: SET_DEFAULT_MODIFY },
                mute: false,
                notify: false,
                welcome: false,
                badword: false,
                antione: false,
                antileg: false,
                antilink: false,
                antifake: false,
                antidelete: false,
                link: [],
                fake: [],
                badlist: [],
            };
        }
    }

    if ((m.sender.endsWith('@s.whatsapp.net'))) {
        let user = db.data.users[m.sender];
        if (typeof user != 'object') db.data.users[m.sender] = {}

        const country = parsePhoneNumber(`+${m.sender.replace("@s.whatsapp.net", "")}`).country

        if (user) {
            if (!('name' in user)) user.name = m.pushName
            if (!('number' in user)) user.number = m.sender
            if (!('language' in user)) user.language = language[country] || 'es'
            if (!('timezone' in user)) user.timezone = timezone[country] || 'America/Lima'
            if (!('country' in user)) user.country = country || 'PE'
            if (!('premium' in user) || typeof user.premium != 'object') user.premium = { level: 0, time: 0 }
            if (!isBoolean(user.registered)) user.registered = false;
            if (!isBoolean(user.blacklist)) user.blacklist = false;
            if (!('banned' in user) || typeof user.banned != 'object') user.banned = { status: false, time: 0 }
            if (!isNumber(user.count)) user.count = 0;
            if (!isNumber(user.level)) user.level = 1;
            if (!isNumber(user.requests)) user.requests = 50;
            if (!isNumber(user.koins)) user.koins = 1000;
            if (!isNumber(user.warnings)) user.warnings = 0
            if (!isNumber(user.last)) user.last = 0
            user.count += 1;
        } else {
            db.data.users[m.sender] = {
                name: m.pushName,
                number: m.sender,
                language: language[country] || 'en',
                timezone: timezone[country],
                country: country,
                premium: {
                    level: 0,
                    time: 0,
                },
                registered: false,
                blacklist: false,
                banned: {
                    status: false,
                    time: 0
                },
                count: 0,
                level: 1,
                koins: 1000,
                requests: 50,
                warnings: 0,
                last: 0,
            };
        }
    }

    let bot = db.data.settings[sock.user.jid]
    if (typeof bot != 'object') db.data.settings[sock.user.jid] = {}

    if (bot) {
        if (!('name' in bot)) bot.name = sock.user.name || await sock.getName(sock.user.jid);
        if (!('language' in bot)) bot.language = 'en';
        if (!isBoolean(bot.private)) bot.private = false;
        if (!isBoolean(bot.dev)) bot.dev = false;
        if (!isBoolean(bot.autobio)) bot.autobio = false;
        if (!isBoolean(bot.autorestart)) bot.autorestart = false;
        if (!isNumber(bot.bioTime)) bot.bioTime = 0;
        if (typeof bot.hit != 'object') bot.hit = [];
        if (typeof bot.prefix != 'object') bot.prefix = prefix
    } else {
        db.data.settings[sock.user.jid] = {
            name: sock.user.name || await sock.getName(sock.user.jid),
            language: 'en',
            private: false,
            dev: false,
            autobio: false,
            autorestart: false,
            bioTime: 0,
            hit: [],
            prefix: _config.prefix,
        };
    }

    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
}