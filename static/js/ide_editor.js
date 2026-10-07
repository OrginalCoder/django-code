class IDEEditor {
    constructor(options) {
        this.roomSlug = options.roomSlug;
        this.container = document.getElementById(options.containerId || 'monaco-editor');
        this.tabsContainer = document.getElementById(options.tabsContainerId || 'editor-tabs');
        this.placeholder = document.getElementById(options.placeholderId || 'empty-placeholder');
        this.onActiveFileChange = options.onActiveFileChange || function() {};
        
        this.editor = null;
        this.openFiles = new Map();
        this.activePath = null;

        this.initMonaco();
        this.bindShortcuts();
    }

    initMonaco() {
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
            const isMobile = window.innerWidth < 768;
            this.editor = monaco.editor.create(this.container, {
                value: '',
                language: 'python',
                theme: 'vs-dark',
                fontSize: isMobile ? 12 : 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontLigatures: true,
                automaticLayout: true,
                wordWrap: 'on',
                minimap: { enabled: !isMobile },
                scrollBeyondLastLine: false,
                lineNumbers: isMobile ? 'on' : 'on',
                lineNumbersMinChars: isMobile ? 2 : 3,
                lineDecorationsWidth: isMobile ? 4 : 10,
                folding: !isMobile,
                renderWhitespace: 'selection',
                tabSize: 4,
                insertSpaces: true,
                bracketPairColorization: { enabled: true },
                scrollbar: {
                    verticalScrollbarSize: isMobile ? 5 : 8,
                    horizontalScrollbarSize: isMobile ? 5 : 8
                }
            });

            this.editor.onDidChangeModelContent(() => {
                if (!this.activePath) return;
                const fileData = this.openFiles.get(this.activePath);
                if (fileData) {
                    const currentContent = this.editor.getValue();
                    const isDirty = currentContent !== fileData.originalContent;
                    fileData.isDirty = isDirty;
                    this.updateTabUI(this.activePath);
                    this.updateSaveButton();
                }
            });

            this.editor.onDidChangeCursorPosition((e) => {
                const posEl = document.getElementById('cursor-position');
                if (posEl) {
                    posEl.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
                }
            });

            window.addEventListener('resize', () => {
                if (this.editor) {
                    const mobile = window.innerWidth < 768;
                    this.editor.updateOptions({
                        fontSize: mobile ? 12 : 14,
                        minimap: { enabled: !mobile },
                        folding: !mobile
                    });
                    this.editor.layout();
                }
            });

            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    if (this.editor) this.editor.layout();
                }, 200);
            });

            if (this.pendingOpenPath) {
                this.openFile(this.pendingOpenPath);
                this.pendingOpenPath = null;
            }
        });
    }

    getLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'py': return 'python';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'js': return 'javascript';
            case 'json': return 'json';
            case 'md': return 'markdown';
            case 'sql': return 'sql';
            case 'sh': return 'shell';
            case 'yaml':
            case 'yml': return 'yaml';
            default: return 'plaintext';
        }
    }

    getFileSvg(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (filename === 'manage.py' || ext === 'py') {
            return `<svg class="svg-icon svg-icon-sm tree-icon-python" viewBox="0 0 24 24"><path d="M12 2c5 0 5 3 5 3v2h-5v1h7s3 0 3 5-3 5-3 5h-2v-3a2 2 0 0 0-2-2h-3v-2h5V5s0-3-5-3"/><path d="M12 22c-5 0-5-3-5-3v-2h5v-1H5s-3 0-3-5 3-5 3-5h2v3a2 2 0 0 0 2 2h3v2H7v1s0 3 5 3"/></svg>`;
        }
        if (ext === 'html') {
            return `<svg class="svg-icon svg-icon-sm tree-icon-html" viewBox="0 0 24 24"><path d="m4 3 1.8 15.6L12 21l6.2-2.4L20 3H4Zm12.6 5.2h-7l.2 2h6.6l-.6 6-3.8 1.1-3.8-1.1-.2-2.3h2l.1 1.2 1.9.5 1.9-.5.3-2.6H8.2L7.6 6h9.3l-.3 2.2Z"/></svg>`;
        }
        if (ext === 'css') {
            return `<svg class="svg-icon svg-icon-sm tree-icon-css" viewBox="0 0 24 24"><path d="m4 3 1.8 15.6L12 21l6.2-2.4L20 3H4Zm12.4 4.5H7.6l.3 2.5h8.2l-.6 6-3.5 1-3.5-1-.2-2.5H6.2l.4 4.5 5.4 1.5 5.4-1.5 1-10.5Z"/></svg>`;
        }
        if (ext === 'js') {
            return `<svg class="svg-icon svg-icon-sm tree-icon-js" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 15-.5 2c-.3 1-1 1-2 1a2 2 0 0 1-1.5-.7l.8-1.3c.2.2.4.3.7.3.3 0 .5-.2.6-.7l.4-1.3H10Zm4.5.3c.4.4 1 .7 1.7.7.8 0 1.3-.4 1.3-1 0-.6-.4-.9-1.2-1.2l-.5-.2c-1.1-.5-1.7-1.1-1.7-2.1 0-1.2 1-2 2.4-2 .8 0 1.5.3 2 .7l-.7 1.3c-.4-.3-.8-.5-1.3-.5-.5 0-.9.3-.9.7 0 .5.3.8 1.1 1.1l.5.2c1.3.5 1.9 1.2 1.9 2.2 0 1.4-1.1 2.2-2.6 2.2-1 0-1.9-.4-2.5-.9l.5-1.5Z"/></svg>`;
        }
        if (ext === 'sqlite3' || ext === 'db') {
            return `<svg class="svg-icon svg-icon-sm tree-icon-db" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`;
        }
        return `<svg class="svg-icon svg-icon-sm tree-icon-file" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
    }

    async openFile(path) {
        if (!this.editor) {
            this.pendingOpenPath = path;
            return;
        }

        if (this.openFiles.has(path)) {
            this.switchToFile(path);
            return;
        }

        try {
            const res = await fetch(`/api/${this.roomSlug}/read/?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (!data.success) {
                alert(`Faylni ochishda xatolik: ${data.error}`);
                return;
            }

            const lang = this.getLanguage(path);
            const modelUri = monaco.Uri.parse(`inmemory://room/${this.roomSlug}/${path}`);
            
            let model = monaco.editor.getModel(modelUri);
            if (!model) {
                model = monaco.editor.createModel(data.content, lang, modelUri);
            } else {
                model.setValue(data.content);
            }

            this.openFiles.set(path, {
                model: model,
                isDirty: false,
                originalContent: data.content,
                isBinary: data.is_binary,
                size: data.size
            });

            this.createTab(path);
            this.switchToFile(path);
        } catch (e) {
            alert(`Faylni yuklab bo'lmadi: ${e}`);
        }
    }

    createTab(path) {
        const filename = path.split('/').pop();
        const tab = document.createElement('div');
        tab.className = 'ide-tab';
        tab.dataset.path = path;

        const iconContainer = document.createElement('span');
        iconContainer.innerHTML = this.getFileSvg(filename);
        tab.appendChild(iconContainer);

        const dirtyDot = document.createElement('span');
        dirtyDot.className = 'tab-dirty-indicator';
        tab.appendChild(dirtyDot);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = filename;
        nameSpan.title = path;
        tab.appendChild(nameSpan);

        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close-btn';
        closeBtn.innerHTML = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeFile(path);
        };
        tab.appendChild(closeBtn);

        tab.onclick = () => {
            this.switchToFile(path);
        };

        this.tabsContainer.appendChild(tab);
    }

    updateTabUI(path) {
        const tab = this.tabsContainer.querySelector(`[data-path="${CSS.escape(path)}"]`);
        if (!tab) return;

        const fileData = this.openFiles.get(path);
        if (fileData && fileData.isDirty) {
            tab.classList.add('is-dirty');
        } else {
            tab.classList.remove('is-dirty');
        }

        if (this.activePath === path) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    }

    switchToFile(path) {
        const fileData = this.openFiles.get(path);
        if (!fileData) return;

        this.activePath = path;
        this.editor.setModel(fileData.model);
        this.editor.updateOptions({ readOnly: !!fileData.isBinary });

        const tabs = this.tabsContainer.querySelectorAll('.ide-tab');
        tabs.forEach(tab => {
            if (tab.dataset.path === path) {
                tab.classList.add('active');
                tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            } else {
                tab.classList.remove('active');
            }
        });

        if (this.placeholder) this.placeholder.style.display = 'none';
        if (this.container) this.container.style.display = 'block';
        this.editor.layout();

        const fileEl = document.getElementById('current-filepath');
        if (fileEl) fileEl.textContent = path;

        const langEl = document.getElementById('current-language');
        if (langEl) langEl.textContent = this.getLanguage(path).toUpperCase();

        this.updateSaveButton();
        this.onActiveFileChange(path);
    }

    closeFile(path) {
        const fileData = this.openFiles.get(path);
        if (!fileData) return;

        if (fileData.isDirty) {
            if (!confirm(`"${path}" faylida saqlanmagan o'zgarishlar bor. Baribir yopmoqchimisiz?`)) {
                return;
            }
        }

        const tab = this.tabsContainer.querySelector(`[data-path="${CSS.escape(path)}"]`);
        if (tab) tab.remove();

        fileData.model.dispose();
        this.openFiles.delete(path);

        if (this.activePath === path) {
            const nextKey = this.openFiles.keys().next().value;
            if (nextKey) {
                this.switchToFile(nextKey);
            } else {
                this.activePath = null;
                if (this.placeholder) this.placeholder.style.display = 'flex';
                if (this.container) this.container.style.display = 'none';
                const fileEl = document.getElementById('current-filepath');
                if (fileEl) fileEl.textContent = "Fayl tanlanmagan";
                const langEl = document.getElementById('current-language');
                if (langEl) langEl.textContent = 'PLAIN';
                this.updateSaveButton();
            }
        }
    }

    async saveCurrentFile() {
        if (!this.activePath) return;
        const fileData = this.openFiles.get(this.activePath);
        if (!fileData || fileData.isBinary) return;

        const content = this.editor.getValue();
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

        const saveBtn = document.getElementById('save-file-btn');
        if (saveBtn) {
            saveBtn.innerHTML = `<svg class="svg-icon svg-icon-sm animate-spin" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> <span class="hidden sm:inline">Saqlanmoqda...</span>`;
            saveBtn.disabled = true;
        }

        try {
            const res = await fetch(`/api/${this.roomSlug}/save/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken || ''
                },
                body: JSON.stringify({
                    path: this.activePath,
                    content: content
                })
            });

            const data = await res.json();
            if (data.success) {
                fileData.originalContent = content;
                fileData.isDirty = false;
                this.updateTabUI(this.activePath);
                this.updateSaveButton();

                const statusEl = document.getElementById('save-status');
                if (statusEl) {
                    const now = new Date();
                    statusEl.textContent = `Saqlandi: ${now.toLocaleTimeString()}`;
                    setTimeout(() => { statusEl.textContent = ''; }, 3000);
                }
            } else {
                alert(`Saqlashda xatolik: ${data.error}`);
            }
        } catch (e) {
            alert(`Tarmoq xatosi: ${e}`);
        } finally {
            this.updateSaveButton();
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-file-btn');
        if (!saveBtn) return;

        const saveIcon = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

        if (!this.activePath) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `${saveIcon} <span class="hidden sm:inline">Saqlash</span>`;
            return;
        }

        const fileData = this.openFiles.get(this.activePath);
        if (fileData && fileData.isDirty) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${saveIcon} <span class="hidden sm:inline"><b>Saqlash *</b></span>`;
            saveBtn.classList.remove('opacity-50');
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${saveIcon} <span class="hidden sm:inline">Saqlangan</span>`;
            saveBtn.classList.add('opacity-50');
        }
    }

    bindShortcuts() {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
        });
    }
}

window.IDEEditor = IDEEditor;
