"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Loader2, Copy, Check, Download, Square, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/features/auth/hooks/use-auth"

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

const parseInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
    return parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={idx} className="rounded bg-muted px-1 py-0.5 text-[12px]">{part.slice(1, -1)}</code>
        }
        return <span key={idx}>{part}</span>
    })
}

const RichMessage = ({ text }: { text: string }) => {
    const lines = text.split("\n").map((line) => line.trimEnd())
    return (
        <div className="space-y-1.5 whitespace-pre-wrap break-words">
            {lines.map((rawLine, idx) => {
                const line = rawLine.trim()
                if (!line) return <div key={idx} className="h-1" />
                if (line.startsWith("### ")) return <div key={idx} className="text-[13px] font-semibold">{parseInline(line.slice(4))}</div>
                if (line.startsWith("## ")) return <div key={idx} className="text-[13px] font-semibold">{parseInline(line.slice(3))}</div>
                if (line.startsWith("# ")) return <div key={idx} className="text-[13px] font-semibold">{parseInline(line.slice(2))}</div>
                if (/^[-*]\s+/.test(line)) return <div key={idx} className="flex gap-2"><span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-current/70" /><span>{parseInline(line.replace(/^[-*]\s+/, ""))}</span></div>
                if (/^\d+\.\s+/.test(line)) return <div key={idx} className="flex gap-2"><span className="shrink-0 text-muted-foreground">{line.match(/^\d+\./)?.[0]}</span><span>{parseInline(line.replace(/^\d+\.\s+/, ""))}</span></div>
                return <div key={idx}>{parseInline(rawLine)}</div>
            })}
        </div>
    )
}

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

const getSuggestionsByRole = (role?: string) => {
    switch (role?.toLowerCase()) {
        case "admin":
        case "admin_role":
            return ["Tóm tắt tình hình sản xuất hôm nay", "Có đơn hàng nào đang trễ hạn không?", "Kiểm tra tồn kho vật tư"];
        case "kho_manager":
        case "inventory_manager":
            return ["Xem vật tư nào sắp hết", "Có yêu cầu nhập kho nào mới không?", "Lập báo cáo tồn kho"];
        case "production_manager":
            return ["Tạo lệnh sản xuất mới", "Gợi ý phân công nhân sự", "Kiểm tra tiến độ đơn hàng khẩn cấp"];
        case "staff":
        case "worker":
            return ["Xem nhiệm vụ hôm nay của tôi", "Hướng dẫn thao tác máy", "Báo cáo sự cố máy móc"];
        default:
            return ["Hướng dẫn sử dụng hệ thống", "Làm thế nào để tạo tài khoản?", "Chức năng chính là gì?"];
    }
}

const getFollowUpSuggestionsByRole = (role?: string) => {
    switch (role?.toLowerCase()) {
        case "admin":
        case "admin_role":
            return [
                "Cho tôi snapshot toàn hệ thống hiện tại",
                "Tóm tắt 3 chỉ số quan trọng nhất hôm nay",
                "Có cảnh báo rủi ro nào cần xử lý ngay không?"
            ]
        case "kho_manager":
        case "inventory_manager":
            return [
                "Tổng quan FIFO kho hiện tại như thế nào?",
                "3 mã vật tư tồn thấp nhất hiện tại là gì?",
                "Có bao nhiêu phiếu nhập/xuất đang chờ xử lý?"
            ]
        case "production_manager":
            return [
                "Có bao nhiêu đơn đang sản xuất?",
                "Đơn nào có nguy cơ trễ hạn cao nhất?",
                "Tình trạng yêu cầu vật liệu hiện tại ra sao?"
            ]
        default:
            return [
                "Tóm tắt công việc cần làm tiếp theo của tôi",
                "Có cảnh báo nào liên quan công việc của tôi không?",
                "Hướng dẫn thao tác nghiệp vụ nhanh cho tôi"
            ]
    }
}

