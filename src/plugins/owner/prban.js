import axios from 'axios';

const LOADING_STATES = [
    { bar: "░░░░░░░░░░░░░░░░░░░░", icon: "↻", percent: "0%" },
    { bar: "██░░░░░░░░░░░░░░░░░░", icon: "⟳", percent: "10%" },
    { bar: "████░░░░░░░░░░░░░░░░", icon: "◌", percent: "20%" },
    { bar: "██████░░░░░░░░░░░░░░", icon: "↻", percent: "30%" },
    { bar: "████████░░░░░░░░░░░░", icon: "⟳", percent: "40%" },
    { bar: "██████████░░░░░░░░░░", icon: "◌", percent: "50%" },
    { bar: "████████████░░░░░░░░", icon: "↻", percent: "60%" },
    { bar: "██████████████░░░░░░", icon: "⟳", percent: "70%" },
    { bar: "████████████████░░░░", icon: "◌", percent: "80%" },
    { bar: "██████████████████░░", icon: "↻", percent: "90%" },
    { bar: "████████████████████", icon: "⟳", percent: "100%" }
];

const STATUS = { 0: "✅ Perfecto", 1: "🟢 Bajo", 50: "🟡 Moderado", 90: "🔴 Alto", 100: "🚫 Baneo" };

export default {
    name: "Analizador IP",
    description: "Verificación de IP fraudulenta",
    params: ["ip"],
    command: ["prban"],
    exec: async (m, { sock }) => {
        const ip = m.args[0];
        let msgKey;
        
        // Progreso garantizado
        for (const s of LOADING_STATES) {
            const txt = `「 ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦ 」\n⟨${s.bar}⟩\n… Procesando\n${s.icon} ${s.percent}`;
            msgKey = msgKey ? await sock.sendMessage(m.from, { text: txt, edit: msgKey.key }) 
                            : await sock.sendMessage(m.from, { text: txt });
            await new Promise(r => setTimeout(r, 350));
        }

        try {
            const { data } = await axios.get(`https://api11.scamalytics.com/alessandrovillogas/?key=df8d714f6807d3c5512914caed1302f17fb41728efa01d695a9db72734854f34&ip=${ip}`);
            const risk = Object.entries(STATUS).reduce((a, [k, v]) => data.score >= k ? v : a, STATUS[0]);
            
            await sock.sendMessage(m.from, { text: `「 ✦ 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 ✦ 」\nIP: ${data.ip}\nEstado: ${data.status}\nRiesgo: ${risk}\nPuntuación: ${data.score}/100\nLocalización: ${data.ip_country_name}${data.ip_city ? ` (${data.ip_city})` : ''}\nProveedor: ${data['Organization Name'] || 'Sin datos'}\nTipo: ${data.mode}${data.ISP_Name ? `\nISP: ${data.ISP_Name}` : ''}`, 
                edit: msgKey.key });
                
        } catch (e) {
            await sock.sendMessage(m.from, { text: `「 ✦ 𝐄𝐑𝐑𝐎𝐑 ✦ 」\nIP: ${ip}\nCódigo: ${e.response?.status || 500}\nError: ${e.response?.data?.error || 'Sin conexión'}`, 
                edit: msgKey.key });
        }
    }
}