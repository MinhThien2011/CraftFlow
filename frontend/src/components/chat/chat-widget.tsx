"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ChatPart = {
    text?: string
    functionCall?: unknown
    functionResponse?: unknown
}

type ChatMessage = {
    role: "user" | "model"
    parts: ChatPart[]
}

const STREAM_FLUSH_INTERVAL_MS = 40

const createTextMessage = (role: ChatMessage["role"], text: string): ChatMessage => ({
    role,
    parts: [{ text }]
})

const getMessageText = (message: ChatMessage) =>
    message.parts.map((part) => part.text).filter(Boolean).join(" ")

const isChatMessage = (message: unknown): message is ChatMessage => {
    if (!message || typeof message !== "object") return false
    const candidate = message as ChatMessage
    return (candidate.role === "user" || candidate.role === "model") && Array.isArray(candidate.parts)
}

const isVisibleMessage = (message: ChatMessage) =>
    Array.isArray(message.parts) &&
    !message.parts.some((part) => part.functionCall || part.functionResponse) &&
    Boolean(getMessageText(message).trim())

const hasLatestAssistantResponse = (messages: unknown): messages is ChatMessage[] => {
    if (!Array.isArray(messages) || !messages.every(isChatMessage)) return false

    const lastUserIndex = messages.findLastIndex((message) => message.role === "user")
    if (lastUserIndex < 0) return false

    return messages
        .slice(lastUserIndex + 1)
        .some((message) => message.role === "model" && isVisibleMessage(message))
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<ChatMessage[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const streamTextRef = useRef("")
    const streamMsgIndexRef = useRef<number | null>(null)
    const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Drag & Drop State
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const dragStartOffset = useRef({ x: 0, y: 0 })
    const pointerDownCoords = useRef({ x: 0, y: 0 })
    const isTriggerClick = useRef(false)
    const activeStreamMessage = streamMsgIndexRef.current === null ? null : history[streamMsgIndexRef.current]
    const isWaitingForResponse = isLoading && !getMessageText(activeStreamMessage ?? createTextMessage("model", "")).trim()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => { scrollToBottom() }, [history])

    const updateMessageAt = (messageIndex: number, message: ChatMessage) => {
        setHistory(prev => {
            const next = [...prev]
            if (next[messageIndex]?.role === message.role) {
                next[messageIndex] = message
            } else {
                next.push(message)
            }
            return next
        })
    }

    const clearStreamFlushTimer = () => {
        if (!streamFlushTimerRef.current) return
        clearTimeout(streamFlushTimerRef.current)
        streamFlushTimerRef.current = null
    }

    const flushStreamText = () => {
        clearStreamFlushTimer()
        const messageIndex = streamMsgIndexRef.current
        if (messageIndex === null || !streamTextRef.current) return
        updateMessageAt(messageIndex, createTextMessage("model", streamTextRef.current))
    }

    const scheduleStreamFlush = () => {
        if (streamFlushTimerRef.current) return
        streamFlushTimerRef.current = setTimeout(flushStreamText, STREAM_FLUSH_INTERVAL_MS)
    }

    useEffect(() => clearStreamFlushTimer, [])

    // Drag handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('.no-drag')) return;
        
        isTriggerClick.current = !!target.closest('.chat-trigger-area');
        
        setIsDragging(true)
        dragStartOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        }
        pointerDownCoords.current = {
            x: e.clientX,
            y: e.clientY
        }
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return
        const newX = e.clientX - dragStartOffset.current.x
        const newY = e.clientY - dragStartOffset.current.y
        setPosition({ x: newX, y: newY })
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
        
        // Kiểm tra xem đây là click hay drag
        const dx = Math.abs(e.clientX - pointerDownCoords.current.x)
        const dy = Math.abs(e.clientY - pointerDownCoords.current.y)
        
        if (dx < 5 && dy < 5 && isTriggerClick.current) {
            setIsOpen(prev => !prev);
        }
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return
        const userInput = input.trim()
        const newMsg = createTextMessage("user", userInput)
        const newHistory = [...history, newMsg]
        const streamMsgIndex = newHistory.length
        streamTextRef.current = ""
        streamMsgIndexRef.current = streamMsgIndex
        clearStreamFlushTimer()

        setHistory([...newHistory, createTextMessage("model", "")])
        setInput("")
        setIsLoading(true)

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ history: newHistory })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.message || errorData.error || "Lỗi kết nối server.";
                toast.error(message);
                streamMsgIndexRef.current = null;
                updateMessageAt(streamMsgIndex, createTextMessage("model", message));
                return;
            }

            if (!response.body) {
                const message = "Stream not readable";
                toast.error(message);
                streamMsgIndexRef.current = null;
                updateMessageAt(streamMsgIndex, createTextMessage("model", message));
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

                    for (const event of lines) {
                        const payload = event
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.startsWith('data:'))
                            .map(line => line.slice(5).trim())
                            .join('\n');

                        if (!payload) continue;

                        try {
                            const data = JSON.parse(payload);

                            if (data.error) {
                                toast.error(data.error);
                                clearStreamFlushTimer();
                                streamMsgIndexRef.current = null;
                                updateMessageAt(streamMsgIndex, createTextMessage("model", data.error));
                                return;
                            }

                            if (data.text) {
                                textBuffer += data.text;
                                streamTextRef.current = textBuffer;
                                scheduleStreamFlush();
                            }

                            if (data.done) {
                                flushStreamText();
                                if (hasLatestAssistantResponse(data.history)) {
                                    setHistory(data.history);
                                    streamMsgIndexRef.current = null;
                                }
                            }
                        } catch (e: any) {
                            console.error("[Chat] Stream parse error:", e, payload);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('[ChatWidget] Error:', error);
            toast.error(error.message || "Đã xảy ra lỗi kết nối AI.");
            clearStreamFlushTimer();
            streamMsgIndexRef.current = null;
            updateMessageAt(streamMsgIndex, createTextMessage("model", error.message || "Đã xảy ra lỗi kết nối AI."));
        } finally {
            flushStreamText()
            streamMsgIndexRef.current = null
            setIsLoading(false)
        }
    }

    return (
        <div 
            className="fixed bottom-6 right-6 z-[999] flex flex-col items-end touch-none select-none"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {isOpen && (
                <div className="mb-4 w-[360px] h-[550px] sm:w-[400px] sm:h-[600px] bg-card/70 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 origin-bottom-right cursor-default">
                    {/* Header - Vùng được phép kéo thả mạnh nhất */}
                    <div className="bg-gradient-to-r from-primary/90 to-primary/60 backdrop-blur-md text-primary-foreground p-4 flex justify-between items-center border-b border-white/10 cursor-grab active:cursor-grabbing chat-trigger-area">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shadow-inner">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="font-bold block text-sm">CraftFlow AI</span>
                                <span className="text-[10px] uppercase tracking-wider text-primary-foreground/80 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 no-drag">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary-foreground hover:bg-white/20 transition-colors" onClick={() => setIsOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat History Area */}
                    <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 no-drag cursor-auto scrollbar-thin scrollbar-thumb-primary/20">
                        <div className="text-center text-xs text-muted-foreground/60 my-2">Hôm nay</div>
                        {history
                            .filter(isVisibleMessage)
                            .map((msg, idx) => (
                                <div key={idx} className={cn(
                                    "max-w-[85%] p-3.5 text-[13px] leading-relaxed shadow-sm", 
                                    msg.role === "user" 
                                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground self-end rounded-2xl rounded-tr-sm" 
                                        : "bg-background/80 border border-border/50 text-foreground self-start rounded-2xl rounded-tl-sm backdrop-blur-md"
                                )}>
                                    {getMessageText(msg)}
                                </div>
                            ))}
                        {isWaitingForResponse && (
                            <div className="bg-background/80 border border-border/50 text-foreground self-start p-3.5 rounded-2xl rounded-tl-sm backdrop-blur-md flex items-center gap-3 shadow-sm">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" /> 
                                <span className="text-[13px] text-muted-foreground">Đang suy nghĩ...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10 bg-card/50 backdrop-blur-md no-drag cursor-auto">
                        <div className="relative flex items-center">
                            <Input 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                                placeholder="Hỏi tôi bất kỳ điều gì..." 
                                className="flex-1 h-12 pr-12 border border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 bg-background/50 rounded-full text-[13px] shadow-inner transition-all" 
                                disabled={isLoading} 
                            />
                            <Button 
                                size="icon" 
                                className={cn(
                                    "absolute right-1 h-10 w-10 rounded-full shrink-0 transition-all duration-300",
                                    input.trim() ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(219,39,119,0.5)] scale-100" : "bg-muted text-muted-foreground scale-90"
                                )}
                                onClick={handleSend} 
                                disabled={isLoading || !input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Floating Trigger Button */}
            <div className="relative cursor-grab active:cursor-grabbing group chat-trigger-area">
                {/* Hiệu ứng nhịp đập (Ping) đằng sau nút khi đóng */}
                {!isOpen && (
                    <div className="absolute inset-0 rounded-full bg-[#D4A574]/60 animate-ping opacity-75 duration-1000"></div>
                )}
                <Button 
                    size="icon" 
                    className={cn(
                        "relative h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-[0_10px_30px_rgba(139,115,85,0.4)] transition-all duration-300 group-hover:scale-110 pointer-events-none no-drag border-[1.5px] border-white/40",
                        isOpen 
                            ? "bg-card border-border text-foreground shadow-lg hover:bg-card/90" 
                            : "bg-gradient-to-tr from-[#8B7355] via-[#A88B64] to-[#D4A574] text-white"
                    )}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7 drop-shadow-md" />}
                </Button>
                
                {/* Lớp phủ ẩn để bắt sự kiện click chuẩn xác cho Drag Handle */}
                <div className="absolute inset-0 z-10" />
            </div>
        </div>
    )
}
