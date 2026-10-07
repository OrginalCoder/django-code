class IDETree {
    constructor(options) {
        this.roomSlug = options.roomSlug;
        this.container = document.getElementById(options.containerId || 'file-tree');
        this.onFileSelect = options.onFileSelect || function() {};
        this.activePath = null;
        this.expandedDirs = new Set();
        this.treeData = options.initialTree || [];

        this.init();
    }

    init() {
        if (this.treeData && this.treeData.length > 0) {
            this.render();
        } else {
            this.refresh();
        }
    }

    async refresh() {
        try {
            const res = await fetch(`/api/${this.roomSlug}/tree/`);
            const data = await res.json();
            if (data.success) {
                this.treeData = data.tree;
                this.render();
            }
        } catch (e) {
            console.error(e);
        }
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (filename === 'manage.py' || ext === 'py') {
            return `<svg class="svg-icon tree-icon-python" viewBox="0 0 24 24"><path d="M12 2c5 0 5 3 5 3v2h-5v1h7s3 0 3 5-3 5-3 5h-2v-3a2 2 0 0 0-2-2h-3v-2h5V5s0-3-5-3"/><path d="M12 22c-5 0-5-3-5-3v-2h5v-1H5s-3 0-3-5 3-5 3-5h2v3a2 2 0 0 0 2 2h3v2H7v1s0 3 5 3"/></svg>`;
        }
        if (ext === 'html') {
            return `<svg class="svg-icon tree-icon-html" viewBox="0 0 24 24"><path d="m4 3 1.8 15.6L12 21l6.2-2.4L20 3H4Zm12.6 5.2h-7l.2 2h6.6l-.6 6-3.8 1.1-3.8-1.1-.2-2.3h2l.1 1.2 1.9.5 1.9-.5.3-2.6H8.2L7.6 6h9.3l-.3 2.2Z"/></svg>`;
        }
        if (ext === 'css') {
            return `<svg class="svg-icon tree-icon-css" viewBox="0 0 24 24"><path d="m4 3 1.8 15.6L12 21l6.2-2.4L20 3H4Zm12.4 4.5H7.6l.3 2.5h8.2l-.6 6-3.5 1-3.5-1-.2-2.5H6.2l.4 4.5 5.4 1.5 5.4-1.5 1-10.5Z"/></svg>`;
        }
        if (ext === 'js') {
            return `<svg class="svg-icon tree-icon-js" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 15-.5 2c-.3 1-1 1-2 1a2 2 0 0 1-1.5-.7l.8-1.3c.2.2.4.3.7.3.3 0 .5-.2.6-.7l.4-1.3H10Zm4.5.3c.4.4 1 .7 1.7.7.8 0 1.3-.4 1.3-1 0-.6-.4-.9-1.2-1.2l-.5-.2c-1.1-.5-1.7-1.1-1.7-2.1 0-1.2 1-2 2.4-2 .8 0 1.5.3 2 .7l-.7 1.3c-.4-.3-.8-.5-1.3-.5-.5 0-.9.3-.9.7 0 .5.3.8 1.1 1.1l.5.2c1.3.5 1.9 1.2 1.9 2.2 0 1.4-1.1 2.2-2.6 2.2-1 0-1.9-.4-2.5-.9l.5-1.5Z"/></svg>`;
        }
        if (ext === 'sqlite3' || ext === 'db') {
            return `<svg class="svg-icon tree-icon-db" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`;
        }
        if (ext === 'md') {
            return `<svg class="svg-icon tree-icon-md" viewBox="0 0 24 24"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15V9l2.5 3L12 9v6"/><path d="M17 12l-2-2v4h4l-2-2Z"/></svg>`;
        }
        if (ext === 'json') {
            return `<svg class="svg-icon tree-icon-json" viewBox="0 0 24 24"><path d="M4 6c0-1.1.9-2 2-2h1a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2"/><path d="M20 6c0-1.1-.9-2-2-2h-1a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2"/></svg>`;
        }
        return `<svg class="svg-icon tree-icon-file" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
    }

    getFolderIcon(isExpanded) {
        if (isExpanded) {
            return `<svg class="svg-icon tree-icon-folder" viewBox="0 0 24 24"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v1"/></svg>`;
        }
        return `<svg class="svg-icon tree-icon-folder" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`;
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (!this.treeData || this.treeData.length === 0) {
            this.container.innerHTML = `
                <div class="p-4 text-xs text-slate-400 space-y-2 leading-relaxed">
                    <p class="font-medium text-slate-300">Loyiha papkasi bo'sh</p>
                    <p class="text-[11px] text-slate-500">Terminalda buyruq bering:</p>
                    <div class="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-emerald-400 select-all">
                        django-admin startproject myproject .
                    </div>
                    <p class="text-[10px] text-slate-500">Fayllar yaratilgach, daraxtda avtomatik ko'rinadi.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.buildNodes(this.treeData, fragment, 0);
        this.container.appendChild(fragment);
    }

    buildNodes(items, parentElement, depth) {
        items.forEach(item => {
            const isDir = item.type === 'directory';
            const node = document.createElement('div');
            node.className = `tree-node ${this.activePath === item.path ? 'active' : ''}`;
            node.style.paddingLeft = `${depth * 14 + 10}px`;
            node.dataset.path = item.path;
            node.dataset.type = item.type;

            const arrow = document.createElement('span');
            arrow.className = `tree-arrow ${isDir && this.expandedDirs.has(item.path) ? 'expanded' : ''}`;
            arrow.innerHTML = isDir ? `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>` : '';
            node.appendChild(arrow);

            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            if (isDir) {
                icon.innerHTML = this.getFolderIcon(this.expandedDirs.has(item.path));
            } else {
                icon.innerHTML = this.getFileIcon(item.name);
            }
            node.appendChild(icon);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'tree-name';
            nameSpan.textContent = item.name;
            node.appendChild(nameSpan);

            const actions = document.createElement('span');
            actions.className = 'tree-actions';
            
            const delBtn = document.createElement('button');
            delBtn.className = 'tree-btn';
            delBtn.title = "O'chirish";
            delBtn.innerHTML = `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.promptDelete(item.path, isDir);
            };
            actions.appendChild(delBtn);
            node.appendChild(actions);

            node.onclick = () => {
                if (isDir) {
                    if (this.expandedDirs.has(item.path)) {
                        this.expandedDirs.delete(item.path);
                    } else {
                        this.expandedDirs.add(item.path);
                    }
                    this.render();
                } else {
                    this.setActive(item.path);
                    this.onFileSelect(item.path);
                }
            };

            parentElement.appendChild(node);

            if (isDir && this.expandedDirs.has(item.path) && item.children) {
                const childContainer = document.createElement('div');
                this.buildNodes(item.children, childContainer, depth + 1);
                parentElement.appendChild(childContainer);
            }
        });
    }

    setActive(path) {
        this.activePath = path;
        const allNodes = this.container.querySelectorAll('.tree-node');
        allNodes.forEach(node => {
            if (node.dataset.path === path) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });
    }

    async promptCreate(type = 'file') {
        const title = type === 'directory' ? 'Yangi papka nomi:' : 'Yangi fayl nomi (masalan: app/views.py):';
        const name = prompt(title);
        if (!name || !name.trim()) return;

        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

        try {
            const res = await fetch(`/api/${this.roomSlug}/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken || ''
                },
                body: JSON.stringify({
                    path: name.trim(),
                    type: type
                })
            });
            const data = await res.json();
            if (data.success) {
                await this.refresh();
                if (type === 'file') {
                    this.onFileSelect(name.trim());
                }
            } else {
                alert(`Xatolik: ${data.error}`);
            }
        } catch (e) {
            alert(`Tarmoq xatosi: ${e}`);
        }
    }

    async promptDelete(path, isDir) {
        const itemType = isDir ? 'papkani' : 'faylni';
        if (!confirm(`Haqiqatan ham "${path}" ${itemType} o'chirmoqchimisiz?`)) {
            return;
        }

        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

        try {
            const res = await fetch(`/api/${this.roomSlug}/delete/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken || ''
                },
                body: JSON.stringify({ path: path })
            });
            const data = await res.json();
            if (data.success) {
                if (this.activePath === path) {
                    this.activePath = null;
                }
                await this.refresh();
            } else {
                alert(`O'chirishda xatolik: ${data.error}`);
            }
        } catch (e) {
            alert(`Tarmoq xatosi: ${e}`);
        }
    }
}

window.IDETree = IDETree;
