import { processChatMessageStream } from '../services/chatService.js';

const normalizeChatHistory = (history) => {
    if (!Array.isArray(history)) return [];

    return history
        .map(message => {
            const role = message?.role;
            if (role !== 'user' && role !== 'model') return null;

            const text = Array.isArray(message?.parts)
                ? message.parts
                    .map(part => part?.text)
                    .filter(textPart => typeof textPart === 'string' && textPart.trim())
                    .join(' ')
                    .trim()
                : '';

            return text ? { role, parts: [{ text }] } : null;
        })
        .filter(Boolean);
};

const getVisibleHistory = (history) => normalizeChatHistory(history);

export const handleChat = async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    try {
        const history = normalizeChatHistory(req.body?.history);
        const user = req.user; 

        if (!user) {
            res.write(`data: ${JSON.stringify({ error: 'Bạn cần đăng nhập để sử dụng Chat.' })}\n\n`);
            return res.end();
        }

        const stream = processChatMessageStream(history, user);
        if (!stream) {
            res.write(`data: ${JSON.stringify({ error: 'Lỗi khi xử lý tin nhắn.' })}\n\n`);
            return res.end();
        }
        let assistantText = '';
        for await (const chunk of stream) {
            assistantText += chunk;
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        const lastMessage = history[history.length - 1];
        const lastMessageText = lastMessage?.parts
            ?.map(part => part?.text)
            .filter(Boolean)
            .join('');

        if (assistantText.trim() && (lastMessage?.role !== 'model' || !lastMessageText.trim())) {
            history.push({ role: 'model', parts: [{ text: assistantText }] });
        }

        res.write(`data: ${JSON.stringify({ done: true, history: getVisibleHistory(history) })}\n\n`);
        res.end();
    } catch (error) {
        console.error('[ChatController] Error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Xin lỗi, tôi đang gặp sự cố khi xử lý tin nhắn.' })}\n\n`);
        res.end();
    }
};
