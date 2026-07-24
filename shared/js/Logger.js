export const Logger = {
    info: (msg, ...args) => console.log(`%c[BendyHub INFO] %c${msg}`, 'color: #00BA7C; font-weight: bold;', 'color: inherit;', ...args),
    warn: (msg, ...args) => console.warn(`%c[BendyHub WARN] %c${msg}`, 'color: #D2A850; font-weight: bold;', 'color: inherit;', ...args),
    error: (msg, ...args) => console.error(`%c[BendyHub ERROR] %c${msg}`, 'color: #F85149; font-weight: bold;', 'color: inherit;', ...args),
};