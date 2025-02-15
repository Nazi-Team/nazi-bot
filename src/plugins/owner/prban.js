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

const STATUS_MESSAGES = {
    0: "✅ Perfecto - Sin anomalías",
    1: "🟢 Bajo riesgo",
    50: "🟡 Riesgo moderado",
    90: "🔴 Alto riesgo",
    100: "🚫 Baneo permanente"
};

export default {
    name: "Analizador de IP",
    description: "Verificación avanzada de direcciones IP",
    params: ["ip"],
    command: ["prban"],
    exec: async (m, { sock }) => {
        const ip = m.args[0];
        let messageKey;

        // Mostrar animación de carga
        for (const state of LOADING_STATES) {
            const loadingMessage = `
「 ✦ 𝐂𝐇𝐄𝐂𝐊𝐄𝐑 𝐃𝐄 𝐁𝐀𝐍 ✦ 」
⟨${state.bar}⟩
… Procesando IP
${state.icon} ${state.percent}`.trim();

            if (!messageKey) {
                messageKey = await sock.sendMessage(m.from, { text: loadingMessage });
            } else {
                await sock.sendMessage(m.from, { text: loadingMessage, edit: messageKey.key });
            }
            await new Promise(resolve => setTimeout(resolve, 350));
        }

        try {
            const { data } = await axios.get(`https://api11.scamalytics.com/alessandrovillogas/?key=df8d714f6807d3c5512914caed1302f17fb41728efa01d695a9db72734854f34&ip=${ip}`);
            
            const riskStatus = Object.entries(STATUS_MESSAGES).reduce((acc, [threshold, message]) => {
                return data.score >= parseInt(threshold) ? message : acc;
            }, STATUS_MESSAGES[0]);

            const result = `
「 ✦ 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 ✦ 」
IP: ${data.ip}
Estado: ${data.status}
Riesgo: ${riskStatus}
Puntuación: ${data.score}/100
Localización: ${data.ip_country_name}${data.ip_city ? ` (${data.ip_city})` : ''}
Proveedor: ${data['Organization Name'] || 'No identificado'}
Tipo: ${data.mode}
${data.ISP_Name ? `• ISP: ${data.ISP_Name}` : ''}`.trim();

            await sock.sendMessage(m.from, { text: result, edit: messageKey.key });

        } catch (error) {
            const errorText = `
「 ✦ 𝐄𝐑𝐑𝐎𝐑 ✦ 」
No se pudo verificar la IP: ${ip}
Código: ${error.response?.status || 'DESCONOCIDO'}
Motivo: ${error.response?.data?.error || 'Error de conexión'}`.trim();
            
            await sock.sendMessage(m.from, { text: errorText, edit: messageKey.key });
        }
    }
};