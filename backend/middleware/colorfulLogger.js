// import chalk from 'chalk';
// import gradient from 'gradient-string';
// import figlet from 'figlet';

// const COLORS = {
//     purple: '#8a2be2',
//     pink: '#ff0080',
//     cyan: '#00e5ff',
//     yellow: '#ffff00',
//     blue: '#5fafff',
//     gray: '#666666',
//     green: '#00ff7f',
//     red: '#ff4b2b'
// };

// const superLogger = {
//     projectName: 'SERVICE',

//     init(name , title = 'A Supreme System') {
//         this.projectName = (name || 'SERVICE').toUpperCase();
//         const banner = figlet.textSync(this.projectName, { font: 'ANSI Shadow' });
//         const titleBanner = figlet.textSync(title, { font: 'slant' });
//         console.clear();
//         console.log(gradient(['#FF3CAC', '#784BA0', '#2B86C5']).multiline(banner));
//         console.log(gradient(['#FF3CAC', '#784BA0', '#2B86C5']).multiline(titleBanner));

//         console.log(chalk.hex(COLORS.gray)('═'.repeat(70)));
//         console.log(
//             `${chalk.hex(COLORS.cyan)(' 🚀 PROJECT:')} ${chalk.bold.white(this.projectName)} ` +
//             `${chalk.hex(COLORS.purple)(' | ⚡ VERSION:')} ${chalk.white('3.1.0')}`
//         );
//         console.log(
//             `${chalk.hex(COLORS.cyan)(' 🕒 STARTED:')} ${chalk.white(new Date().toLocaleString())} ` +
//             `${chalk.hex(COLORS.green)(' | ✅ STATUS:')} ${chalk.bgGreen.black.bold(' ONLINE ')}`
//         );
//         console.log(chalk.hex(COLORS.gray)('═'.repeat(70)) + '\n');
//         return this;
//     },

//     getTime: () => chalk.hex(COLORS.gray)(`[${new Date().toLocaleTimeString()}]`),

//     info(msg) {
//         console.log(`${this.getTime()} ${chalk.bgBlue.black.bold(' INFO ')} 🔵 ${chalk.hex(COLORS.blue)(msg)}`);
//         return this;
//     },

//     success(msg) {
//         console.log(`${this.getTime()} ${chalk.bgGreen.black.bold(' DONE ')} 🟢 ${chalk.greenBright(msg)}`);
//         return this;
//     },

//     warn(msg) {
//         console.log(`${this.getTime()} ${chalk.bgYellow.black.bold(' WARN ')} 🟠 ${chalk.hex(COLORS.yellow)(msg)}`);
//         return this;
//     },


//     error(msg, err = null, isTable = false) {
//         console.log(`${this.getTime()} ${chalk.bgRed.white.bold(' FAIL ')} 🔴 ${chalk.redBright(msg)}`);

//         if (err) {
//             if (isTable) {
//                 const errorDetails = {
//                     Type: err.name || 'Error',
//                     Message: err.message || 'No message',
//                     Code: err.code || 'N/A',
//                     Path: err.path || 'N/A',
//                     Time: new Date().toLocaleTimeString()
//                 };
//                 console.log(chalk.hex(COLORS.red)('   ┗━━ Error Structure:'));
//                 console.table([errorDetails]);
//             } else {
//                 console.log(chalk.hex(COLORS.red)(`   ┗━━━> ${err.message || err}`));
//                 if (err.stack && !err.message) console.log(chalk.hex(COLORS.gray)(err.stack));
//             }
//         }
//         return this;
//     },

//     // 5. Thanh Progress (Step)
//     step(current, total, msg) {
//         const size = 20;
//         const progress = Math.round((current / total) * size);
//         const emptyProgress = size - progress;
//         const progressBar = chalk.hex(COLORS.pink)('━'.repeat(progress)) + chalk.hex(COLORS.gray)('━'.repeat(emptyProgress));

