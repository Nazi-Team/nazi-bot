import axios from 'axios';

const generateProgressBar = (percentage) => {
    const filled = '█'.repeat((percentage / 10) * 2);
    const empty = '░'.repeat(20 - filled.length);
    return `⟨${filled}${empty}⟩`;
};

const getBanStatus = (score) => {
    if (score >= 91) return 'Baneo permanente 🔴';
    if (score >= 51) return 'Riesgo elevado 🟠';
    if (score >= 11) return 'Riesgo moderado 🟡';
    if (score >= 1) return 'Bajo riesgo 🟢';
    return 'Sin riesgo ✅';
};

export default {
    name: "Verificador de IP Fraudulenta",
    description: "Analiza direcciones IP para detectar actividad fraudulenta",
    params: ["ip"],
    comand: ["prban"],
    exec: async (m, { sock }) => {
        const ip = m.args[0];
        let sentMessage;

        try {
            for (let i = 0; i <= 10; i++) {
                const progress = `
「 ✦ VERIFICADOR ANTIFRAUDE ✦ 」
${generateProgressBar(i * 10)}
Progreso: ${i * 10}% 
Estado: Cargando información...`.trim()

                if (!sentMessage) {
                    sentMessage = await sock.sendMessage(m.from, { text: progress })
                } else {
                    await sock.sendMessage(m.from, { text: progress, edit: sentMessage.key })
                }
                await new Promise(resolve => setTimeout(resolve, 400))
            }

            const { data } = await axios.get(`https://api11.scamalytics.com/alessandrovillogas/?key=df8d714f6807d3c5512914caed1302f17fb41728efa01d695a9db72734854f34&ip=${ip}`)

            // Formatear resultados
            const result = `
「 ✦ RESULTADOS DE VERIFICACIÓN ✦ 」
• Estado: ${data.status || 'No disponible'}
• Dirección IP: ${data.ip}
• Puntuación de riesgo: ${data.score}/100
• Ubicación: ${data.ip_country_name}${data.ip_city ? ` (${data.ip_city})` : ''}
• Proveedor: ${data['Organization Name'] || 'No identificado'}
• Tipo: ${data.mode}
• Código ISP: ${data['ISP Name'] || 'No disponible'}

• Nivel de riesgo: ${getBanStatus(data.score)}`.trim()

            await sock.sendMessage(m.from, { text: result, edit: sentMessage.key })
            
        } catch (error) {
            console.error(`Error en verificación IP: ${error}`)
            const errorMessage = `
「 ✦ ERROR DE VERIFICACIÓN ✦ 」
No se pudo obtener información para la IP: ${ip}
Motivo: ${error.response?.data?.error || 'Error de conexión'}`.trim()
            
            await sock.sendMessage(m.from, { text: errorMessage, edit: sentMessage.key })
        }
    }
}