const getFollowUpSuggestions = (role: string | undefined, modelText: string, turnIndex: number) => {
    const lower = modelText.toLowerCase()
    if (lower.includes("sản xuất")) {
        return [
            "Cho tôi biết có bao nhiêu đơn đang sản xuất hôm nay",
            "Đơn nào có nguy cơ trễ hạn cao nhất?",
            "Tổng hợp tiến độ 3 đơn gần nhất"
        ]
    }
    if (lower.includes("tồn kho") || lower.includes("vật tư")) {
        return [
            "Top 3 vật tư sắp hết là gì?",
            "Tóm tắt FIFO kho hiện tại",
            "Có bao nhiêu phiếu nhập/xuất đang chờ xử lý?"
        ]
    }
    const options = getFollowUpSuggestionsByRole(role)
    const rotate = turnIndex % options.length
    return [...options.slice(rotate), ...options.slice(0, rotate)].slice(0, 3)
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<ChatMessage[]>([])
    const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null)
    const [exportType, setExportType] = useState<"json" | "txt" | "md">("md")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const streamTextRef = useRef("")
    const streamMsgIndexRef = useRef<number | null>(null)
    const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const streamAbortRef = useRef<AbortController | null>(null)
    const { user, role } = useAuth()

    useEffect(() => {
        if (isOpen && history.length === 0) {
            setHistory([
                createTextMessage("model", `Xin chào ${user?.fullName || 'bạn'}! Tôi là trợ lý AI của CraftFlow. Dưới đây là một số gợi ý cho bạn:`),
            ]);
        }
    }, [isOpen, history.length, user]);

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

    const handleSend = async (overrideInput?: string) => {
        const textToSend = typeof overrideInput === 'string' ? overrideInput : input;
        if (!textToSend.trim() || isLoading) return
        const userInput = textToSend.trim()
        const newMsg = createTextMessage("user", userInput)
        const newHistory = [...history, newMsg]
        const streamMsgIndex = newHistory.length
        streamTextRef.current = ""
        streamMsgIndexRef.current = streamMsgIndex
        clearStreamFlushTimer()

        setHistory([...newHistory, createTextMessage("model", "")])
        setInput("")
        setIsLoading(true)
        streamAbortRef.current = new AbortController()
        let textBuffer = ""

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal: streamAbortRef.current.signal,
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
                                } else {
                                    const fallback = textBuffer.trim()
                                        ? textBuffer
                                        : "Đã nhận phản hồi từ hệ thống nhưng chưa render được nội dung. Bạn gửi lại câu hỏi giúp tôi nhé."
                                    updateMessageAt(streamMsgIndex, createTextMessage("model", fallback))
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
            if (error?.name === "AbortError") {
                const stoppedText = textBuffer.trim() || "Đã ngắt phản hồi theo yêu cầu."
                updateMessageAt(streamMsgIndex, createTextMessage("model", stoppedText))
                return
            }
            console.error('[ChatWidget] Error:', error);
            toast.error(error.message || "Đã xảy ra lỗi kết nối AI.");
            clearStreamFlushTimer();
            streamMsgIndexRef.current = null;
            updateMessageAt(streamMsgIndex, createTextMessage("model", error.message || "Đã xảy ra lỗi kết nối AI."));
        } finally {
            flushStreamText()
            streamMsgIndexRef.current = null
            streamAbortRef.current = null
            setIsLoading(false)
        }
    }

    const stopCurrentResponse = () => {
        if (streamAbortRef.current) {
            streamAbortRef.current.abort()
        }
    }

    const copyMessage = async (text: string, idx: number) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedMsgIdx(idx)
            setTimeout(() => setCopiedMsgIdx((prev) => (prev === idx ? null : prev)), 1500)
        } catch {
            toast.error("Không thể copy nội dung")
        }
    }

    const visibleMessages = history.filter(isVisibleMessage)
    const exportChat = () => {
        if (visibleMessages.length === 0) {
            toast.error("Chưa có nội dung chat để xuất")
            return
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        let content = ""
        let mime = "text/plain;charset=utf-8"
        let ext = exportType

        if (exportType === "json") {
            content = JSON.stringify(visibleMessages.map((m) => ({
                role: m.role,
                text: getMessageText(m),
            })), null, 2)
            mime = "application/json;charset=utf-8"
        } else if (exportType === "txt") {
            content = visibleMessages.map((m) => `[${m.role.toUpperCase()}]\n${getMessageText(m)}\n`).join("\n")
        } else {
            content = visibleMessages.map((m) => `### ${m.role === "user" ? "User" : "Agent"}\n\n${getMessageText(m)}\n`).join("\n")
        }

        const blob = new Blob([content], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `craftflow-chat-${timestamp}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
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
                            <select
                                value={exportType}
                                onChange={(e) => setExportType(e.target.value as "json" | "txt" | "md")}
                                className="h-8 rounded-md border border-white/30 bg-white/10 px-2 text-[11px] text-primary-foreground outline-none"
                            >
                                <option value="md" className="text-black">MD</option>
                                <option value="txt" className="text-black">TXT</option>
                                <option value="json" className="text-black">JSON</option>
                            </select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary-foreground hover:bg-white/20 transition-colors" onClick={exportChat}>
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary-foreground hover:bg-white/20 transition-colors" onClick={() => setIsOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat History Area */}
                    <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 no-drag cursor-auto scrollbar-thin scrollbar-thumb-primary/20">
                        <div className="text-center text-xs text-muted-foreground/60 my-2">Hôm nay</div>
                        {visibleMessages
                            .map((msg, idx, arr) => (
                                <div key={idx} className={cn(
                                    "max-w-[85%] p-3.5 text-[13px] leading-relaxed shadow-sm",
                                    msg.role === "user"
                                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground self-end rounded-2xl rounded-tr-sm"
                                        : "bg-background/80 border border-border/50 text-foreground self-start rounded-2xl rounded-tl-sm backdrop-blur-md"
                                )}>
                                    <RichMessage text={getMessageText(msg)} />
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50"
                                            onClick={() => copyMessage(getMessageText(msg), idx)}
                                        >
                                            {copiedMsgIdx === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copiedMsgIdx === idx ? "Đã copy" : "Copy"}
                                        </button>
                                        {msg.role === "user" && (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50"
                                                onClick={() => handleSend(getMessageText(msg))}
                                                disabled={isLoading}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Gửi lại
                                            </button>
                                        )}
                                    </div>
                                    {msg.role === "model" && idx === arr.length - 1 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {getFollowUpSuggestions(role, getMessageText(msg), idx).map((suggestion, sIdx) => (
                                                <button
                                                    key={`${suggestion}-${sIdx}`}
                                                    type="button"
                                                    onClick={() => setInput(suggestion)}
                                                    className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                        {history.length === 1 && history[0].role === "model" && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {getSuggestionsByRole(role).map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setInput(suggestion)}
                                        className="text-[12px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-3 py-1.5 transition-colors text-left"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

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
                            {isLoading ? (
                                <Button
                                    size="icon"
                                    type="button"
                                    className="absolute right-1 h-10 w-10 rounded-full shrink-0 bg-amber-500 text-white hover:bg-amber-600"
                                    onClick={stopCurrentResponse}
                                >
                                    <Square className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    size="icon"
                                    className={cn(
                                        "absolute right-1 h-10 w-10 rounded-full shrink-0 transition-all duration-300",
                                        input.trim() ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(219,39,119,0.5)] scale-100" : "bg-muted text-muted-foreground scale-90"
                                    )}
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Trigger Button */}
            <div className="relative cursor-grab active:cursor-grabbing group chat-trigger-area">
                {/* Hiệu ứng nhịp đập (Ping) đằng sau nút khi đóng */}
                {!isOpen && (
                    <div className="absolute inset-0 rounded-full bg-pink-500/60 animate-ping opacity-75 duration-1000"></div>
                )}
                <Button
                    size="icon"
                    className={cn(
                        "relative h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-[0_10px_30px_rgba(236,72,153,0.4)] transition-all duration-300 group-hover:scale-110 pointer-events-none no-drag border-[1.5px] border-white/40 overflow-hidden",
                        isOpen
                            ? "bg-card border-border text-foreground shadow-lg hover:bg-card/90"
                            : "bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-white hover:shadow-[0_10px_40px_rgba(236,72,153,0.6)]"
                    )}
                >
                    {!isOpen && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    )}
                    {isOpen ? <X className="relative z-10 h-6 w-6" /> : <Bot className="relative z-10 h-7 w-7 drop-shadow-md animate-bounce" />}
                </Button>

                {/* Lớp phủ ẩn để bắt sự kiện click chuẩn xác cho Drag Handle */}
                <div className="absolute inset-0 z-10" />
            </div>
        </div>
    )
}
