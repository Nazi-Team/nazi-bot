import { fileURLToPath } from "url"
import Plugins from "../lib/_plugins.js"
import path from "path"
import fs from "fs"

global.origen = path.dirname(fileURLToPath(import.meta.url))
global._config = {
    owner: {
        number: "573234097278",
        name: "Pineda",
        img: "https://files.catbox.moe/3m9yzl.jpg"
    },
    bot: {
        name: "𝐍𝐀𝐙𝐈 • 𝐁𝐎𝐓",
        version: "1.0",
        hd: "https://files.catbox.moe/kkdvjl.jpg",
        img: "https://files.catbox.moe/ahdtgk.jpg"
    },
    mods: ['51968374620', '51979549311', '573013116003'],
    prefix: ['!', '?', '/', '.', '#'],
    react: {
        setting: '⚙️',
        wait: '⏳',
        global: '✨',
        error: '❌'
    },
}

global.plugins = []
const plugin = new Plugins('plugins')
plugin.readPlugin(plugin.folder)
global.plugins = Object.values(plugin.plugins)

global.node_path = 'db.json';

if (!fs.existsSync(node_path)) {
    fs.writeFileSync(node_path, JSON.stringify({ data: { users: {}, chats: {}, settings: {} } }, null, 2));
}

global.db = JSON.parse(fs.readFileSync(node_path, 'utf-8'))