//         console.log(
//             `${this.getTime()} ${chalk.hex(COLORS.cyan)('⚙ STEP')} ` +
//             `${chalk.white(`[${progressBar}]`)} ` +
//             `${chalk.hex(COLORS.yellow)(Math.round((current / total) * 100) + '%')} ${chalk.white(msg)}`
//         );
//         return this;
//     },

//     divider(label = '') {
//         const line = '═'.repeat(15);
//         console.log(chalk.hex(COLORS.gray)(`\n${line} ${label.toUpperCase()} ${line}`));
//         return this;
//     },

//     hook(customeLog = true, customError = true, customWarn = true) {
//         const originalLog = console.log;

//         if (customeLog) {
//             console.log = (...args) => {
//                 if (typeof args[0] === 'string' && !args[0].includes('[') && !args[0].includes('═')) {
//                     this.info(args.join(' '));
//                 } else {
//                     originalLog(...args);
//                 }
//             };
//         }

//         if (customError) {
//             console.error = (msg, err = null, isTable = false) => {
//                 this.error(msg, err, isTable);
//             };
//         }

//         if (customWarn) {
//             console.warn = (msg) => {
//                 this.warn(msg);
//             };
//         }

//         return this;
//     },

//     handler: (req, res, next) => {
//         const start = Date.now();
//         res.on('finish', () => {
//             const duration = Date.now() - start;
//             const status = res.statusCode;
//             const statusColor = status >= 500 ? chalk.red : status >= 400 ? chalk.yellow : chalk.green;
//             const logLine = [
//                 superLogger.getTime(),
//                 chalk.magenta.bold(req.method.padEnd(6)),
//                 chalk.white(req.originalUrl.split('?')[0]).padEnd(25),
//                 statusColor.bold(status),
//                 chalk.hex(COLORS.gray)('•'),
//                 chalk.hex(COLORS.cyan)(duration + 'ms')
//             ].join(' ');

//             process.stdout.write(logLine + '\n');
//         });
//         next();
//     }
// };

// export default superLogger;
import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';

const COLORS = {
    purple: '#8a2be2',
    pink: '#ff0080',
    cyan: '#00e5ff',
    yellow: '#ffff00',
    blue: '#5fafff',
    gray: '#666666',
    green: '#00ff7f',
    red: '#ff4b2b'
};

