import axiosInstance from '@/lib/axios';

export const chatApi = {
    sendMessage: async (history: any[]) => {
        const response = await axiosInstance.post('/chat', {
            history
        });
        return response;
    }
};