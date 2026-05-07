import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 0;

// --- CẤU HÌNH CHIẾN THUẬT ---
const CONFIG = {
    url: 'http://localhost:4000/api/health',
    totalRequests: 10000,
    concurrency: 500,
    /**
     * CÁC CHẾ ĐỘ (MODE):
     * 'flood'    : Bắn nhanh nhất có thể, dùng lại connection (Max throughput)
     * 'botnet'   : Mỗi request 1 IP giả, buộc tạo TCP handshake mới (Bypass IP Limit)
     * 'slowloris': Mở kết nối và giữ cực lâu, gửi data nhỏ giọt (Exhaust Sockets)
     * 'stealth'  : Bắn chậm, có độ trễ ngẫu nhiên (Bypass Pattern Detection)
     * 'post_stress': Bắn POST request, test stress limit
     */
    mode: 'post_stress',
    bypassCache: true,
};

const stats = {
    success: 0, blocked: 0, error: 0,
    startTime: Date.now(),
    latencies: []
};

let launched = 0;
let completed = 0;

// --- HACKER TOOLBOX ---
const getRandIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');
const getRandUA = () => {
    const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
};

// --- CORE ENGINE ---
const fireShot = () => {
    if (launched >= CONFIG.totalRequests) return;
    launched++;

    const start = Date.now();
    const target = new URL(CONFIG.url);

    // Bypass Cache bằng cách biến đổi URL
    if (CONFIG.bypassCache) {
        target.searchParams.set('_v', Math.random().toString(36).substring(7));
        target.searchParams.set('t', Date.now());
    }

    const ip = getRandIP();

    // Cấu hình options dựa trên Mode
    const isBotnet = CONFIG.mode === 'botnet';
    const isSlow = CONFIG.mode === 'slowloris';

    const options = {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: 'GET',
        // Botnet không dùng agent để ép tạo TCP mới, Flood dùng agent để bắn nhanh hơn
        agent: isBotnet ? false : undefined,
        headers: {
            'X-Forwarded-For': ip,
            'X-Real-IP': ip,
            'User-Agent': getRandUA(),
            'Connection': isSlow ? 'keep-alive' : (isBotnet ? 'close' : 'keep-alive'),
            'Cache-Control': 'no-cache',
        },
        timeout: isSlow ? 30000 : 5000 // Slowloris cần timeout dài để treo kết nối
    };

    const client = target.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
        // Nếu là Slowloris, ta không đọc hết data ngay mà giữ nó
        if (isSlow) {
            res.on('data', () => { /* Đọc từ từ */ });
        } else {
            res.resume();
        }

        res.on('end', () => {
            if (res.statusCode === 200) stats.success++;
            else if (res.statusCode === 429) stats.blocked++;
            stats.latencies.push(Date.now() - start);
            finishRequest();
        });
    });

    req.on('error', () => { stats.error++; finishRequest(); });
    req.on('timeout', () => { req.destroy(); stats.error++; finishRequest(); });

    req.end();
};

const finishRequest = () => {
    completed++;

    let delay = 0;
    if (CONFIG.mode === 'stealth') delay = Math.random() * 500; // Nghỉ ngơi cho đỡ bị lộ
    else if (CONFIG.mode === 'slowloris') delay = 100; // Giãn cách để không làm sập bảng connection quá nhanh

    if (launched < CONFIG.totalRequests) {
        setTimeout(fireShot, delay);
    }
};

// --- GIAO DIỆN BÁO CÁO ---
const printReport = () => {
    const duration = (Date.now() - stats.startTime) / 1000;
    const sortedLat = stats.latencies.sort((a, b) => a - b);
    const p95 = sortedLat[Math.floor(sortedLat.length * 0.95)] || 0;

    console.log('\n\x1b[35m%s\x1b[0m', '========================================');
    console.log(`   🚀 CHIẾN DỊCH: ${CONFIG.mode.toUpperCase()} COMPLETED `);
    console.log('\x1b[35m%s\x1b[0m', '========================================');
    console.log(`Target      : ${CONFIG.url}`);
    console.log(`Throughput  : ${(completed / duration).toFixed(1)} req/s`);
    console.log(`P95 Latency : ${p95}ms`);
    console.log('----------------------------------------');
    console.log(`✅ 200 OK   : \x1b[32m${stats.success}\x1b[0m`);
    console.log(`🚫 429 Block: \x1b[33m${stats.blocked}\x1b[0m`);
    console.log(`❌ Errors   : \x1b[31m${stats.error}\x1b[0m`);
    console.log('\x1b[35m%s\x1b[0m', '========================================\n');
};

// --- CHẠY ---
console.log(`\x1b[36m[*] Khởi động Pentest mode: ${CONFIG.mode.toUpperCase()}\x1b[0m`);
stats.startTime = Date.now();

for (let i = 0; i < CONFIG.concurrency; i++) {
    fireShot();
}

const progress = setInterval(() => {
    const pct = ((completed / CONFIG.totalRequests) * 100).toFixed(1);
    process.stdout.write(`\r[Progress] ${pct}% | Done: ${completed} | Active: ${launched - completed} | Success: ${stats.success}`);

    if (completed >= CONFIG.totalRequests) {
        clearInterval(progress);
        printReport();
    }
}, 200);