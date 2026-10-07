class IDETerminal {
    constructor(options) {
        this.roomSlug = options.roomSlug;
        this.container = document.getElementById(options.containerId || 'terminal-container');
        this.statusDot = document.getElementById('terminal-status-dot');
        this.statusText = document.getElementById('terminal-status-text');
        this.panel = document.getElementById(options.panelId || 'terminal-panel');
        this.resizer = document.getElementById(options.resizerId || 'terminal-resizer');

        this.term = null;
        this.fitAddon = null;
        this.socket = null;
        this.isMaximized = false;
        this.originalHeight = 240;

        this.init();
        this.initResizer();
    }

    init() {
        if (!this.container) return;

        const TerminalClass = window.Terminal || (typeof Terminal !== 'undefined' ? Terminal : null);
        if (!TerminalClass) {
            if (this.statusText) {
                this.statusText.textContent = "xterm yuklanmadi";
                this.statusText.className = "text-red-400 font-mono text-[11px]";
            }
            if (this.container) {
                this.container.innerHTML = '<div class="p-4 text-red-400 font-mono text-xs">xterm.js kutubxonasi yuklanmadi. Qayta yuklang (Ctrl+F5).</div>';
            }
            return;
        }

        try {
            this.term = new TerminalClass({
                theme: {
                    background: '#0a0e17',
                    foreground: '#f1f5f9',
                    cursor: '#10b981',
                    cursorAccent: '#0a0e17',
                    selectionBackground: 'rgba(16, 185, 129, 0.25)',
                    black: '#1e293b',
                    red: '#f87171',
                    green: '#34d399',
                    yellow: '#fbbf24',
                    blue: '#60a5fa',
                    magenta: '#f472b6',
                    cyan: '#22d3ee',
                    white: '#f8fafc',
                    brightBlack: '#475569',
                    brightRed: '#ef4444',
                    brightGreen: '#10b981',
                    brightYellow: '#f59e0b',
                    brightBlue: '#3b82f6',
                    brightMagenta: '#ec4899',
                    brightCyan: '#06b6d4',
                    brightWhite: '#ffffff'
                },
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.25,
                cursorBlink: true,
                cursorStyle: 'block',
                convertEol: true,
                scrollback: 5000,
            });

            const FitAddonClass = window.FitAddon?.FitAddon || (typeof FitAddon !== 'undefined' ? FitAddon.FitAddon : null);
            if (FitAddonClass) {
                this.fitAddon = new FitAddonClass();
                this.term.loadAddon(this.fitAddon);
            }

            const WebLinksAddonClass = window.WebLinksAddon?.WebLinksAddon || (typeof WebLinksAddon !== 'undefined' ? WebLinksAddon.WebLinksAddon : null);
            if (WebLinksAddonClass) {
                this.term.loadAddon(new WebLinksAddonClass());
            }

            this.term.open(this.container);

            if (this.fitAddon) {
                setTimeout(() => this.fit(), 100);
            }

            this.term.onData((data) => {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(data);
                }
            });

            window.addEventListener('resize', () => {
                this.fit();
            });

            this.connect();
        } catch (err) {
            console.error(err);
            if (this.statusText) {
                this.statusText.textContent = "Xatolik";
                this.statusText.className = "text-red-400 font-mono text-[11px]";
            }
        }
    }

    initResizer() {
        if (!this.resizer || !this.panel) return;

        let isDragging = false;
        let startY = 0;
        let startHeight = 0;

        this.resizer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startHeight = this.panel.offsetHeight;
            this.resizer.classList.add('is-dragging');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.clientY;
            const newHeight = Math.max(90, Math.min(window.innerHeight - 150, startHeight + deltaY));
            this.panel.style.height = `${newHeight}px`;
            this.originalHeight = newHeight;
            this.fit();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.resizer.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                this.fit();
            }
        });
    }

    connect() {
        if (this.socket) {
            try { this.socket.close(); } catch(e) {}
        }

        this.updateStatus('connecting');

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const cleanSlug = encodeURIComponent(this.roomSlug.replace(/\/+$/, ''));
        const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${cleanSlug}/`;

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                this.updateStatus('connected');
                this.fit();
                if (this.term) {
                    this.term.focus();
                }
            };

            this.socket.onmessage = (event) => {
                if (this.term) {
                    this.term.write(event.data);
                }
            };

            this.socket.onclose = (event) => {
                this.updateStatus('disconnected');
                if (this.term) {
                    if (event.code === 4404) {
                        this.term.write('\r\n\x1b[31m[Xatolik] Xona topilmadi!\x1b[0m\r\n');
                    } else {
                        this.term.write('\r\n\x1b[33m[Aloqa uzildi] Qayta ulanish uchun "Qayta ulash" tugmasini bosing.\x1b[0m\r\n');
                    }
                }
            };

            this.socket.onerror = (err) => {
                console.error(err);
                this.updateStatus('disconnected');
            };
        } catch (e) {
            console.error(e);
            this.updateStatus('disconnected');
        }
    }

    fit() {
        if (this.fitAddon && this.container && this.container.clientWidth > 0 && this.container.clientHeight > 0) {
            try {
                this.fitAddon.fit();
                if (this.socket && this.socket.readyState === WebSocket.OPEN && this.term) {
                    this.socket.send(JSON.stringify({
                        type: 'resize',
                        cols: this.term.cols,
                        rows: this.term.rows
                    }));
                }
            } catch (e) {}
        }
    }

    updateStatus(state) {
        if (!this.statusDot || !this.statusText) return;

        this.statusDot.className = 'status-dot';
        if (state === 'connected') {
            this.statusDot.classList.add('connected');
            this.statusText.textContent = 'Ulangan';
            this.statusText.className = 'text-emerald-400 font-mono text-[11px]';
        } else if (state === 'disconnected') {
            this.statusDot.classList.add('disconnected');
            this.statusText.textContent = 'Uzilgan';
            this.statusText.className = 'text-red-400 font-mono text-[11px]';
        } else {
            this.statusText.textContent = 'Ulanmoqda...';
            this.statusText.className = 'text-amber-400 font-mono text-[11px]';
        }
    }

    clear() {
        if (this.term) {
            this.term.clear();
        }
    }

    toggleMaximize() {
        if (!this.panel) return;
        this.isMaximized = !this.isMaximized;
        const maxBtn = document.getElementById('terminal-max-btn');

        if (this.isMaximized) {
            this.panel.style.height = 'calc(100vh - 120px)';
            if (maxBtn) {
                maxBtn.innerHTML = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
                maxBtn.title = "Tiklash";
            }
        } else {
            this.panel.style.height = `${this.originalHeight}px`;
            if (maxBtn) {
                maxBtn.innerHTML = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
                maxBtn.title = "Kattalashtirish";
            }
        }

        setTimeout(() => this.fit(), 180);
    }

    togglePanel() {
        if (!this.panel) return;
        const isHidden = this.panel.style.display === 'none';
        this.panel.style.display = isHidden ? 'flex' : 'none';
        if (this.resizer) {
            this.resizer.style.display = isHidden ? 'block' : 'none';
        }
        if (isHidden) {
            setTimeout(() => this.fit(), 100);
        }
    }
}

window.IDETerminal = IDETerminal;
