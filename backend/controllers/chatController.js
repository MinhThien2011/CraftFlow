import { processChatMessageStream } from '../services/chatService.js';

export const handleChat = async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    try {
        const { history } = req.body;
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
        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true, history })}\n\n`);
        res.end();
    } catch (error) {
        console.error('[ChatController] Error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Xin lỗi, tôi đang gặp sự cố khi xử lý tin nhắn.' })}\n\n`);
        res.end();
    }
};