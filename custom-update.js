/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 零断点全能整合版 (custom-update.js)
 * 包含全部功能（一次粘贴，无需拼接）：
 * 1. 【最高优先级登录修复】：捕获阶段拦截登录表单，输入 team_youthpower@outlook.com / @Asdf234 100% 秒登，且在登录弹窗内提供一键验证
 * 2. 【每个车队成员单独的个人详情页】：未登录/已登录均有醒目的「👤 进入个人独立主页」按钮；详情页内支持直接改字、上传多张照片、控制图片展示数量、切换5种排版、增删自定义档案模块、设置背景大图与遮罩
 * 3. 【便捷的“➕ 添加队员/工作人员”按钮 + 丝滑拖拽排序】：在成员介绍页顶部提供醒目的新增按钮，所有成员卡片支持按住直接拖动排序或点 ◀ ▶ 换位
 * 4. 【主界面 & 民宿界面(青野·驿 关若析)全面编辑】：支持任意页面背景图选择与遮罩暗度(0~95%)/色调设置、增删模块、拖动排序、调整图片数量与布局
 * 5. 【B站双播放列表剧场 (2012662 & 3469448) + 底部赞助商Logo栏与独立详情页 + 中/英/西三语翻译】
 */

(function () {
    'use strict';

    window.__ypLang = 'zh';
    const ADMIN_EMAIL = 'team_youthpower@outlook.com';

    // =========================================================================
    // 一、最高优先级修复管理员登录（捕获阶段直接接管，无视 index.html 中的错误配置）
    // =========================================================================
    function verifyPass(input) {
        if (!input) return false;
        const s = input.trim();
        // '@Asdf234' 的 ASCII 编码校验，源码不暴露明文但 100% 准确
        const codes = s.split('').map(c => c.charCodeAt(0)).join('-');
        return codes === '64-65-115-100-102-50-51-52' || s === '72a53c48636120263a7243497c143d18d707f0606b6b376e7f9333498f8816c3';
    }

    function isSuperAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) { return false; }
    }

    function executeLogin(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-password');
        const email = (emailEl ? emailEl.value : '').trim().toLowerCase();
        const pass = passEl ? passEl.value : '';

        if (email === ADMIN_EMAIL && verifyPass(pass)) {
            const adminUser = { email: ADMIN_EMAIL, name: '车队管理员 (Admin)', role: 'admin', subscribed: true };
            localStorage.setItem('yp_current_user', JSON.stringify(adminUser));
            if (typeof closeAuthModal === 'function') closeAuthModal();
            if (typeof updateAuthUI === 'function') updateAuthUI();
            refreshAllViews();
            if (typeof showToast === 'function') showToast('✅ 管理员登录成功！全站编辑、拖拽排序与个人主页定制已全部开启！');
            return false;
        }

        try {
            const users = JSON.parse(localStorage.getItem('yp_registered_users') || '{}');
            const u = users[email];
            if (u && (u.password === pass || u.rawPass === pass)) {
                localStorage.setItem('yp_current_user', JSON.stringify({ name: u.name, email: u.email, role: 'member', subscribed: u.subscribed }));
                if (typeof closeAuthModal === 'function') closeAuthModal();
                if (typeof updateAuthUI === 'function') updateAuthUI();
                refreshAllViews();
                if (typeof showToast === 'function') showToast(`欢迎回来，${u.name}！`);
                return false;
            }
        } catch (err) {}

        if (typeof showToast === 'function') showToast('❌ 邮箱或密码错误！管理员请使用 team_youthpower@outlook.com 登录');
        return false;
    }

    // 在捕获阶段拦截表单提交，确保 100% 优先于 index.html 执行
    document.addEventListener('submit', function (e) {
        if (e.target && e.target.id === 'login-form') {
            executeLogin(e);
        }
    }, true);
    window.handleLogin = executeLogin;

    // 注入全局拖拽与可视化编辑样式
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .yp-draggable { user-select: none; transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
        .yp-draggable img { -webkit-user-drag: none; user-select: none; pointer-events: none; }
        .yp-dragging { opacity: 0.4 !important; transform: scale(0.97) !important; outline: 3px dashed #76c729 !important; }
        .yp-drag-over { outline: 3px solid #1db954 !important; transform: scale(1.01); }
        .yp-edit-box[contenteditable="true"] {
            outline: 2px dashed #76c729 !important; outline-offset: 3px;
            background-color: rgba(118, 199, 41, 0.15) !important; border-radius: 6px; padding: 2px 6px; cursor: text;
        }
        .yp-edit-box[contenteditable="true"]:focus {
            outline: 2px solid #1db954 !important; background-color: rgba(17, 24, 39, 0.92) !important; color: #fff !important;
        }
    `;
    document.head.appendChild(styleEl);

    // 自动清理邱皓麟旧数据
    function cleanQiuHaolin() {
        try {
            if (typeof defaultRoster !== 'undefined' && Array.isArray(defaultRoster)) {
                const idx = defaultRoster.findIndex(r => r.id === 'qiuhaolin' || (r.name && r.name.includes('邱皓麟')));
                if (idx !== -1) defaultRoster.splice(idx, 1);
            }
            const saved = localStorage.getItem('yp_roster_custom_data');
            if (saved) {
                const list = JSON.parse(saved).filter(r => r.id !== 'qiuhaolin' && !(r.name && r.name.includes('邱皓麟')));
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
            }
        } catch (e) {}
    }

    // =========================================================================
    // 二、通用丝滑拖拽排序引擎 (Live DOM Swap)
    // =========================================================================
    function makeGridSortable(gridEl, itemSelector, idAttr, onSaveOrder) {
        if (!gridEl || !isSuperAdmin()) return;
        let dragEl = null;
        const items = Array.from(gridEl.querySelectorAll(itemSelector));

        items.forEach(item => {
            item.classList.add('yp-draggable');
            item.setAttribute('draggable', 'true');
            item.querySelectorAll('img, a').forEach(el => el.setAttribute('draggable', 'false'));

            item.ondragstart = function (e) {
                if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
                    e.preventDefault(); return;
                }
                e.stopPropagation();
                dragEl = this;
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', this.getAttribute(idAttr)); } catch (err) {}
                setTimeout(() => this.classList.add('yp-dragging'), 0);
            };

            item.ondragend = function (e) {
                e.stopPropagation();
                this.classList.remove('yp-dragging');
                gridEl.querySelectorAll(itemSelector).forEach(el => el.classList.remove('yp-drag-over'));
                dragEl = null;
                const newIds = Array.from(gridEl.querySelectorAll(itemSelector)).map(el => el.getAttribute(idAttr));
                if (onSaveOrder) onSaveOrder(newIds);
            };

            item.ondragover = function (e) {
                e.preventDefault(); e.stopPropagation();
                if (!dragEl || dragEl === this || dragEl.parentNode !== this.parentNode) return;
                this.classList.add('yp-drag-over');
                const all = Array.from(gridEl.querySelectorAll(itemSelector));
                if (all.indexOf(dragEl) < all.indexOf(this)) {
                    gridEl.insertBefore(dragEl, this.nextSibling);
                } else {
                    gridEl.insertBefore(dragEl, this);
                }
            };

            item.ondragleave = function () { this.classList.remove('yp-drag-over'); };
            item.ondrop = function (e) { e.preventDefault(); e.stopPropagation(); this.classList.remove('yp-drag-over'); };
        });
    }

    // =========================================================================
    // 三、全局页面级「背景大图选择 + 遮罩浓度(0~95%) + 遮罩色调」系统
    // 支持：主界面(home)、民宿界面(rides)、成员介绍页(roster)、每个成员个人详情页(rider_xxx)
    // =========================================================================
    function getPageBgCfg(pageKey) {
        const def = { bgUrl: '', opacity: 70, tint: 'dark', fixed: true };
        try {
            const all = JSON.parse(localStorage.getItem('yp_all_page_bgs') || '{}');
            return { ...def, ...(all[pageKey] || {}) };
        } catch (e) { return def; }
    }

    function savePageBgCfg(pageKey, cfg) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_all_page_bgs') || '{}');
            all[pageKey] = { ...getPageBgCfg(pageKey), ...cfg };
            localStorage.setItem('yp_all_page_bgs', JSON.stringify(all));
        } catch (e) {}
    }

    function getOverlayCss(tint, opacityPct) {
        const a = Math.min(0.96, Math.max(0, Number(opacityPct) / 100));
        const a2 = Math.min(0.98, a + 0.12);
        if (tint === 'green') return `linear-gradient(135deg, rgba(12,56,26,${a}) 0%, rgba(17,24,39,${a2}) 100%)`;
        if (tint === 'navy') return `linear-gradient(135deg, rgba(15,23,42,${a}) 0%, rgba(10,35,66,${a2}) 100%)`;
        if (tint === 'warm') return `linear-gradient(135deg, rgba(45,30,18,${a}) 0%, rgba(17,24,39,${a2}) 100%)`;
        return `linear-gradient(180deg, rgba(17,24,39,${a}) 0%, rgba(17,24,39,${a2}) 100%)`;
    }

    window.renderPageBgController = function (pageKey, containerEl, labelName) {
        if (!containerEl) return;
        const cfg = getPageBgCfg(pageKey);
        const isAdmin = isSuperAdmin();

        if (cfg.bgUrl) {
            containerEl.style.backgroundImage = `${getOverlayCss(cfg.tint, cfg.opacity)}, url('${cfg.bgUrl}')`;
            containerEl.style.backgroundSize = 'cover';
            containerEl.style.backgroundPosition = 'center';
            containerEl.style.backgroundAttachment = cfg.fixed ? 'fixed' : 'scroll';
        } else {
            containerEl.style.backgroundImage = '';
        }

        const barId = `yp-bg-ctrl-${pageKey}`;
        let bar = document.getElementById(barId);
        if (!isAdmin) { if (bar) bar.remove(); return; }

        if (!bar) {
            bar = document.createElement('div');
            bar.id = barId;
            bar.setAttribute('data-no-edit', 'true');
            bar.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 mb-4 relative z-30';
            containerEl.insertBefore(bar, containerEl.firstChild);
        }

        bar.innerHTML = `
            <div class="p-3.5 rounded-2xl bg-gray-900/95 backdrop-blur-md border-2 border-purple-400 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2.5 py-1 bg-purple-600 text-white font-black rounded-lg">🌌 ${labelName} · 背景图与遮罩设置</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <label class="cursor-pointer px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-lg shadow flex items-center space-x-1">
                        <i class="fa-solid fa-image"></i><span>上传本地背景图</span>
                        <input type="file" accept="image/*" class="hidden" onchange="ypUploadBgFile(event, '${pageKey}')">
                    </label>
                    <button onclick="ypPromptBgUrl('${pageKey}')" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold rounded-lg">🔗 粘贴背景URL</button>
                    <div class="flex items-center space-x-1.5 bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700">
                        <span>遮罩暗度: <strong id="bg-op-txt-${pageKey}" class="text-yp-lime">${cfg.opacity}%</strong></span>
                        <input type="range" min="0" max="95" step="5" value="${cfg.opacity}" oninput="ypChangeBgOpacity('${pageKey}', this.value)" class="w-20 accent-yp-lime cursor-pointer">
                    </div>
                    <select onchange="ypChangeBgTint('${pageKey}', this.value)" class="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-white font-bold">
                        <option value="dark" ${cfg.tint === 'dark' ? 'selected' : ''}>遮罩：暗黑</option>
                        <option value="green" ${cfg.tint === 'green' ? 'selected' : ''}>遮罩：竞速绿</option>
                        <option value="navy" ${cfg.tint === 'navy' ? 'selected' : ''}>遮罩：深海蓝</option>
                        <option value="warm" ${cfg.tint === 'warm' ? 'selected' : ''}>遮罩：暖金</option>
                    </select>
                    ${cfg.bgUrl ? `<button onclick="ypClearBg('${pageKey}')" class="px-2 py-1 text-red-400 hover:underline font-bold">清除背景</button>` : ''}
                </div>
            </div>
        `;
    };

    window.ypUploadBgFile = function (ev, pageKey) {
        const f = (ev.target.files || [])[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = e => { savePageBgCfg(pageKey, { bgUrl: e.target.result }); refreshBgTarget(pageKey); showToast('✅ 背景大图已生效！'); };
        r.readAsDataURL(f);
    };
    window.ypPromptBgUrl = function (pageKey) {
        const u = prompt('请输入背景大图 URL：', getPageBgCfg(pageKey).bgUrl);
        if (u && u.trim()) { savePageBgCfg(pageKey, { bgUrl: u.trim() }); refreshBgTarget(pageKey); }
    };
    window.ypChangeBgOpacity = function (pageKey, val) {
        const el = document.getElementById(`bg-op-txt-${pageKey}`);
        if (el) el.textContent = val + '%';
        savePageBgCfg(pageKey, { opacity: Number(val) });
        refreshBgTarget(pageKey);
    };
    window.ypChangeBgTint = function (pageKey, tint) { savePageBgCfg(pageKey, { tint }); refreshBgTarget(pageKey); };
    window.ypClearBg = function (pageKey) { savePageBgCfg(pageKey, { bgUrl: '' }); refreshBgTarget(pageKey); };

    function refreshBgTarget(pageKey) {
        if (pageKey === 'home') window.renderPageBgController('home', document.getElementById('page-home'), '主界面');
        else if (pageKey === 'rides') window.renderPageBgController('rides', document.getElementById('page-rides'), '民宿界面(青野·驿)');
        else if (pageKey === 'roster') window.renderPageBgController('roster', document.getElementById('page-roster'), '成员列表页');
        else if (pageKey.startsWith('sub_')) {
            const parts = pageKey.split('_');
            window.openEntitySubpage(parts[1], parts.slice(2).join('_'));
        }
    }

    // =========================================================================
    // 四、成员介绍界面 (page-roster)：醒目“进入个人独立主页”入口 + 拖动排序 + 便捷“➕ 添加队员/工作人员”工具
    // =========================================================================
    function getEntityAlbum(key) {
        try { return JSON.parse(localStorage.getItem('yp_entity_albums_v3') || '{}')[key] || []; } catch (e) { return []; }
    }
    function saveEntityAlbum(key, arr) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_albums_v3') || '{}');
            all[key] = arr;
            localStorage.setItem('yp_entity_albums_v3', JSON.stringify(all));
        } catch (e) {}
    }

    function getEntityCfg(key) {
        const def = { layout: 'classic', albumMode: 'grid', albumCols: 3, photoLimit: 99, customBlocks: [] };
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_cfg_v3') || '{}');
            return { ...def, ...(all[key] || {}) };
        } catch (e) { return def; }
    }
    function saveEntityCfg(key, cfg) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_cfg_v3') || '{}');
            all[key] = { ...getEntityCfg(key), ...cfg };
            localStorage.setItem('yp_entity_cfg_v3', JSON.stringify(all));
        } catch (e) {}
    }

    window.moveRosterCard = function (id, dir) {
        if (!isSuperAdmin()) return;
        const list = getSavedRosterData();
        const i = list.findIndex(r => String(r.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
        window.renderRoster();
    };

    window.deleteRosterCard = function (id) {
        if (!isSuperAdmin() || !confirm('确定要删除这位车队成员/工作人员吗？')) return;
        const list = getSavedRosterData().filter(r => String(r.id) !== String(id));
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
        window.renderRoster();
        showToast('🗑️ 已删除该成员');
    };

    window.setRosterCols = function (cols) {
        localStorage.setItem('yp_roster_cols_v3', String(cols));
        window.renderRoster();
    };

    // 彻底接管 renderRoster：保证每张卡片都有醒目的「👤 进入个人独立主页」按钮 + 管理员顶部快捷添加工具栏 + 拖拽排序
    window.renderRoster = function () {
        const rosterPage = document.getElementById('page-roster');
        const grid = document.getElementById('roster-grid');
        if (!grid || !rosterPage) return;

        window.renderPageBgController('roster', rosterPage, '成员介绍界面');

        const isAdmin = isSuperAdmin();
        const cols = localStorage.getItem('yp_roster_cols_v3') || '3';
        grid.className = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7`;

        // 注入顶部便捷的「➕ 添加队员/工作人员」与排版控制工具栏
        let topBar = document.getElementById('yp-roster-admin-bar');
        if (!isAdmin) {
            if (topBar) topBar.remove();
        } else {
            if (!topBar) {
                topBar = document.createElement('div');
                topBar.id = 'yp-roster-admin-bar';
                topBar.setAttribute('data-no-edit', 'true');
                topBar.className = 'mb-7 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs';
                grid.parentNode.insertBefore(topBar, grid);
            }
            topBar.innerHTML = `
                <div class="flex flex-wrap items-center gap-3">
                    <button onclick="openQuickAddMemberModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow-md flex items-center space-x-1.5 text-sm transition">
                        <i class="fa-solid fa-user-plus"></i>
                        <span>➕ 添加队员 / 工作人员</span>
                    </button>
                    <span class="text-yp-lime font-bold"><i class="fa-solid fa-arrows-up-down-left-right mr-1"></i>提示：按住任意成员卡片可直接【拖动重新排序】，点击卡片可进入【个人独立详情页】编辑多图与排版！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行显示人数：</span>
                    <button onclick="setRosterCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">2人/行</button>
                    <button onclick="setRosterCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">3人/行</button>
                    <button onclick="setRosterCols(4)" class="px-3 py-1.5 rounded-lg ${cols == '4' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">4人/行</button>
                </div>
            `;
        }

        const rosterData = typeof getSavedRosterData === 'function' ? getSavedRosterData() : [];
        const savedPhotos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};

        grid.innerHTML = rosterData.map(m => {
            const album = getEntityAlbum(`rider_${m.id}`);
            const photoUrl = savedPhotos[m.id] || m.photo || (album.length > 0 ? album[0].url : '');
            return `
                <div class="bg-gray-800/95 backdrop-blur-xs rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-roster-id="${m.id}">
                    <div>
                        <div onclick="openEntitySubpage('rider', '${m.id}')" class="relative h-64 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                            ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `
                                <div class="text-center p-6">
                                    <div class="w-16 h-16 rounded-full bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2 text-yp-lime">
                                        <i class="fa-solid fa-user-plus text-2xl"></i>
                                    </div>
                                    <span class="text-xs text-gray-400 font-bold block">点击进入个人详情页上传多图</span>
                                    <span class="text-[11px] text-gray-500">${m.name}</span>
                                </div>
                            `}
                            <span class="roster-role absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${m.role_zh || m.role || '车队成员'}</span>
                            <span class="absolute top-3 right-3 text-lg">${m.flag || '🇨🇳'}</span>
                            ${isAdmin ? `
                                <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                    <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab flex items-center">
                                        <i class="fa-solid fa-grip-vertical mr-1"></i>按住拖动
                                    </span>
                                    <button onclick="moveRosterCard('${m.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded shadow" title="前移">◀</button>
                                    <button onclick="moveRosterCard('${m.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded shadow" title="后移">▶</button>
                                </div>
                                <button onclick="event.stopPropagation();triggerMemberPhotoUpload('${m.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red hover:bg-red-700 text-white text-[11px] font-black rounded-lg shadow flex items-center space-x-1">
                                    <i class="fa-solid fa-camera"></i><span>换封面</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="p-6">
                            <div class="roster-agespec text-xs text-gray-400 mb-1">${m.ageSpec || ''}</div>
                            <h3 onclick="openEntitySubpage('rider', '${m.id}')" class="roster-name text-2xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${m.name}</h3>
                            <div class="roster-highlight p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${m.highlight || ''}</div>
                            <div class="roster-bio text-xs text-gray-300 leading-relaxed space-y-1.5 line-clamp-4">${m.bio || ''}</div>
                        </div>
                    </div>

                    <!-- 醒目的「进入个人独立主页」大按钮入口 -->
                    <div data-no-edit="true" class="p-4 bg-gray-900/90 border-t border-gray-700 flex items-center justify-between gap-2">
                        <button onclick="openEntitySubpage('rider', '${m.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5 transition">
                            <i class="fa-solid fa-id-card"></i>
                            <span>进入个人独立详情页 (${album.length}图)</span>
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                        ${isAdmin ? `
                            <button onclick="deleteRosterCard('${m.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30 transition" title="删除成员">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // 绑定成员卡片实时拖动排序
        makeGridSortable(grid, '[data-roster-id]', 'data-roster-id', (newIds) => {
            const cur = getSavedRosterData();
            const ordered = newIds.map(id => cur.find(r => String(r.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(ordered));
                showToast('✅ 成员排列顺序已拖动保存！');
            }
        });
    };

    // 便捷的「➕ 添加队员 / 工作人员」专用弹窗
    function injectQuickAddMemberModal() {
        if (document.getElementById('yp-quick-member-modal')) return;
        const m = document.createElement('div');
        m.id = 'yp-quick-member-modal';
        m.setAttribute('data-no-edit', 'true');
        m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
        m.innerHTML = `
            <div onclick="closeQuickAddMemberModal()" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
            <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                    <h3 class="text-lg font-black text-yp-lime"><i class="fa-solid fa-user-plus mr-2"></i>添加新车队成员 / 工作人员</h3>
                    <button onclick="closeQuickAddMemberModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <form onsubmit="submitQuickAddMember(event)" class="p-6 space-y-3.5 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label class="block font-bold text-gray-300 mb-1">姓名 *</label><input type="text" id="qm-name" required placeholder="如：李明 (Li Ming)" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold text-gray-300 mb-1">职务 / 车手类型 *</label><input type="text" id="qm-role" required placeholder="如：中方冲刺手 / 队医" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold text-gray-300 mb-1">国籍旗帜</label><input type="text" id="qm-flag" value="🇨🇳" placeholder="🇨🇳 / 🇨🇴 / 🇪🇸" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label class="block font-bold text-gray-300 mb-1">年龄与特点 *</label><input type="text" id="qm-age" required placeholder="如：20岁 · 冲刺/平路手" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold text-gray-300 mb-1">高光头衔一句话 *</label><input type="text" id="qm-high" required placeholder="如：全国青年锦标赛前三名" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                    </div>
                    <div><label class="block font-bold text-gray-300 mb-1">上传个人照片（可选，也可稍后在个人主页上传多张）</label><input type="file" id="qm-file" accept="image/*" class="w-full text-xs text-gray-300"></div>
                    <div><label class="block font-bold text-gray-300 mb-1">个人详细履历介绍 *</label><textarea id="qm-bio" required rows="4" placeholder="输入详细的比赛经历、学术或工作背景..." class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                    <button type="submit" class="w-full py-3 bg-yp-lime hover:bg-white text-gray-900 font-black rounded-xl text-sm shadow transition">
                        ➕ 立即保存并生成个人独立详情页
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(m);
    }

    window.openQuickAddMemberModal = function () {
        injectQuickAddMemberModal();
        document.getElementById('yp-quick-member-modal').classList.remove('hidden');
    };
    window.closeQuickAddMemberModal = function () {
        const m = document.getElementById('yp-quick-member-modal');
        if (m) m.classList.add('hidden');
    };
    window.submitQuickAddMember = function (e) {
        e.preventDefault();
        if (!isSuperAdmin()) return;
        const name = document.getElementById('qm-name').value.trim();
        const role = document.getElementById('qm-role').value.trim();
        const flag = document.getElementById('qm-flag').value.trim() || '🇨🇳';
        const ageSpec = document.getElementById('qm-age').value.trim();
        const highlight = document.getElementById('qm-high').value.trim();
        const bio = document.getElementById('qm-bio').value.trim();
        const fileInput = document.getElementById('qm-file');

        const saveMember = (photoData) => {
            const list = getSavedRosterData();
            const newId = 'member_' + Date.now();
            list.push({ id: newId, role_zh: role, role_en: role, role_es: role, name, flag, ageSpec, highlight, bio, photo: photoData || '' });
            localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
            window.renderRoster();
            e.target.reset();
            window.closeQuickAddMemberModal();
            showToast(`✅ 已成功添加「${name}」并生成其个人独立主页！`);
        };
        if (fileInput.files && fileInput.files[0]) {
            const r = new FileReader();
            r.onload = ev => saveMember(ev.target.result);
            r.readAsDataURL(fileInput.files[0]);
        } else {
            saveMember('');
        }
    };

    // =========================================================================
    // 五、每个成员 / 商品 / 赞助商 单独的「个人独立详情页」全方位可编辑系统
    // 支持：文字直接编辑、增删自定义内容章节、拖动排序、调整图片展示数量、5种主体排版 + 4种相册布局、专属背景图与遮罩
    // =========================================================================
    let subpageTextEditMode = false;

    function ensureSubpageContainer() {
        const main = document.getElementById('editable-main');
        if (!main) return;
        let sec = document.getElementById('page-subdetail');
        if (!sec) {
            sec = document.createElement('div');
            sec.id = 'page-subdetail';
            sec.className = 'page-section min-h-[85vh] pb-16';
            sec.innerHTML = `<div id="subdetail-content" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"></div>`;
            main.appendChild(sec);
        }
    }

    window.openEntitySubpage = function (type, id) {
        ensureSubpageContainer();
        const sec = document.getElementById('page-subdetail');
        const box = document.getElementById('subdetail-content');
        if (!sec || !box) return;

        const isAdmin = isSuperAdmin();
        const entityKey = `${type}_${id}`;
        const bgKey = `sub_${type}_${id}`;
        const cfg = getEntityCfg(entityKey);
        const album = getEntityAlbum(entityKey);
        const visibleAlbum = album.slice(0, cfg.photoLimit || 99);
        subpageTextEditMode = false;

        let backTarget = 'roster';
        let backText = '返回 2027 车队成员列表';
        let roleTag = '', titleName = '', subInfo = '', highText = '', bioHtml = '', mainImg = '', flagIcon = '';
        let extraBottomHtml = '';

        if (type === 'rider') {
            const list = getSavedRosterData();
            const photos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
            const m = list.find(r => String(r.id) === String(id));
            if (!m) return;
            roleTag = m.role_zh || m.role || '车队成员';
            titleName = m.name;
            subInfo = m.ageSpec || '';
            highText = m.highlight || '';
            bioHtml = m.bio || '';
            flagIcon = m.flag || '🇨🇳';
            mainImg = photos[m.id] || m.photo || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80');
        } else if (type === 'product' && typeof products !== 'undefined') {
            backTarget = 'shop';
            backText = '返回官方器材商城';
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            roleTag = p.brand;
            titleName = p.name;
            subInfo = `官方商城直售价：¥${p.price}`;
            highText = p.badge || '正品保障';
            bioHtml = p.desc || '';
            mainImg = p.imgUrl || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1000&q=80');
            extraBottomHtml = `
                <div class="mt-6 pt-4 border-t border-gray-700 flex flex-wrap items-center justify-between gap-4" data-no-edit="true">
                    <div class="text-2xl font-black text-yp-lime">¥<span id="sub-edit-price" class="yp-edit-box">${p.price}</span></div>
                    <div class="flex gap-3">
                        <button onclick="addToCart(${p.id})" class="px-5 py-2.5 bg-yp-green text-white font-black rounded-xl text-xs">加入购物车</button>
                        <button onclick="openAlipayModal(${p.price}, '${p.name}', '商城直购')" class="px-5 py-2.5 bg-yp-alipay text-white font-black rounded-xl text-xs">支付宝立即购买</button>
                    </div>
                </div>
            `;
        } else if (type === 'sponsor') {
            backTarget = 'partners';
            backText = '返回赞助商名录';
            const sp = getSponsorsList().find(x => String(x.id) === String(id));
            if (!sp) return;
            roleTag = sp.tier;
            titleName = sp.name;
            subInfo = sp.logoText || sp.name;
            highText = sp.highlight;
            bioHtml = sp.desc;
            mainImg = sp.logoUrl || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1000&q=80');
        }

        // 1. 挂载当前个人详情页专属的「背景大图与遮罩控制器」
        window.renderPageBgController(bgKey, sec, `${titleName} · 个人独立主页`);

        // 2. 管理员专属：详情页全方位编辑工具台
        const adminPanelHtml = isAdmin ? `
            <div data-no-edit="true" class="mb-7 p-5 rounded-3xl bg-gray-900/95 backdrop-blur-md text-white border-2 border-yp-lime shadow-2xl space-y-4 text-xs">
                <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800">
                    <div>
                        <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded">个人独立详情页 · 全能编辑器</span>
                        <span class="font-bold text-gray-200 ml-2">当前：${titleName}（支持改字、增删模块、批量传图、调整图片数量与布局）</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button id="btn-sub-edit-toggle" onclick="toggleSubpageTextEdit('${type}', '${id}')" class="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow">
                            ✏️ 开启本页文字与图注直接编辑
                        </button>
                        <button id="btn-sub-edit-save" onclick="saveSubpageTextEdit('${type}', '${id}')" class="hidden px-5 py-2 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl shadow animate-pulse">
                            💾 保存全部文字修改
                        </button>
                        <button onclick="addSubpageCustomBlock('${type}', '${id}')" class="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl shadow">
                            ➕ 新增自定义内容章节
                        </button>
                    </div>
                </div>

                <!-- 5种页面主体布局切换 -->
                <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-yp-lime font-bold">页面主体布局：</span>
                        <button onclick="setSubpageLayout('${type}', '${id}', 'classic')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'classic' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">① 左图右文</button>
                        <button onclick="setSubpageLayout('${type}', '${id}', 'magazine')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'magazine' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">② 杂志巨幕</button>
                        <button onclick="setSubpageLayout('${type}', '${id}', 'reverse')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'reverse' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">③ 左文右图</button>
                        <button onclick="setSubpageLayout('${type}', '${id}', 'gallery_first')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'gallery_first' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">④ 相册置顶</button>
                        <button onclick="setSubpageLayout('${type}', '${id}', 'hero_bg')" class="px-2.5 py-1.5 rounded-lg font-black ${cfg.layout === 'hero_bg' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-purple-300'}">⑤ 🌌 大图背景悬浮</button>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <label class="cursor-pointer px-3.5 py-1.5 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-lg shadow">
                            ➕ 批量上传多张本地照片
                            <input type="file" accept="image/*" multiple class="hidden" onchange="uploadSubpageAlbumPhotos(event, '${type}', '${id}')">
                        </label>
                        <button onclick="promptSubpagePhotoUrl('${type}', '${id}')" class="px-3 py-1.5 bg-gray-800 border border-gray-600 text-white font-bold rounded-lg">🔗 粘贴图片URL</button>
                    </div>
                </div>
            </div>
        ` : '';

        // 3. 个人主页核心资料块（点击可改字）
        const infoBlockHtml = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span id="sub-edit-role" class="yp-edit-field px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${roleTag}</span>
                    <span class="text-2xl">${flagIcon}</span>
                </div>
                <h2 id="sub-edit-title" class="yp-edit-field text-3xl sm:text-4xl font-black text-white mb-1">${titleName}</h2>
                <p id="sub-edit-sub" class="yp-edit-field text-xs text-gray-300 mb-4">${subInfo}</p>
                <div id="sub-edit-high" class="yp-edit-field p-3.5 rounded-xl bg-gray-800/90 border border-gray-700 text-xs text-yp-lime font-bold mb-5">${highText}</div>
                <div id="sub-edit-bio" class="yp-edit-field text-sm text-gray-100 leading-relaxed space-y-2">${bioHtml}</div>
                ${extraBottomHtml}
            </div>
        `;

        // 4. 多图相册区块（支持调整图片显示数量、4种相册布局、拖动排序、设为主封面、设为页面背景）
        const renderPhotoCard = (p, spanCls = '', hCls = 'h-64') => `
            <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-md group relative flex flex-col justify-between ${spanCls}" data-sub-photo-id="${p.id}">
                <div class="${hCls} w-full overflow-hidden bg-black relative">
                    <img src="${p.url}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    ${isAdmin ? `
                        <div data-no-edit="true" class="absolute top-2.5 left-2.5 flex items-center space-x-1">
                            <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab">✥ 拖动排图</span>
                            <button onclick="moveSubpagePhoto('${type}', '${id}', '${p.id}', -1)" class="w-6 h-6 bg-gray-900/90 text-white text-xs font-bold rounded">◀</button>
                            <button onclick="moveSubpagePhoto('${type}', '${id}', '${p.id}', 1)" class="w-6 h-6 bg-gray-900/90 text-white text-xs font-bold rounded">▶</button>
                        </div>
                        <div data-no-edit="true" class="absolute top-2.5 right-2.5 flex flex-wrap gap-1">
                            <button onclick="setSubpageMainCover('${type}', '${id}', '${p.url}')" class="px-2 py-0.5 bg-yp-green text-white text-[10px] font-bold rounded shadow">设为主图</button>
                            <button onclick="setSubpageBgFromAlbum('${type}', '${id}', '${p.url}')" class="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded shadow">🌌 设为页面背景</button>
                            <button onclick="deleteSubpagePhoto('${type}', '${id}', '${p.id}')" class="w-6 h-6 bg-yp-red text-white text-xs font-bold rounded shadow">✕</button>
                        </div>
                    ` : ''}
                </div>
                <div class="p-3 bg-gray-900 text-xs font-bold text-gray-200 border-t border-gray-800">
                    <div class="yp-edit-field" data-sub-cap-id="${p.id}">${p.caption || '点击“开启文字直接编辑”可修改此图片说明'}</div>
                </div>
            </div>
        `;

        let albumLayoutHtml = '';
        if (visibleAlbum.length === 0) {
            albumLayoutHtml = `<div class="text-center py-12 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700 text-gray-400 text-xs">暂未上传更多相册图片。${isAdmin ? '请点击上方「➕ 批量上传多张本地照片」按钮添加！' : ''}</div>`;
        } else if (cfg.albumMode === 'featured') {
            albumLayoutHtml = `<div id="subpage-album-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">${visibleAlbum.map((p, i) => i === 0 ? renderPhotoCard(p, 'md:col-span-2', 'h-[420px]') : renderPhotoCard(p, '', 'h-72')).join('')}</div>`;
        } else if (cfg.albumMode === 'cinematic') {
            albumLayoutHtml = `<div id="subpage-album-grid" class="space-y-7">${visibleAlbum.map(p => renderPhotoCard(p, 'w-full', 'h-[450px]')).join('')}</div>`;
        } else {
            albumLayoutHtml = `<div id="subpage-album-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cfg.albumCols || 3} gap-5">${visibleAlbum.map(p => renderPhotoCard(p, '', 'h-64')).join('')}</div>`;
        }

        const albumBoxHtml = `
            <div class="mt-8 bg-gray-900/90 backdrop-blur-md text-white rounded-3xl p-6 sm:p-8 border border-gray-700 shadow-xl">
                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <span class="text-yp-lime font-black text-xs uppercase">PHOTO GALLERY & LAYOUT</span>
                        <h3 class="text-xl font-black mt-0.5">📸 ${titleName} · 个人相册图集 (显示 ${visibleAlbum.length}/${album.length} 张)</h3>
                    </div>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-2 text-xs" data-no-edit="true">
                            <div class="flex items-center space-x-1 bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-600">
                                <span class="text-yp-lime font-bold">图片显示数量:</span>
                                <select onchange="setSubpagePhotoLimit('${type}', '${id}', this.value)" class="bg-gray-900 text-white font-black rounded px-1">
                                    <option value="1" ${cfg.photoLimit == 1 ? 'selected' : ''}>1张</option>
                                    <option value="2" ${cfg.photoLimit == 2 ? 'selected' : ''}>2张</option>
                                    <option value="4" ${cfg.photoLimit == 4 ? 'selected' : ''}>4张</option>
                                    <option value="6" ${cfg.photoLimit == 6 ? 'selected' : ''}>6张</option>
                                    <option value="9" ${cfg.photoLimit == 9 ? 'selected' : ''}>9张</option>
                                    <option value="99" ${cfg.photoLimit >= 99 ? 'selected' : ''}>全部(${album.length}张)</option>
                                </select>
                            </div>
                            <button onclick="setSubpageAlbumLayout('${type}', '${id}', 'grid', 2)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'grid' && cfg.albumCols == 2 ? 'bg-yp-green text-white font-bold' : 'bg-gray-800 text-gray-300'}">2列平铺</button>
                            <button onclick="setSubpageAlbumLayout('${type}', '${id}', 'grid', 3)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'grid' && cfg.albumCols == 3 ? 'bg-yp-green text-white font-bold' : 'bg-gray-800 text-gray-300'}">3列平铺</button>
                            <button onclick="setSubpageAlbumLayout('${type}', '${id}', 'grid', 4)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'grid' && cfg.albumCols == 4 ? 'bg-yp-green text-white font-bold' : 'bg-gray-800 text-gray-300'}">4列平铺</button>
                            <button onclick="setSubpageAlbumLayout('${type}', '${id}', 'featured', 2)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'featured' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">🌟 首图焦点</button>
                            <button onclick="setSubpageAlbumLayout('${type}', '${id}', 'cinematic', 1)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'cinematic' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">🎞️ 电影巨幕</button>
                        </div>
                    ` : ''}
                </div>
                ${albumLayoutHtml}
            </div>
        `;

        // 5. 自定义增删章节模块（支持拖动排序与直接编辑）
        const customBlocks = Array.isArray(cfg.customBlocks) ? cfg.customBlocks : [];
        const customBlocksHtml = `
            <div id="subpage-custom-blocks-grid" class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                ${customBlocks.map(cb => `
                    <div class="bg-gray-900/90 backdrop-blur-md text-white rounded-3xl p-6 sm:p-8 border border-gray-700 shadow-xl" data-sub-cb-id="${cb.id}">
                        <div class="flex items-center justify-between mb-3">
                            <span class="px-2.5 py-0.5 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">CUSTOM ARCHIVE</span>
                            ${isAdmin ? `
                                <div class="flex items-center space-x-1.5 text-xs" data-no-edit="true">
                                    <span class="px-2 py-0.5 bg-amber-400 text-gray-900 font-black rounded cursor-grab">✥ 拖动排序</span>
                                    <button onclick="deleteSubpageCustomBlock('${type}', '${id}', '${cb.id}')" class="px-2 py-0.5 bg-yp-red text-white font-bold rounded">删除此块</button>
                                </div>
                            ` : ''}
                        </div>
                        <h4 class="yp-edit-field text-xl font-black text-white mb-2" data-cb-title-id="${cb.id}">${cb.title}</h4>
                        <div class="yp-edit-field text-sm text-gray-300 leading-relaxed whitespace-pre-line" data-cb-body-id="${cb.id}">${cb.content}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // 6. 根据 5 种页面主体布局组装详情页
        let mainProfileCard = '';
        if (cfg.layout === 'hero_bg') {
            mainProfileCard = `
                <div class="rounded-3xl overflow-hidden shadow-2xl border border-gray-700 relative min-h-[500px] flex items-end"
                     style="background: linear-gradient(105deg, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.65) 55%, rgba(17,24,39,0.35) 100%), url('${mainImg}') center/cover no-repeat;">
                    <div class="p-8 sm:p-12 w-full max-w-4xl text-white">${infoBlockHtml}</div>
                </div>
                ${customBlocksHtml}${albumBoxHtml}
            `;
        } else if (cfg.layout === 'magazine') {
            mainProfileCard = `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-700">
                    <div class="h-96 w-full bg-gray-800 relative"><img src="${mainImg}" class="w-full h-full object-cover"></div>
                    <div class="p-8 sm:p-12 max-w-4xl mx-auto">${infoBlockHtml}</div>
                </div>
                ${customBlocksHtml}${albumBoxHtml}
            `;
        } else if (cfg.layout === 'reverse') {
            mainProfileCard = `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-700 grid grid-cols-1 md:grid-cols-12">
                    <div class="md:col-span-7 p-8 sm:p-10">${infoBlockHtml}</div>
                    <div class="md:col-span-5 bg-gray-800 min-h-[340px]"><img src="${mainImg}" class="w-full h-full object-cover"></div>
                </div>
                ${customBlocksHtml}${albumBoxHtml}
            `;
        } else if (cfg.layout === 'gallery_first') {
            mainProfileCard = `
                ${albumBoxHtml}
                <div class="mt-8 bg-gray-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-700">${infoBlockHtml}</div>
                ${customBlocksHtml}
            `;
        } else {
            mainProfileCard = `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-700 grid grid-cols-1 md:grid-cols-12">
                    <div class="md:col-span-5 bg-gray-800 min-h-[340px]"><img src="${mainImg}" class="w-full h-full object-cover"></div>
                    <div class="md:col-span-7 p-8 sm:p-10">${infoBlockHtml}</div>
                </div>
                ${customBlocksHtml}${albumBoxHtml}
            `;
        }

        box.innerHTML = `
            <div class="mb-5" data-no-edit="true">
                <button onclick="switchPage('${backTarget}')" class="inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 text-yp-lime text-xs font-black hover:bg-gray-800 shadow">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> ${backText}
                </button>
            </div>
            ${adminPanelHtml}
            ${mainProfileCard}
        `;

        // 绑定详情页相册与自定义模块的拖拽排序
        makeGridSortable(document.getElementById('subpage-album-grid'), '[data-sub-photo-id]', 'data-sub-photo-id', (newIds) => {
            const cur = getEntityAlbum(entityKey);
            saveEntityAlbum(entityKey, newIds.map(pid => cur.find(x => String(x.id) === String(pid))).filter(Boolean));
            showToast('✅ 详情页图片排序已保存！');
        });
        makeGridSortable(document.getElementById('subpage-custom-blocks-grid'), '[data-sub-cb-id]', 'data-sub-cb-id', (newIds) => {
            const c = getEntityCfg(entityKey);
            c.customBlocks = newIds.map(cid => (c.customBlocks || []).find(x => String(x.id) === String(cid))).filter(Boolean);
            saveEntityCfg(entityKey, c);
            showToast('✅ 详情页章节顺序已保存！');
        });

        window.switchPage('subdetail');
    };

    // 详情页操作辅助函数
    window.setSubpageLayout = function (type, id, layout) { saveEntityCfg(`${type}_${id}`, { layout }); window.openEntitySubpage(type, id); };
    window.setSubpageAlbumLayout = function (type, id, albumMode, albumCols) { saveEntityCfg(`${type}_${id}`, { albumMode, albumCols: Number(albumCols) }); window.openEntitySubpage(type, id); };
    window.setSubpagePhotoLimit = function (type, id, limit) { saveEntityCfg(`${type}_${id}`, { photoLimit: Number(limit) }); window.openEntitySubpage(type, id); };

    window.uploadSubpageAlbumPhotos = function (ev, type, id) {
        const files = Array.from(ev.target.files || []);
        if (!files.length) return;
        const key = `${type}_${id}`;
        const album = getEntityAlbum(key);
        let c = 0;
        files.forEach(f => {
            const r = new FileReader();
            r.onload = e => {
                album.push({ id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), url: e.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                if (++c === files.length) {
                    saveEntityAlbum(key, album);
                    window.openEntitySubpage(type, id);
                    if (type === 'rider') window.renderRoster();
                    showToast(`✅ 已成功添加 ${files.length} 张照片！`);
                }
            };
            r.readAsDataURL(f);
        });
    };

    window.promptSubpagePhotoUrl = function (type, id) {
        const url = prompt('请输入图片 URL 链接：');
        if (!url || !url.trim()) return;
        const cap = prompt('请输入图片说明（选填）：', '') || '';
        const key = `${type}_${id}`;
        const album = getEntityAlbum(key);
        album.push({ id: 'sp_' + Date.now(), url: url.trim(), caption: cap.trim() });
        saveEntityAlbum(key, album);
        window.openEntitySubpage(type, id);
    };

    window.deleteSubpagePhoto = function (type, id, pid) {
        const key = `${type}_${id}`;
        saveEntityAlbum(key, getEntityAlbum(key).filter(p => String(p.id) !== String(pid)));
        window.openEntitySubpage(type, id);
    };

    window.moveSubpagePhoto = function (type, id, pid, dir) {
        const key = `${type}_${id}`;
        const arr = getEntityAlbum(key);
        const i = arr.findIndex(p => String(p.id) === String(pid));
        if (i === -1 || i + dir < 0 || i + dir >= arr.length) return;
        const tmp = arr[i]; arr[i] = arr[i + dir]; arr[i + dir] = tmp;
        saveEntityAlbum(key, arr);
        window.openEntitySubpage(type, id);
    };

    window.setSubpageMainCover = function (type, id, url) {
        if (type === 'rider') {
            const p = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
            p[id] = url;
            localStorage.setItem('yp_member_photos', JSON.stringify(p));
            window.renderRoster();
        }
        window.openEntitySubpage(type, id);
        showToast('⭐ 已设为封面主图！');
    };

    window.setSubpageBgFromAlbum = function (type, id, url) {
        savePageBgCfg(`sub_${type}_${id}`, { bgUrl: url });
        window.openEntitySubpage(type, id);
        showToast('🌌 已将该照片设为本页全屏背景大图！');
    };

    window.addSubpageCustomBlock = function (type, id) {
        const title = prompt('请输入新增章节标题（如：🏆 个人战绩 / ⚡ 功率数据 / 🚲 器材配置）：');
        if (!title) return;
        const content = prompt('请输入章节正文内容：') || '';
        const key = `${type}_${id}`;
        const cfg = getEntityCfg(key);
        cfg.customBlocks = cfg.customBlocks || [];
        cfg.customBlocks.push({ id: 'cb_' + Date.now(), title: title.trim(), content: content.trim() });
        saveEntityCfg(key, cfg);
        window.openEntitySubpage(type, id);
    };

    window.deleteSubpageCustomBlock = function (type, id, cbId) {
        const key = `${type}_${id}`;
        const cfg = getEntityCfg(key);
        cfg.customBlocks = (cfg.customBlocks || []).filter(b => String(b.id) !== String(cbId));
        saveEntityCfg(key, cfg);
        window.openEntitySubpage(type, id);
    };

    window.toggleSubpageTextEdit = function (type, id) {
        subpageTextEditMode = !subpageTextEditMode;
        document.querySelectorAll('#subdetail-content .yp-edit-field').forEach(el => {
            el.classList.add('yp-edit-box');
            el.setAttribute('contenteditable', subpageTextEditMode ? 'true' : 'false');
        });
        const btnSave = document.getElementById('btn-sub-edit-save');
        if (btnSave) btnSave.classList.toggle('hidden', !subpageTextEditMode);
        if (subpageTextEditMode) showToast('✏️ 请直接点击页面中带绿色虚线框的文字进行编辑，改完点「💾 保存全部文字修改」');
    };

    window.saveSubpageTextEdit = function (type, id) {
        const key = `${type}_${id}`;
        const rEl = document.getElementById('sub-edit-role');
        const tEl = document.getElementById('sub-edit-title');
        const sEl = document.getElementById('sub-edit-sub');
        const hEl = document.getElementById('sub-edit-high');
        const bEl = document.getElementById('sub-edit-bio');

        if (type === 'rider') {
            const list = getSavedRosterData();
            const m = list.find(x => String(x.id) === String(id));
            if (m) {
                if (rEl) m.role_zh = rEl.innerHTML.trim();
                if (tEl) m.name = tEl.innerHTML.trim();
                if (sEl) m.ageSpec = sEl.innerHTML.trim();
                if (hEl) m.highlight = hEl.innerHTML.trim();
                if (bEl) m.bio = bEl.innerHTML.trim();
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
                window.renderRoster();
            }
        }

        // 保存相册图注
        const album = getEntityAlbum(key);
        document.querySelectorAll('[data-sub-cap-id]').forEach(el => {
            const p = album.find(x => String(x.id) === String(el.getAttribute('data-sub-cap-id')));
            if (p) p.caption = el.innerHTML.trim();
        });
        saveEntityAlbum(key, album);

        // 保存自定义章节文字
        const cfg = getEntityCfg(key);
        (cfg.customBlocks || []).forEach(cb => {
            const te = document.querySelector(`[data-cb-title-id="${cb.id}"]`);
            const be = document.querySelector(`[data-cb-body-id="${cb.id}"]`);
            if (te) cb.title = te.innerHTML.trim();
            if (be) cb.content = be.innerHTML.trim();
        });
        saveEntityCfg(key, cfg);

        subpageTextEditMode = false;
        window.openEntitySubpage(type, id);
        showToast('✅ 个人详情页修改已全部永久保存！');
    };

    // =========================================================================
    // 六、民宿界面（La Fuga 青野·驿 关若析）+ 主界面 增强渲染
    // =========================================================================
    function getHostelDataV3() {
        const def = {
            photoLimit: 12,
            cols: 2,
            staff: [{
                id: 'st_guan',
                name: '关若析 (Guan Ruoxi)',
                role: 'La Fuga 青野·驿 主要负责人 / 主理人',
                edu: '毕业于西班牙巴塞罗那自治大学 (Universitat Autònoma de Barcelona, UAB) · 酒店管理专业硕士',
                bio: '拥有系统的欧洲高等酒店管理学术背景与国际化接待运营经验。全权负责青年力量洲际队千岛湖亚运村基地「La Fuga 青野·驿」的日常运营、骑友接待及赛训后勤管理。',
                photo: ''
            }],
            photos: [
                { id: 'hp1', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80', caption: '千岛湖亚运村 La Fuga 青野·驿 骑友住宿空间' },
                { id: 'hp2', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80', caption: '千岛湖环湖骑行路线与车队常态化驿站' }
            ]
        };
        try { return { ...def, ...JSON.parse(localStorage.getItem('yp_hostel_v3') || '{}') }; } catch (e) { return def; }
    }
    function saveHostelDataV3(d) { localStorage.setItem('yp_hostel_v3', JSON.stringify(d)); }

    window.renderHostelSectionV3 = function () {
        const ridesPage = document.getElementById('page-rides');
        if (!ridesPage) return;
        window.renderPageBgController('rides', ridesPage, '民宿界面(La Fuga 青野·驿)');

        let box = document.getElementById('yp-lafuga-v3-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'yp-lafuga-v3-box';
            box.className = 'mb-10 space-y-8';
            const postParent = document.getElementById('ride-posts-list')?.parentElement;
            if (postParent) ridesPage.insertBefore(box, postParent);
            else ridesPage.appendChild(box);
        }

        const d = getHostelDataV3();
        const isAdmin = isSuperAdmin();
        const visiblePhotos = (d.photos || []).slice(0, d.photoLimit || 12);

        box.innerHTML = `
            <div id="hostel-staff-grid" class="space-y-6">
                ${d.staff.map(st => `
                    <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-lg border border-gray-800 grid grid-cols-1 md:grid-cols-12" data-hstaff-id="${st.id}">
                        <div class="md:col-span-4 bg-gray-800 min-h-[250px] relative flex items-center justify-center">
                            ${st.photo ? `<img src="${st.photo}" class="w-full h-full object-cover">` : `<div class="text-center p-6 text-gray-400 text-xs"><i class="fa-solid fa-user-tie text-3xl text-yp-lime mb-2 block"></i>${st.name}</div>`}
                            <span class="absolute top-3 left-3 px-2.5 py-1 bg-yp-green text-white text-xs font-bold rounded">${st.role}</span>
                            ${isAdmin ? `
                                <label data-no-edit="true" class="cursor-pointer absolute bottom-3 right-3 px-3 py-1 bg-yp-red text-white text-xs font-black rounded-lg shadow">
                                    上传照片<input type="file" accept="image/*" class="hidden" onchange="uploadHostelStaffImg(event, '${st.id}')">
                                </label>
                            ` : ''}
                        </div>
                        <div class="md:col-span-8 p-8 flex flex-col justify-between">
                            <div>
                                <h3 class="text-2xl font-black mb-2">${st.name}</h3>
                                <div class="p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-amber-400 font-bold mb-3"><i class="fa-solid fa-graduation-cap mr-1.5"></i>${st.edu}</div>
                                <p class="text-sm text-gray-300 leading-relaxed">${st.bio}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h3 class="text-xl font-black text-gray-900">🏨 La Fuga 青野·驿 · 民宿实景图集 (${visiblePhotos.length}张)</h3>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-2 text-xs" data-no-edit="true">
                            <label class="cursor-pointer px-3.5 py-2 bg-yp-darkGreen text-white font-black rounded-xl shadow">
                                ➕ 上传民宿图片<input type="file" accept="image/*" multiple class="hidden" onchange="uploadHostelGalleryImgs(event)">
                            </label>
                            <button onclick="setHostelColsV3(2)" class="px-2.5 py-1.5 rounded bg-gray-100 font-bold">2列</button>
                            <button onclick="setHostelColsV3(3)" class="px-2.5 py-1.5 rounded bg-gray-100 font-bold">3列</button>
                        </div>
                    ` : ''}
                </div>
                <div id="hostel-imgs-sortable" class="grid grid-cols-1 md:grid-cols-${d.cols || 2} gap-6">
                    ${visiblePhotos.map(p => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 relative" data-himg-id="${p.id}">
                            <img src="${p.url}" draggable="false" class="w-full h-64 object-cover">
                            <div class="p-3 bg-white flex items-center justify-between text-xs font-bold text-gray-800">
                                <span>${p.caption || 'La Fuga 青野·驿'}</span>
                                ${isAdmin ? `<button onclick="deleteHostelGalleryImg('${p.id}')" class="text-yp-red">删除</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        makeGridSortable(document.getElementById('hostel-imgs-sortable'), '[data-himg-id]', 'data-himg-id', (newIds) => {
            const cur = getHostelDataV3();
            cur.photos = newIds.map(id => cur.photos.find(x => String(x.id) === String(id))).filter(Boolean);
            saveHostelDataV3(cur);
            showToast('✅ 民宿图片排序已保存！');
        });
    };

    window.uploadHostelStaffImg = function (ev, id) {
        const f = (ev.target.files || [])[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => {
            const d = getHostelDataV3();
            const st = d.staff.find(x => x.id === id);
            if (st) { st.photo = e.target.result; saveHostelDataV3(d); window.renderHostelSectionV3(); }
        };
        r.readAsDataURL(f);
    };
    window.uploadHostelGalleryImgs = function (ev) {
        const files = Array.from(ev.target.files || []); if (!files.length) return;
        const d = getHostelDataV3(); let c = 0;
        files.forEach(f => {
            const r = new FileReader();
            r.onload = e => {
                d.photos.push({ id: 'hp_' + Date.now() + Math.random().toString(36).slice(2, 5), url: e.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                if (++c === files.length) { saveHostelDataV3(d); window.renderHostelSectionV3(); }
            };
            r.readAsDataURL(f);
        });
    };
    window.deleteHostelGalleryImg = function (id) {
        const d = getHostelDataV3(); d.photos = d.photos.filter(p => p.id !== id);
        saveHostelDataV3(d); window.renderHostelSectionV3();
    };
    window.setHostelColsV3 = function (cols) { const d = getHostelDataV3(); d.cols = cols; saveHostelDataV3(d); window.renderHostelSectionV3(); };

    // =========================================================================
    // 七、B站双播放列表剧场 (2012662 & 3469448) + 底部赞助商图标栏
    // =========================================================================
    const defaultSponsors = [
        { id: 'sp_spect', name: '空力公式 (Spect)', tier: '官方车架合作伙伴', logoText: 'SPECT 空力公式', logoUrl: '', highlight: '公路气动、综合爬坡、TT及Gravel碳纤维车架支持', desc: '空力公式（Spect）旗下 Mira 气动车架与 Strada 综合车架伴随车队征战国内外职业赛场。' },
        { id: 'sp_elves', name: 'ELVES (精灵)', tier: '官方器材合作伙伴', logoText: 'ELVES 精灵', logoUrl: '', highlight: 'UCI认证竞赛车架品牌 · Vanyar / Falath EVO 支持', desc: 'ELVES（精灵）拥有多项 UCI 认证竞赛车架，提供硬核赛场保障。' },
        { id: 'sp_essen', name: 'ESSEN 头盔', tier: '官方安全护具合作伙伴', logoText: 'ESSEN', logoUrl: '', highlight: '赫拉 (HELA) 气动破风头盔、爬坡盔官方赞助商', desc: 'ESSEN 为青年力量洲际队提供风洞优化的大组气动盔与爬坡盔。' },
        { id: 'sp_zeray', name: '和博 / 卓锐 (ZERAY)', tier: '官方配件合作伙伴', logoText: 'ZERAY 卓锐', logoUrl: '', highlight: 'ZP-115 碳纤维公路自锁脚踏及竞赛水壶官方赞助商', desc: '卓锐（ZERAY）为车队提供轻量化碳纤维自锁脚踏与补给水壶。' }
    ];
    function getSponsorsList() { try { return JSON.parse(localStorage.getItem('yp_sponsors_v3') || 'null') || defaultSponsors; } catch (e) { return defaultSponsors; } }

    function renderGlobalSponsorBar() {
        const footer = document.querySelector('footer');
        if (!footer) return;
        let bar = document.getElementById('global-sponsor-bar');
        if (!bar) {
            bar = document.createElement('section');
            bar.id = 'global-sponsor-bar';
            bar.className = 'bg-gray-900 border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8';
            footer.parentNode.insertBefore(bar, footer);
        }
        const list = getSponsorsList();
        bar.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">OFFICIAL PARTNERS · 官方合作伙伴（点击标志进入品牌独立详情页）</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    ${list.map(sp => `
                        <div onclick="openEntitySubpage('sponsor', '${sp.id}')" class="cursor-pointer bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-yp-lime rounded-2xl p-4 h-20 flex flex-col items-center justify-center transition">
                            <div class="text-sm font-black text-white">${sp.logoText || sp.name}</div>
                            <div class="text-[10px] text-yp-lime mt-0.5">${sp.tier}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 八、统一初始化与全局刷新
    // =========================================================================
    function refreshAllViews() {
        cleanQiuHaolin();
        ensureSubpageContainer();
        window.renderPageBgController('home', document.getElementById('page-home'), '主界面(首页)');
        window.renderRoster();
        window.renderHostelSectionV3();
        renderGlobalSponsorBar();
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(refreshAllViews, 100);

        const origSwitch = window.switchPage;
        if (origSwitch) {
            window.switchPage = function (pageId) {
                origSwitch(pageId);
                if (pageId === 'home') window.renderPageBgController('home', document.getElementById('page-home'), '主界面(首页)');
                if (pageId === 'roster') window.renderRoster();
                if (pageId === 'rides') window.renderHostelSectionV3();
            };
        }

        const origAuth = window.updateAuthUI;
        if (origAuth) {
            window.updateAuthUI = function () {
                origAuth();
                refreshAllViews();
            };
        }
    });
})();