const superLogger = {
    projectName: 'SERVICE',
    alignment: 'center',

    alignText(text, mode = this.alignment) {
        const terminalWidth = process.stdout.columns || 80;
        return text.split('\n').map(line => {
            const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
            const lineLen = cleanLine.length;

            if (mode === 'center') {
                const padding = Math.max(0, Math.floor((terminalWidth - lineLen) / 2));
                return ' '.repeat(padding) + line;
            } else if (mode === 'right') {
                const padding = Math.max(0, terminalWidth - lineLen);
                return ' '.repeat(padding) + line;
            }
            return line;
        }).join('\n');
    },

    /**
     * @param {string} name - Tên project (Banner to)
     * @param {string} title - Slogan/Title (Chữ nhỏ bên dưới)
     * @param {string} align - 'left' | 'center' | 'right'
     */
    init(name, title = 'A Supreme System', align = 'center') {
        this.projectName = (name || 'SERVICE').toUpperCase();
        this.alignment = align.toLowerCase();
        
        const banner = figlet.textSync(this.projectName, { font: 'ANSI Shadow' });
        const titleBanner = figlet.textSync(title, { font: 'slant' });

        console.clear();

        console.log(gradient(['#FF3CAC', '#784BA0', '#2B86C5']).multiline(this.alignText(banner)));
        console.log(gradient(['#00e5ff', '#784BA0']).multiline(this.alignText(titleBanner)));

        const terminalWidth = process.stdout.columns || 80;
        const dividerLine = '═'.repeat(Math.min(70, terminalWidth));
        
        const info1 = `${chalk.hex(COLORS.cyan)('🚀 PROJECT:')} ${chalk.bold.white(this.projectName)} ${chalk.hex(COLORS.purple)(' | ⚡ VERSION:')} ${chalk.white('3.1.0')}`;
        const info2 = `${chalk.hex(COLORS.cyan)('🕒 STARTED:')} ${chalk.white(new Date().toLocaleString())} ${chalk.hex(COLORS.green)(' | ✅ STATUS:')} ${chalk.bgGreen.black.bold(' ONLINE ')}`;

        console.log(this.alignText(chalk.hex(COLORS.gray)(dividerLine)));
        console.log(this.alignText(info1));
        console.log(this.alignText(info2));
        console.log(this.alignText(chalk.hex(COLORS.gray)(dividerLine)) + '\n');

        return this; 
    },

    getTime: () => chalk.hex(COLORS.gray)(`[${new Date().toLocaleTimeString()}]`),

    info(msg) {
        console.log(`${this.getTime()} ${chalk.bgBlue.black.bold(' INFO ')} 🔵 ${chalk.hex(COLORS.blue)(msg)}`);
        return this;
    },

    success(msg) {
        console.log(`${this.getTime()} ${chalk.bgGreen.black.bold(' DONE ')} 🟢 ${chalk.greenBright(msg)}`);
        return this;
    },

    warn(msg) {
        console.log(`${this.getTime()} ${chalk.bgYellow.black.bold(' WARN ')} 🟠 ${chalk.hex(COLORS.yellow)(msg)}`);
        return this;
    },

    error(msg, err = null, isTable = false) {
        console.log(`${this.getTime()} ${chalk.bgRed.white.bold(' FAIL ')} 🔴 ${chalk.redBright(msg)}`);
        if (err) {
            if (isTable) {
                console.table(err);
            } else {
                console.log(chalk.hex(COLORS.red)(`   ┗━━━> ${err.message || err}`));
            }
        }
        return this;
    },

    step(current, total, msg) {
        const size = 20;
        const progress = Math.round((current / total) * size);
        const progressBar = chalk.hex(COLORS.pink)('━'.repeat(progress)) + chalk.hex(COLORS.gray)('━'.repeat(Math.max(0, size - progress)));

        console.log(
            `${this.getTime()} ${chalk.hex(COLORS.cyan)('⚙ STEP')} ` +
            `${chalk.white(`[${progressBar}]`)} ` +
            `${chalk.hex(COLORS.yellow)(Math.round((current / total) * 100) + '%')} ${chalk.white(msg)}`
        );
        return this;
    },

    divider(label = '') {
        const line = '═'.repeat(15);
        console.log(chalk.hex(COLORS.gray)(`\n${line} ${label.toUpperCase()} ${line}`));
        return this;
    },

    hook(customeLog = true, customError = true, customWarn = true) {
        const originalLog = console.log;
        if (customeLog) {
            console.log = (...args) => {
                if (typeof args[0] === 'string' && !args[0].includes('[') && !args[0].includes('═')) {
                    this.info(args.join(' '));
                } else {
                    originalLog(...args);
                }
            };
        }
        if (customError) console.error = (msg, err) => this.error(msg, err);
        if (customWarn) console.warn = (msg) => this.warn(msg);
        return this;
    },

    handler: (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const statusColor = status >= 500 ? chalk.red : status >= 400 ? chalk.yellow : chalk.green;
            const logLine = [
                superLogger.getTime(),
                chalk.magenta.bold(req.method.padEnd(6)),
                chalk.white(req.originalUrl.split('?')[0]).padEnd(25),
                statusColor.bold(status),
                chalk.hex(COLORS.gray)('•'),
                chalk.hex(COLORS.cyan)(duration + 'ms')
            ].join(' ');
            process.stdout.write(logLine + '\n');
        });
        next();
    }
};

export default superLogger;