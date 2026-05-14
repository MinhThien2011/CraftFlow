"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => { scrollToBottom() }, [history])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return
        const newMsg = { role: "user", parts: [{ text: input }] }
        const newHistory = [...history, newMsg]

        setHistory(newHistory)
        setInput("")
        setIsLoading(true)

        // Tạo sẵn một box message để gõ từ từ vào
        const currentHistory = [...newHistory]
        const streamMsgIndex = currentHistory.length
        setHistory([...currentHistory, { role: "model", parts: [{ text: "" }] }])

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ history: newHistory })
            });
            console.log(response);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.message || errorData.error || "Lỗi kết nối server.");
                return;
            }

            if (!response.body) {
                toast.error("Stream not readable");
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let textBuffer = "";
            let streamBuffer = "";

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    streamBuffer += chunk;

                    const lines = streamBuffer.split('\n\n');
                    streamBuffer = lines.pop() || "";

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                        try {
                            const jsonStr = trimmedLine.slice(6).trim();
                            const data = JSON.parse(jsonStr);
                            console.log("[Chat] Received data:", data);

                            if (data.error) {
                                toast.error(data.error);
                                setIsLoading(false);
                                return;
                            }

                            if (data.text) {
                                setIsLoading(false);
                                textBuffer += data.text;

                                setHistory(prev => {
                                    const next = [...prev];
                                    const lastIdx = next.length - 1;
                                    // Tìm hoặc tạo tin nhắn model để update
                                    if (lastIdx >= 0 && next[lastIdx].role === "model") {
                                        next[lastIdx] = {
                                            role: "model",
                                            parts: [{ text: textBuffer }]
                                        };
                                    } else {
                                        next.push({
                                            role: "model",
                                            parts: [{ text: textBuffer }]
                                        });
                                    }
                                    return next;
                                });
                            }

                            if (data.done) {
                                setIsLoading(false);
                                if (data.history) {
                                    console.log("[Chat] Final history from server:", data.history);
                                    // Cập nhật history cuối cùng để đảm bảo đồng bộ với BE
                                    setHistory(data.history);
                                }
                            }
                        } catch (e: any) {
                            console.error("[Chat] Stream parse error:", e, trimmedLine);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('[ChatWidget] Error:', error);
            toast.error(error.message || "Đã xảy ra lỗi kết nối AI.");
            setHistory(prev => {
                const next = [...prev];
                next[streamMsgIndex] = { role: "model", parts: [{ text: error.message || "Đã xảy ra lỗi kết nối AI." }] };
                return next;
            });
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[350px] h-[500px] bg-background border border-border shadow-xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <span className="font-semibold">CraftFlow Chatbot</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                        {history
                            .filter(h => h.parts && Array.isArray(h.parts) && !h.parts.some((p: any) => p.functionCall || p.functionResponse))
                            .map((msg, idx) => (
                                <div key={idx} className={cn("max-w-[85%] p-3 rounded-2xl text-sm", msg.role === "user" ? "bg-primary text-primary-foreground self-end rounded-br-sm" : "bg-muted text-foreground self-start rounded-bl-sm")}>
                                    {msg.parts.map((p: any) => p.text).filter(Boolean).join(' ')}
                                </div>
                            ))}
                        {isLoading && (
                            <div className="bg-muted text-foreground self-start p-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Suy nghĩ...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-border flex items-center gap-2 bg-card">
                        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Hỏi tôi bất kỳ điều gì..." className="flex-1 border-0 focus-visible:ring-0 bg-muted/50 rounded-full" disabled={isLoading} />
                        <Button size="icon" className="h-10 w-10 rounded-full shrink-0" onClick={handleSend} disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
            <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
            </Button>
        </div>
    )
}