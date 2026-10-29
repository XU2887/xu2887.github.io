/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 去重整合终极单文件插件 (custom-update.js)
 * 说明：本文件已完整合并原 custom-update.js + update-02.js + update-03.js 的全部功能并彻底剔除重复代码，零断点无需拼接！
 * 核心功能清单：
 * 1. 【SHA-256 加密登录协同】：与加密版 index.html 完美配合，支持 team_youthpower@outlook.com 安全登录
 * 2. 【全站页面背景图与遮罩控制器】：主界面、民宿页、成员列表页、每个成员/商品/赞助商独立详情页均支持上传背景图、调节遮罩暗度(0~95%)与4种色调
 * 3. 【成员列表与每个成员单独的个人详情页】：醒目的“➕添加队员/工作人员”按钮、卡片拖动排序；个人详情页支持直接改字、增删自定义模块、批量传图、限制图片展示数量、切换5种主页布局与4种相册版式
 * 4. 【主界面 & 民宿界面(青野·驿 关若析)全面编辑】：主界面首屏背景更换、焦点照片墙、新增/删减/拖动模块；民宿页关若析(UAB酒店管理硕士)团队与设施模块增删、实景图集管理
 * 5. 【商品独立详情页 + 底部赞助商Logo栏 + 赞助商名录与独立详情页】
 * 6. 【B站双播放列表剧场 (2012662 & 3469448)】：单一活跃播放器杜绝双重背景音，支持3秒批量导入真实列表视频与URL直播
 * 7. 【中/英/西三语精译 + 微软神经网络翻译引擎】
 */

(function () {
    'use strict';

    if (window.__YP_UNIFIED_LOADED__) return;
    window.__YP_UNIFIED_LOADED__ = true;
    window.__ypLang = 'zh';

    const ADMIN_EMAIL = 'team_youthpower@outlook.com';
    const BILI_UID = '4502039';
    const LIST_ID_1 = '2012662';
    const LIST_ID_2 = '3469448';

    function isSuperAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) { return false; }
    }

    // 注入全局拖拽与可编辑高亮样式（仅注入1次）
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .yp-sortable { user-select: none; transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
        .yp-sortable img { -webkit-user-drag: none; user-select: none; pointer-events: none; }
        .yp-dragging { opacity: 0.4 !important; transform: scale(0.98) !important; outline: 3px dashed #76c729 !important; }
        .yp-drag-over { outline: 3px solid #1db954 !important; transform: scale(1.01); }
        .yp-editable[contenteditable="true"] {
            outline: 2px dashed #76c729 !important; outline-offset: 3px;
            background-color: rgba(118, 199, 41, 0.15) !important; border-radius: 6px; padding: 2px 6px; cursor: text;
        }
        .yp-editable[contenteditable="true"]:focus {
            outline: 2px solid #1db954 !important; background-color: rgba(17, 24, 39, 0.92) !important; color: #fff !important;
        }
    `;
    document.head.appendChild(styleEl);

    // 清理旧版邱皓麟数据
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
    // 一、唯一通用丝滑拖拽排序引擎 (Live DOM Swap)
    // =========================================================================
    function bindSortable(containerEl, itemSelector, idAttr, onOrderSaved) {
        if (!containerEl || !isSuperAdmin()) return;
        let dragEl = null;
        const items = Array.from(containerEl.querySelectorAll(itemSelector));

        items.forEach(item => {
            item.classList.add('yp-sortable');
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
                containerEl.querySelectorAll(itemSelector).forEach(el => el.classList.remove('yp-drag-over'));
                dragEl = null;
                const orderedIds = Array.from(containerEl.querySelectorAll(itemSelector)).map(el => el.getAttribute(idAttr));
                if (onOrderSaved) onOrderSaved(orderedIds);
            };

            item.ondragover = function (e) {
                e.preventDefault(); e.stopPropagation();
                if (!dragEl || dragEl === this || dragEl.parentNode !== this.parentNode) return;
                this.classList.add('yp-drag-over');
                const siblings = Array.from(containerEl.querySelectorAll(itemSelector));
                if (siblings.indexOf(dragEl) < siblings.indexOf(this)) {
                    containerEl.insertBefore(dragEl, this.nextSibling);
                } else {
                    containerEl.insertBefore(dragEl, this);
                }
            };

            item.ondragleave = function () { this.classList.remove('yp-drag-over'); };
            item.ondrop = function (e) { e.preventDefault(); e.stopPropagation(); this.classList.remove('yp-drag-over'); };
        });
    }

    // =========================================================================
    // 二、唯一页面级「背景图选择 + 遮罩浓度滑块(0~95%) + 遮罩色调」控制器
    // =========================================================================
    function getPageBgCfg(pageKey) {
        const def = { bgUrl: '', opacity: 70, tint: 'dark', fixed: true };
        try {
            const all = JSON.parse(localStorage.getItem('yp_unified_page_bgs') || '{}');
            return { ...def, ...(all[pageKey] || {}) };
        } catch (e) { return def; }
    }

    function savePageBgCfg(pageKey, cfg) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_unified_page_bgs') || '{}');
            all[pageKey] = { ...getPageBgCfg(pageKey), ...cfg };
            localStorage.setItem('yp_unified_page_bgs', JSON.stringify(all));
        } catch (e) {}
    }

    function buildOverlayGradient(tint, opacityPct) {
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
            containerEl.style.backgroundImage = `${buildOverlayGradient(cfg.tint, cfg.opacity)}, url('${cfg.bgUrl}')`;
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
                        <i class="fa-solid fa-image"></i><span>上传背景图</span>
                        <input type="file" accept="image/*" class="hidden" onchange="ypUploadBgFile(event, '${pageKey}')">
                    </label>
                    <button onclick="ypPromptBgUrl('${pageKey}')" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold rounded-lg">🔗 背景URL</button>
                    <div class="flex items-center space-x-1.5 bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700">
                        <span>遮罩暗度: <strong id="bg-op-txt-${pageKey}" class="text-yp-lime">${cfg.opacity}%</strong></span>
                        <input type="range" min="0" max="95" step="5" value="${cfg.opacity}" oninput="ypChangeBgOpacity('${pageKey}', this.value)" class="w-20 accent-yp-lime cursor-pointer">
                    </div>
                    <select onchange="ypChangeBgTint('${pageKey}', this.value)" class="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-white font-bold">
                        <option value="dark" ${cfg.tint === 'dark' ? 'selected' : ''}>色调：暗黑</option>
                        <option value="green" ${cfg.tint === 'green' ? 'selected' : ''}>色调：竞速绿</option>
                        <option value="navy" ${cfg.tint === 'navy' ? 'selected' : ''}>色调：深海蓝</option>
                        <option value="warm" ${cfg.tint === 'warm' ? 'selected' : ''}>色调：暖金</option>
                    </select>
                    <button onclick="ypToggleBgFixed('${pageKey}')" class="px-2.5 py-1.5 rounded-lg border ${cfg.fixed ? 'border-yp-lime text-yp-lime' : 'border-gray-700 text-gray-400'} bg-gray-800 font-bold">
                        ${cfg.fixed ? '📌 固定视差' : '📜 随页滚动'}
                    </button>
                    ${cfg.bgUrl ? `<button onclick="ypClearBg('${pageKey}')" class="px-2 py-1 text-red-400 hover:underline font-bold">清除背景</button>` : ''}
                </div>
            </div>
        `;
    };

    window.ypUploadBgFile = function (ev, pageKey) {
        const f = (ev.target.files || [])[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => { savePageBgCfg(pageKey, { bgUrl: e.target.result }); refreshBgTarget(pageKey); showToast('✅ 页面背景大图已更新！'); };
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
    window.ypToggleBgFixed = function (pageKey) { savePageBgCfg(pageKey, { fixed: !getPageBgCfg(pageKey).fixed }); refreshBgTarget(pageKey); };
    window.ypClearBg = function (pageKey) { savePageBgCfg(pageKey, { bgUrl: '' }); refreshBgTarget(pageKey); };

    function refreshBgTarget(pageKey) {
        if (pageKey === 'home') window.renderPageBgController('home', document.getElementById('page-home'), '主界面(首页)');
        else if (pageKey === 'rides') window.renderPageBgController('rides', document.getElementById('page-rides'), '民宿界面(青野·驿)');
        else if (pageKey === 'roster') window.renderPageBgController('roster', document.getElementById('page-roster'), '成员列表页');
        else if (pageKey.startsWith('sub_')) {
            const parts = pageKey.split('_');
            window.openEntitySubpage(parts[1], parts.slice(2).join('_'));
        }
    }

    // =========================================================================
    // 三、主界面 (page-home) 全能编辑：首屏背景 + 焦点照片墙 + 自定义模块增删与拖动排序
    // =========================================================================
    const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1920&q=80';
    function getHomeCfg() {
        const def = {
            heroBg: DEFAULT_HERO_BG, heroOverlay: 'standard',
            showPhotos: true, photoCols: 3, photoLimit: 9,
            photos: [
                { id: 'hp1', url: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=900&q=80', caption: '全国U系列公路自行车锦标赛夺冠时刻' },
                { id: 'hp2', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80', caption: '青年力量洲际队海内外赛场突围瞬间' },
                { id: 'hp3', url: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80', caption: '科学功率训练体系与洲际队战车展示' }
            ],
            blocks: [], secOrder: []
        };
        try { return { ...def, ...JSON.parse(localStorage.getItem('yp_home_unified_cfg') || '{}') }; } catch (e) { return def; }
    }
    function saveHomeCfg(cfg) { localStorage.setItem('yp_home_unified_cfg', JSON.stringify({ ...getHomeCfg(), ...cfg })); }

    window.renderHomeAll = function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;
        const isAdmin = isSuperAdmin();
        const cfg = getHomeCfg();

        window.renderPageBgController('home', homePage, '主界面(首页)');

        // 1. 首屏 Hero 背景与遮罩
        const heroSec = homePage.querySelector('section.hero-bg');
        if (heroSec) {
            heroSec.setAttribute('data-hsec-id', 'sec_hero');
            let grad = 'linear-gradient(105deg, rgba(17,24,39,0.95) 0%, rgba(17,24,39,0.82) 55%, rgba(18,140,59,0.72) 100%), ';
            if (cfg.heroOverlay === 'light') grad = 'linear-gradient(105deg, rgba(17,24,39,0.65) 0%, rgba(17,24,39,0.4) 55%, rgba(18,140,59,0.3) 100%), ';
            if (cfg.heroOverlay === 'dark') grad = 'linear-gradient(105deg, rgba(17,24,39,0.98) 0%, rgba(17,24,39,0.92) 60%, rgba(17,24,39,0.88) 100%), ';
            if (cfg.heroOverlay === 'none') grad = 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%), ';
            heroSec.style.background = `${grad}url('${cfg.heroBg || DEFAULT_HERO_BG}') center/cover no-repeat`;

            let heroBar = document.getElementById('yp-hero-admin-bar');
            if (!isAdmin) { if (heroBar) heroBar.remove(); }
            else {
                if (!heroBar) {
                    heroBar = document.createElement('div');
                    heroBar.id = 'yp-hero-admin-bar';
                    heroBar.setAttribute('data-no-edit', 'true');
                    heroBar.className = 'relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 -mt-6';
                    heroSec.insertBefore(heroBar, heroSec.firstChild);
                }
                heroBar.innerHTML = `
                    <div class="p-3.5 rounded-2xl bg-gray-900/95 border-2 border-yp-lime text-white shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded">首屏巨幕背景 & 首页模块管理</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <label class="cursor-pointer px-3 py-1.5 bg-yp-green text-white font-black rounded-lg">
                                📷 换首屏背景图<input type="file" accept="image/*" class="hidden" onchange="uploadHeroBgImg(event)">
                            </label>
                            <select onchange="setHeroOverlayMode(this.value)" class="rounded-lg bg-gray-800 border border-gray-600 px-2 py-1.5 text-white font-bold">
                                <option value="light" ${cfg.heroOverlay === 'light' ? 'selected' : ''}>首屏遮罩：明亮</option>
                                <option value="standard" ${cfg.heroOverlay === 'standard' ? 'selected' : ''}>首屏遮罩：标准绿</option>
                                <option value="dark" ${cfg.heroOverlay === 'dark' ? 'selected' : ''}>首屏遮罩：深暗</option>
                                <option value="none" ${cfg.heroOverlay === 'none' ? 'selected' : ''}>首屏遮罩：无渐变</option>
                            </select>
                            <button onclick="addHomeBlockPrompt()" class="px-3 py-1.5 bg-amber-400 text-gray-900 font-black rounded-lg shadow">➕ 新增首页图文模块</button>
                        </div>
                    </div>
                `;
            }
        }

        // 2. 首页焦点照片墙
        let showcaseSec = document.getElementById('home-photo-showcase-sec');
        if (!showcaseSec) {
            showcaseSec = document.createElement('section');
            showcaseSec.id = 'home-photo-showcase-sec';
            showcaseSec.setAttribute('data-hsec-id', 'sec_showcase');
            if (heroSec && heroSec.nextSibling) homePage.insertBefore(showcaseSec, heroSec.nextSibling);
            else homePage.appendChild(showcaseSec);
        }
        const visiblePhotos = (cfg.photos || []).slice(0, cfg.photoLimit || 9);
        if (!cfg.showPhotos && !isAdmin) {
            showcaseSec.className = 'hidden'; showcaseSec.innerHTML = '';
        } else {
            showcaseSec.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10';
            const hCls = cfg.photoCols == 1 ? 'h-[420px]' : (cfg.photoCols == 2 ? 'h-80' : 'h-60');
            showcaseSec.innerHTML = `
                ${isAdmin ? `
                    <div data-no-edit="true" class="mb-4 p-3.5 rounded-2xl bg-gray-900 text-white border border-yp-lime flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span class="font-bold text-yp-lime">✥ 主界面照片墙（可按住拖动照片排序，或拖动整个模块上下换位）：</span>
                        <div class="flex flex-wrap items-center gap-2">
                            <label class="cursor-pointer px-3 py-1 bg-yp-green text-white font-black rounded-lg">➕ 批量传图<input type="file" accept="image/*" multiple class="hidden" onchange="uploadHomePhotos(event)"></label>
                            <select onchange="setHomePhotoLimit(this.value)" class="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white">
                                <option value="3" ${cfg.photoLimit == 3 ? 'selected' : ''}>最多3张</option>
                                <option value="6" ${cfg.photoLimit == 6 ? 'selected' : ''}>最多6张</option>
                                <option value="99" ${cfg.photoLimit >= 9 ? 'selected' : ''}>全部显示</option>
                            </select>
                            <button onclick="setHomePhotoCols(1)" class="px-2 py-1 rounded ${cfg.photoCols == 1 ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800'}">1列</button>
                            <button onclick="setHomePhotoCols(2)" class="px-2 py-1 rounded ${cfg.photoCols == 2 ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800'}">2列</button>
                            <button onclick="setHomePhotoCols(3)" class="px-2 py-1 rounded ${cfg.photoCols == 3 ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800'}">3列</button>
                            <button onclick="toggleHomePhotosShow()" class="px-2 py-1 rounded border border-gray-600">${cfg.showPhotos ? '👁️ 显示中' : '🚫 已隐藏'}</button>
                        </div>
                    </div>
                ` : ''}
                <div id="home-photos-sortable" class="grid grid-cols-1 md:grid-cols-${cfg.photoCols || 3} gap-6">
                    ${visiblePhotos.map(p => `
                        <div class="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-xs relative group" data-hphoto-id="${p.id}">
                            <div class="${hCls} bg-gray-900 overflow-hidden relative">
                                <img src="${p.url}" draggable="false" class="w-full h-full object-cover">
                                ${isAdmin ? `
                                    <div data-no-edit="true" class="absolute top-2 right-2 flex gap-1">
                                        <button onclick="editHomePhotoCap('${p.id}')" class="px-2 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded">改字</button>
                                        <button onclick="deleteHomePhoto('${p.id}')" class="w-6 h-6 bg-yp-red text-white text-xs font-bold rounded">✕</button>
                                    </div>
                                ` : ''}
                            </div>
                            ${p.caption ? `<div class="p-3 text-xs font-bold text-gray-800">${p.caption}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            bindSortable(document.getElementById('home-photos-sortable'), '[data-hphoto-id]', 'data-hphoto-id', (ids) => {
                const c = getHomeCfg();
                c.photos = ids.map(id => c.photos.find(x => String(x.id) === String(id))).filter(Boolean);
                saveHomeCfg({ photos: c.photos });
            });
        }

        // 3. 渲染首页自定义新增模块
        document.querySelectorAll('.yp-home-custom-blk').forEach(el => el.remove());
        (cfg.blocks || []).forEach(b => {
            const sec = document.createElement('section');
            sec.className = 'yp-home-custom-blk max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10';
            sec.setAttribute('data-hsec-id', b.id);
            sec.innerHTML = `
                <div class="bg-white/95 backdrop-blur-md rounded-3xl p-8 border border-gray-200 shadow-sm">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="yp-editable text-2xl font-black text-gray-900">${b.title}</h3>
                        ${isAdmin ? `<button onclick="deleteHomeBlock('${b.id}')" data-no-edit="true" class="px-3 py-1 bg-yp-red text-white text-xs font-bold rounded-lg">🗑️ 删除模块</button>` : ''}
                    </div>
                    <div class="yp-editable text-sm text-gray-600 leading-relaxed whitespace-pre-line">${b.content}</div>
                </div>
            `;
            homePage.appendChild(sec);
        });

        // 标记原有的愿景模块并绑定首页大模块拖动排序
        Array.from(homePage.querySelectorAll(':scope > section')).forEach(sec => {
            if (!sec.getAttribute('data-hsec-id')) sec.setAttribute('data-hsec-id', 'sec_vision');
        });
        if (cfg.secOrder && cfg.secOrder.length > 0) {
            cfg.secOrder.forEach(sid => {
                const n = homePage.querySelector(`[data-hsec-id="${sid}"]`);
                if (n) homePage.appendChild(n);
            });
        }
        bindSortable(homePage, ':scope > section[data-hsec-id]', 'data-hsec-id', (ids) => {
            saveHomeCfg({ secOrder: ids });
            showToast('✅ 主界面模块上下顺序已保存！');
        });
    };

    window.uploadHeroBgImg = function (ev) {
        const f = (ev.target.files || [])[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => { saveHomeCfg({ heroBg: e.target.result }); window.renderHomeAll(); showToast('✅ 首屏背景已更换！'); };
        r.readAsDataURL(f);
    };
    window.setHeroOverlayMode = function (m) { saveHomeCfg({ heroOverlay: m }); window.renderHomeAll(); };
    window.uploadHomePhotos = function (ev) {
        const files = Array.from(ev.target.files || []); if (!files.length) return;
        const c = getHomeCfg(); let k = 0;
        files.forEach(f => {
            const r = new FileReader();
            r.onload = e => {
                c.photos.push({ id: 'hp_' + Date.now() + Math.random().toString(36).slice(2, 5), url: e.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                if (++k === files.length) { saveHomeCfg({ photos: c.photos }); window.renderHomeAll(); }
            };
            r.readAsDataURL(f);
        });
    };
    window.editHomePhotoCap = function (id) {
        const c = getHomeCfg(); const item = c.photos.find(p => String(p.id) === String(id)); if (!item) return;
        const txt = prompt('修改说明文字：', item.caption || '');
        if (txt !== null) { item.caption = txt.trim(); saveHomeCfg({ photos: c.photos }); window.renderHomeAll(); }
    };
    window.deleteHomePhoto = function (id) {
        const c = getHomeCfg(); saveHomeCfg({ photos: c.photos.filter(p => String(p.id) !== String(id)) }); window.renderHomeAll();
    };
    window.setHomePhotoCols = function (cols) { saveHomeCfg({ photoCols: Number(cols) }); window.renderHomeAll(); };
    window.setHomePhotoLimit = function (lim) { saveHomeCfg({ photoLimit: Number(lim) }); window.renderHomeAll(); };
    window.toggleHomePhotosShow = function () { saveHomeCfg({ showPhotos: !getHomeCfg().showPhotos }); window.renderHomeAll(); };
    window.addHomeBlockPrompt = function () {
        const t = prompt('请输入新增首页模块标题：', '车队最新专栏'); if (!t) return;
        const body = prompt('请输入正文内容：', '') || '';
        const c = getHomeCfg(); c.blocks.push({ id: 'hblk_' + Date.now(), title: t.trim(), content: body.trim() });
        saveHomeCfg({ blocks: c.blocks }); window.renderHomeAll();
    };
    window.deleteHomeBlock = function (id) {
        const c = getHomeCfg(); saveHomeCfg({ blocks: c.blocks.filter(b => b.id !== id) }); window.renderHomeAll();
    };

    // =========================================================================
    // 四、成员介绍界面 (page-roster) + 每个成员/商品/赞助商单独的【个人独立详情页】
    // =========================================================================
    function getEntityAlbum(key) {
        try { return JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}')[key] || []; } catch (e) { return []; }
    }
    function saveEntityAlbum(key, arr) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}');
            all[key] = arr; localStorage.setItem('yp_entity_albums_v4', JSON.stringify(all));
        } catch (e) {}
    }
    function getEntityCfg(key) {
        const def = { layout: 'classic', albumMode: 'grid', albumCols: 3, photoLimit: 99, customBlocks: [] };
        try { return { ...def, ...(JSON.parse(localStorage.getItem('yp_entity_cfg_v4') || '{}')[key] || {}) }; } catch (e) { return def; }
    }
    function saveEntityCfg(key, cfg) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_cfg_v4') || '{}');
            all[key] = { ...getEntityCfg(key), ...cfg }; localStorage.setItem('yp_entity_cfg_v4', JSON.stringify(all));
        } catch (e) {}
    }

    window.moveRosterCard = function (id, dir) {
        const list = getSavedRosterData(); const i = list.findIndex(r => String(r.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list)); window.renderRoster();
    };
    window.deleteRosterCard = function (id) {
        if (!isSuperAdmin() || !confirm('确定删除该成员档案吗？')) return;
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(getSavedRosterData().filter(r => String(r.id) !== String(id))));
        window.renderRoster(); showToast('🗑️ 已删除该成员');
    };
    window.setRosterCols = function (cols) { localStorage.setItem('yp_roster_cols_v4', String(cols)); window.renderRoster(); };

    window.renderRoster = function () {
        const rosterPage = document.getElementById('page-roster');
        const grid = document.getElementById('roster-grid');
        if (!grid || !rosterPage) return;

        window.renderPageBgController('roster', rosterPage, '成员介绍界面');
        const isAdmin = isSuperAdmin();
        const cols = localStorage.getItem('yp_roster_cols_v4') || '3';
        grid.className = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7`;

        let topBar = document.getElementById('yp-roster-admin-bar');
        if (!isAdmin) { if (topBar) topBar.remove(); }
        else {
            if (!topBar) {
                topBar = document.createElement('div');
                topBar.id = 'yp-roster-admin-bar';
                topBar.setAttribute('data-no-edit', 'true');
                topBar.className = 'mb-7 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs';
                grid.parentNode.insertBefore(topBar, grid);
            }
            topBar.innerHTML = `
                <div class="flex flex-wrap items-center gap-3">
                    <button onclick="openQuickAddMemberModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                        <i class="fa-solid fa-user-plus"></i><span>➕ 添加队员 / 工作人员</span>
                    </button>
                    <span class="text-yp-lime font-bold">✥ 按住任意卡片可直接【拖动排序】；点击下方绿色按钮可进入【个人独立详情页】编辑多图与排版！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行人数：</span>
                    <button onclick="setRosterCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">2人</button>
                    <button onclick="setRosterCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">3人</button>
                    <button onclick="setRosterCols(4)" class="px-3 py-1.5 rounded-lg ${cols == '4' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">4人</button>
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
                                    <div class="w-16 h-16 rounded-full bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2 text-yp-lime"><i class="fa-solid fa-user-plus text-2xl"></i></div>
                                    <span class="text-xs text-gray-400 font-bold block">点击进入个人详情页上传照片</span>
                                </div>
                            `}
                            <span class="roster-role absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${m.role_zh || m.role || '车队成员'}</span>
                            <span class="absolute top-3 right-3 text-lg">${m.flag || '🇨🇳'}</span>
                            ${isAdmin ? `
                                <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                    <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                    <button onclick="moveRosterCard('${m.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">◀</button>
                                    <button onclick="moveRosterCard('${m.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">▶</button>
                                </div>
                                <button onclick="event.stopPropagation();triggerMemberPhotoUpload('${m.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red text-white text-[11px] font-black rounded-lg shadow">📷 换封面</button>
                            ` : ''}
                        </div>
                        <div class="p-6">
                            <div class="roster-agespec text-xs text-gray-400 mb-1">${m.ageSpec || ''}</div>
                            <h3 onclick="openEntitySubpage('rider', '${m.id}')" class="roster-name text-2xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${m.name}</h3>
                            <div class="roster-highlight p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${m.highlight || ''}</div>
                            <div class="roster-bio text-xs text-gray-300 leading-relaxed space-y-1.5 line-clamp-4">${m.bio || ''}</div>
                        </div>
                    </div>
                    <div data-no-edit="true" class="p-4 bg-gray-900/90 border-t border-gray-700 flex items-center justify-between gap-2">
                        <button onclick="openEntitySubpage('rider', '${m.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5">
                            <i class="fa-solid fa-id-card"></i><span>👤 进入个人独立详情页 (${album.length}图)</span><i class="fa-solid fa-arrow-right"></i>
                        </button>
                        ${isAdmin ? `<button onclick="deleteRosterCard('${m.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        bindSortable(grid, '[data-roster-id]', 'data-roster-id', (newIds) => {
            const cur = getSavedRosterData();
            const ordered = newIds.map(id => cur.find(r => String(r.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(ordered));
                showToast('✅ 成员排列顺序已保存！');
            }
        });
    };

    // 快捷添加成员弹窗
    window.openQuickAddMemberModal = function () {
        let m = document.getElementById('yp-quick-member-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-quick-member-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            m.innerHTML = `
                <div onclick="document.getElementById('yp-quick-member-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
                <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                    <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                        <h3 class="text-lg font-black text-yp-lime">➕ 添加新车队成员 / 工作人员</h3>
                        <button onclick="document.getElementById('yp-quick-member-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitQuickAddMember(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-3 gap-3">
                            <div><label class="block font-bold mb-1">姓名 *</label><input type="text" id="qm-name" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">职务/角色 *</label><input type="text" id="qm-role" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">旗帜</label><input type="text" id="qm-flag" value="🇨🇳" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">年龄与特点 *</label><input type="text" id="qm-age" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">高光头衔 *</label><input type="text" id="qm-high" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">上传封面照（可选）</label><input type="file" id="qm-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold mb-1">详细履历介绍 *</label><textarea id="qm-bio" required rows="3" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 保存并生成个人独立主页</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitQuickAddMember = function (e) {
        e.preventDefault();
        const name = document.getElementById('qm-name').value.trim();
        const role = document.getElementById('qm-role').value.trim();
        const flag = document.getElementById('qm-flag').value.trim() || '🇨🇳';
        const ageSpec = document.getElementById('qm-age').value.trim();
        const highlight = document.getElementById('qm-high').value.trim();
        const bio = document.getElementById('qm-bio').value.trim();
        const f = document.getElementById('qm-file').files[0];
        const save = (photo) => {
            const list = getSavedRosterData();
            list.push({ id: 'm_' + Date.now(), role_zh: role, role_en: role, role_es: role, name, flag, ageSpec, highlight, bio, photo: photo || '' });
            localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
            window.renderRoster(); e.target.reset();
            document.getElementById('yp-quick-member-modal').classList.add('hidden');
            showToast(`✅ 已添加成员：${name}`);
        };
        if (f) { const r = new FileReader(); r.onload = ev => save(ev.target.result); r.readAsDataURL(f); } else save('');
    };

    // 统一独立详情页引擎（支持队员 rider / 商品 product / 赞助商 sponsor）
    let subEditActive = false;
    window.openEntitySubpage = function (type, id) {
        const main = document.getElementById('editable-main');
        let sec = document.getElementById('page-subdetail');
        if (!sec) {
            sec = document.createElement('div');
            sec.id = 'page-subdetail';
            sec.className = 'page-section min-h-[85vh] pb-16';
            sec.innerHTML = `<div id="subdetail-content" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"></div>`;
            main.appendChild(sec);
        }
        const box = document.getElementById('subdetail-content');
        const isAdmin = isSuperAdmin();
        const key = `${type}_${id}`;
        const cfg = getEntityCfg(key);
        const album = getEntityAlbum(key);
        const visibleAlbum = album.slice(0, cfg.photoLimit || 99);
        subEditActive = false;

        let backPage = 'roster', backLabel = '返回 2027 队员介绍列表';
        let roleTag = '', titleName = '', subInfo = '', highText = '', bioHtml = '', mainImg = '', flagIcon = '', actionHtml = '';

        if (type === 'rider') {
            const m = getSavedRosterData().find(r => String(r.id) === String(id));
            if (!m) return;
            const photos = getSavedMemberPhotos();
            roleTag = m.role_zh || m.role || '车队成员'; titleName = m.name; subInfo = m.ageSpec || '';
            highText = m.highlight || ''; bioHtml = m.bio || ''; flagIcon = m.flag || '🇨🇳';
            mainImg = photos[m.id] || m.photo || (album[0]?.url || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80');
        } else if (type === 'product' && typeof products !== 'undefined') {
            backPage = 'shop'; backLabel = '返回官方器材商城';
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            roleTag = p.brand; titleName = p.name; subInfo = `官方同步售价：¥${p.price}`;
            highText = p.badge || '官方正品'; bioHtml = p.desc || '';
            mainImg = p.imgUrl || (album[0]?.url || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1000&q=80');
            actionHtml = `<div class="mt-6 pt-4 border-t border-gray-700 flex items-center justify-between" data-no-edit="true"><div class="text-2xl font-black text-yp-lime">¥<span id="sub-edit-price" class="yp-editable">${p.price}</span></div><button onclick="addToCart(${p.id})" class="px-5 py-2.5 bg-yp-green text-white font-black rounded-xl text-xs">加入购物车</button></div>`;
        } else if (type === 'sponsor') {
            backPage = 'partners'; backLabel = '返回赞助商名录';
            const sp = getSponsorsList().find(x => String(x.id) === String(id));
            if (!sp) return;
            roleTag = sp.tier; titleName = sp.name; subInfo = sp.logoText || sp.name;
            highText = sp.highlight; bioHtml = sp.desc;
            mainImg = sp.logoUrl || (album[0]?.url || 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1000&q=80');
        }

        window.renderPageBgController(`sub_${type}_${id}`, sec, `${titleName} · 独立详情页`);

        const infoHtml = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span id="sub-edit-role" class="yp-editable px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${roleTag}</span>
                    <span class="text-2xl">${flagIcon}</span>
                </div>
                <h2 id="sub-edit-title" class="yp-editable text-3xl sm:text-4xl font-black text-white mb-1">${titleName}</h2>
                <p id="sub-edit-sub" class="yp-editable text-xs text-gray-300 mb-4">${subInfo}</p>
                <div id="sub-edit-high" class="yp-editable p-3.5 rounded-xl bg-gray-800/90 border border-gray-700 text-xs text-yp-lime font-bold mb-5">${highText}</div>
                <div id="sub-edit-bio" class="yp-editable text-sm text-gray-100 leading-relaxed space-y-2">${bioHtml}</div>
                ${actionHtml}
            </div>
        `;

        const renderPic = (p, span = '', h = 'h-64') => `
            <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-md relative flex flex-col justify-between ${span}" data-sub-pid="${p.id}">
                <div class="${h} w-full overflow-hidden bg-black relative">
                    <img src="${p.url}" draggable="false" class="w-full h-full object-cover">
                    ${isAdmin ? `
                        <div data-no-edit="true" class="absolute top-2 left-2 flex gap-1">
                            <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded cursor-grab">✥ 拖动</span>
                        </div>
                        <div data-no-edit="true" class="absolute top-2 right-2 flex gap-1">
                            <button onclick="setSubMainCover('${type}','${id}','${p.url}')" class="px-2 py-0.5 bg-yp-green text-white text-[10px] font-bold rounded">设为主图</button>
                            <button onclick="setSubPageBg('${type}','${id}','${p.url}')" class="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded">🌌 设为背景</button>
                            <button onclick="delSubPhoto('${type}','${id}','${p.id}')" class="w-6 h-6 bg-yp-red text-white text-xs font-bold rounded">✕</button>
                        </div>
                    ` : ''}
                </div>
                <div class="p-3 bg-gray-900 text-xs font-bold text-gray-200 border-t border-gray-800">
                    <div class="yp-editable" data-sub-cap="${p.id}">${p.caption || '图片说明（开启编辑后可点击修改）'}</div>
                </div>
            </div>
        `;

        let albumGrid = '';
        if (!visibleAlbum.length) {
            albumGrid = `<div class="text-center py-10 text-gray-400 text-xs border border-dashed border-gray-700 rounded-2xl">暂未上传更多图片，管理员可点击上方「➕ 批量上传照片」添加</div>`;
        } else if (cfg.albumMode === 'featured') {
            albumGrid = `<div id="sub-album-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">${visibleAlbum.map((p, i) => i === 0 ? renderPic(p, 'md:col-span-2', 'h-[420px]') : renderPic(p, '', 'h-72')).join('')}</div>`;
        } else if (cfg.albumMode === 'cinematic') {
            albumGrid = `<div id="sub-album-grid" class="space-y-6">${visibleAlbum.map(p => renderPic(p, 'w-full', 'h-[440px]')).join('')}</div>`;
        } else {
            albumGrid = `<div id="sub-album-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cfg.albumCols || 3} gap-5">${visibleAlbum.map(p => renderPic(p, '', 'h-64')).join('')}</div>`;
        }

        const albumSection = `
            <div class="mt-8 bg-gray-900/90 backdrop-blur-md text-white rounded-3xl p-6 sm:p-8 border border-gray-700 shadow-xl">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 class="text-xl font-black">📸 ${titleName} · 相册图集 (显示 ${visibleAlbum.length}/${album.length} 张)</h3>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-1.5 text-xs" data-no-edit="true">
                            <span>显示数量:</span>
                            <select onchange="setSubPhotoLimit('${type}','${id}',this.value)" class="bg-gray-800 text-yp-lime font-black rounded px-2 py-1 border border-gray-600">
                                <option value="1" ${cfg.photoLimit == 1 ? 'selected' : ''}>1张</option>
                                <option value="2" ${cfg.photoLimit == 2 ? 'selected' : ''}>2张</option>
                                <option value="4" ${cfg.photoLimit == 4 ? 'selected' : ''}>4张</option>
                                <option value="6" ${cfg.photoLimit == 6 ? 'selected' : ''}>6张</option>
                                <option value="99" ${cfg.photoLimit >= 99 ? 'selected' : ''}>全部</option>
                            </select>
                            <button onclick="setSubAlbumMode('${type}','${id}','grid',2)" class="px-2 py-1 rounded bg-gray-800">2列</button>
                            <button onclick="setSubAlbumMode('${type}','${id}','grid',3)" class="px-2 py-1 rounded bg-gray-800">3列</button>
                            <button onclick="setSubAlbumMode('${type}','${id}','grid',4)" class="px-2 py-1 rounded bg-gray-800">4列</button>
                            <button onclick="setSubAlbumMode('${type}','${id}','featured',2)" class="px-2 py-1 rounded bg-amber-400 text-gray-900 font-black">🌟 首图焦点</button>
                            <button onclick="setSubAlbumMode('${type}','${id}','cinematic',1)" class="px-2 py-1 rounded bg-amber-400 text-gray-900 font-black">🎞️ 巨幕流</button>
                        </div>
                    ` : ''}
                </div>
                ${albumGrid}
            </div>
        `;

        const customBlocksHtml = `
            <div id="sub-custom-blocks" class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                ${(cfg.customBlocks || []).map(cb => `
                    <div class="bg-gray-900/90 backdrop-blur-md text-white rounded-3xl p-6 border border-gray-700 shadow-xl" data-sub-cbid="${cb.id}">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs font-bold text-yp-lime">ARCHIVE MODULE</span>
                            ${isAdmin ? `<div data-no-edit="true" class="flex gap-1.5 text-xs"><span class="px-2 py-0.5 bg-amber-400 text-gray-900 font-black rounded cursor-grab">✥ 拖动</span><button onclick="delSubCustomBlock('${type}','${id}','${cb.id}')" class="text-red-400 font-bold">删除</button></div>` : ''}
                        </div>
                        <h4 class="yp-editable text-lg font-black mb-2" data-cbt="${cb.id}">${cb.title}</h4>
                        <div class="yp-editable text-sm text-gray-300 whitespace-pre-line" data-cbb="${cb.id}">${cb.content}</div>
                    </div>
                `).join('')}
            </div>
        `;

        let bodyLayout = '';
        if (cfg.layout === 'hero_bg') {
            bodyLayout = `<div class="rounded-3xl overflow-hidden shadow-2xl border border-gray-700 min-h-[480px] flex items-end" style="background:linear-gradient(105deg,rgba(17,24,39,0.92) 0%,rgba(17,24,39,0.6) 60%),url('${mainImg}') center/cover no-repeat;"><div class="p-8 sm:p-12 w-full max-w-4xl text-white">${infoHtml}</div></div>${customBlocksHtml}${albumSection}`;
        } else if (cfg.layout === 'magazine') {
            bodyLayout = `<div class="bg-gray-900 text-white rounded-3xl overflow-hidden border border-gray-700"><div class="h-96 bg-gray-800"><img src="${mainImg}" class="w-full h-full object-cover"></div><div class="p-8 sm:p-12">${infoHtml}</div></div>${customBlocksHtml}${albumSection}`;
        } else if (cfg.layout === 'reverse') {
            bodyLayout = `<div class="bg-gray-900 text-white rounded-3xl overflow-hidden border border-gray-700 grid grid-cols-1 md:grid-cols-12"><div class="md:col-span-7 p-8">${infoHtml}</div><div class="md:col-span-5 bg-gray-800 min-h-[340px]"><img src="${mainImg}" class="w-full h-full object-cover"></div></div>${customBlocksHtml}${albumSection}`;
        } else if (cfg.layout === 'gallery_first') {
            bodyLayout = `${albumSection}<div class="mt-8 bg-gray-900 text-white rounded-3xl p-8 border border-gray-700">${infoHtml}</div>${customBlocksHtml}`;
        } else {
            bodyLayout = `<div class="bg-gray-900 text-white rounded-3xl overflow-hidden border border-gray-700 grid grid-cols-1 md:grid-cols-12"><div class="md:col-span-5 bg-gray-800 min-h-[340px]"><img src="${mainImg}" class="w-full h-full object-cover"></div><div class="md:col-span-7 p-8">${infoHtml}</div></div>${customBlocksHtml}${albumSection}`;
        }

        box.innerHTML = `
            <div class="mb-5" data-no-edit="true">
                <button onclick="switchPage('${backPage}')" class="px-4 py-2 rounded-xl bg-gray-900 text-yp-lime text-xs font-black shadow"><i class="fa-solid fa-arrow-left mr-1.5"></i>${backLabel}</button>
            </div>
            ${isAdmin ? `
                <div data-no-edit="true" class="mb-6 p-5 rounded-3xl bg-gray-900/95 text-white border-2 border-yp-lime shadow-2xl space-y-3 text-xs">
                    <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800">
                        <span class="font-black text-yp-lime">🛠️ 独立详情页编辑器：${titleName}</span>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="toggleSubEdit('${type}','${id}')" class="px-3.5 py-1.5 bg-amber-400 text-gray-900 font-black rounded-xl">✏️ 开启文字直接编辑</button>
                            <button id="btn-sub-save" onclick="saveSubEdit('${type}','${id}')" class="hidden px-4 py-1.5 bg-yp-green text-white font-black rounded-xl animate-pulse">💾 保存文字修改</button>
                            <button onclick="addSubCustomBlock('${type}','${id}')" class="px-3.5 py-1.5 bg-purple-600 text-white font-black rounded-xl">➕ 新增内容模块</button>
                            <label class="cursor-pointer px-3.5 py-1.5 bg-yp-darkGreen text-white font-black rounded-xl">➕ 批量上传照片<input type="file" accept="image/*" multiple class="hidden" onchange="uploadSubPhotos(event,'${type}','${id}')"></label>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-gray-400 font-bold">切换主页布局：</span>
                        <button onclick="setSubLayout('${type}','${id}','classic')" class="px-2.5 py-1 rounded ${cfg.layout === 'classic' ? 'bg-yp-green font-bold' : 'bg-gray-800'}">① 左图右文</button>
                        <button onclick="setSubLayout('${type}','${id}','magazine')" class="px-2.5 py-1 rounded ${cfg.layout === 'magazine' ? 'bg-yp-green font-bold' : 'bg-gray-800'}">② 杂志巨幕</button>
                        <button onclick="setSubLayout('${type}','${id}','reverse')" class="px-2.5 py-1 rounded ${cfg.layout === 'reverse' ? 'bg-yp-green font-bold' : 'bg-gray-800'}">③ 左文右图</button>
                        <button onclick="setSubLayout('${type}','${id}','gallery_first')" class="px-2.5 py-1 rounded ${cfg.layout === 'gallery_first' ? 'bg-yp-green font-bold' : 'bg-gray-800'}">④ 相册置顶</button>
                        <button onclick="setSubLayout('${type}','${id}','hero_bg')" class="px-2.5 py-1 rounded ${cfg.layout === 'hero_bg' ? 'bg-purple-600 font-bold' : 'bg-gray-800'}">⑤ 🌌 大图背景悬浮</button>
                    </div>
                </div>
            ` : ''}
            ${bodyLayout}
        `;

        bindSortable(document.getElementById('sub-album-grid'), '[data-sub-pid]', 'data-sub-pid', (ids) => {
            const cur = getEntityAlbum(key);
            saveEntityAlbum(key, ids.map(pid => cur.find(x => String(x.id) === String(pid))).filter(Boolean));
        });
        bindSortable(document.getElementById('sub-custom-blocks'), '[data-sub-cbid]', 'data-sub-cbid', (ids) => {
            const c = getEntityCfg(key);
            c.customBlocks = ids.map(cid => (c.customBlocks || []).find(x => String(x.id) === String(cid))).filter(Boolean);
            saveEntityCfg(key, c);
        });

        window.switchPage('subdetail');
    };

    window.setSubLayout = function (t, id, layout) { saveEntityCfg(`${t}_${id}`, { layout }); window.openEntitySubpage(t, id); };
    window.setSubAlbumMode = function (t, id, albumMode, albumCols) { saveEntityCfg(`${t}_${id}`, { albumMode, albumCols: Number(albumCols) }); window.openEntitySubpage(t, id); };
    window.setSubPhotoLimit = function (t, id, photoLimit) { saveEntityCfg(`${t}_${id}`, { photoLimit: Number(photoLimit) }); window.openEntitySubpage(t, id); };
    window.uploadSubPhotos = function (ev, t, id) {
        const files = Array.from(ev.target.files || []); if (!files.length) return;
        const key = `${t}_${id}`, album = getEntityAlbum(key); let k = 0;
        files.forEach(f => {
            const r = new FileReader();
            r.onload = e => {
                album.push({ id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 5), url: e.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                if (++k === files.length) { saveEntityAlbum(key, album); window.openEntitySubpage(t, id); if (t === 'rider') window.renderRoster(); }
            };
            r.readAsDataURL(f);
        });
    };
    window.delSubPhoto = function (t, id, pid) {
        const key = `${t}_${id}`; saveEntityAlbum(key, getEntityAlbum(key).filter(p => String(p.id) !== String(pid))); window.openEntitySubpage(t, id);
    };
    window.setSubMainCover = function (t, id, url) {
        if (t === 'rider') { const p = getSavedMemberPhotos(); p[id] = url; localStorage.setItem('yp_member_photos', JSON.stringify(p)); window.renderRoster(); }
        window.openEntitySubpage(t, id); showToast('⭐ 已设为主图！');
    };
    window.setSubPageBg = function (t, id, url) { savePageBgCfg(`sub_${t}_${id}`, { bgUrl: url }); window.openEntitySubpage(t, id); showToast('🌌 已设为本页背景大图！'); };
    window.addSubCustomBlock = function (t, id) {
        const title = prompt('请输入新增模块标题（如：🏆 个人战绩 / ⚡ 功率数据）：'); if (!title) return;
        const content = prompt('请输入模块详细内容：') || '';
        const key = `${t}_${id}`, cfg = getEntityCfg(key);
        cfg.customBlocks = cfg.customBlocks || []; cfg.customBlocks.push({ id: 'cb_' + Date.now(), title: title.trim(), content: content.trim() });
        saveEntityCfg(key, cfg); window.openEntitySubpage(t, id);
    };
    window.delSubCustomBlock = function (t, id, cbId) {
        const key = `${t}_${id}`, cfg = getEntityCfg(key);
        cfg.customBlocks = (cfg.customBlocks || []).filter(b => String(b.id) !== String(cbId));
        saveEntityCfg(key, cfg); window.openEntitySubpage(t, id);
    };
    window.toggleSubEdit = function () {
        subEditActive = !subEditActive;
        document.querySelectorAll('#subdetail-content .yp-editable').forEach(el => el.setAttribute('contenteditable', subEditActive ? 'true' : 'false'));
        document.getElementById('btn-sub-save')?.classList.toggle('hidden', !subEditActive);
    };
    window.saveSubEdit = function (t, id) {
        const key = `${t}_${id}`;
        if (t === 'rider') {
            const list = getSavedRosterData(), m = list.find(x => String(x.id) === String(id));
            if (m) {
                m.role_zh = document.getElementById('sub-edit-role')?.innerHTML.trim() || m.role_zh;
                m.name = document.getElementById('sub-edit-title')?.innerHTML.trim() || m.name;
                m.ageSpec = document.getElementById('sub-edit-sub')?.innerHTML.trim() || m.ageSpec;
                m.highlight = document.getElementById('sub-edit-high')?.innerHTML.trim() || m.highlight;
                m.bio = document.getElementById('sub-edit-bio')?.innerHTML.trim() || m.bio;
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(list)); window.renderRoster();
            }
        }
        const album = getEntityAlbum(key);
        document.querySelectorAll('[data-sub-cap]').forEach(el => {
            const p = album.find(x => String(x.id) === String(el.getAttribute('data-sub-cap')));
            if (p) p.caption = el.innerHTML.trim();
        });
        saveEntityAlbum(key, album);
        const cfg = getEntityCfg(key);
        (cfg.customBlocks || []).forEach(cb => {
            const te = document.querySelector(`[data-cbt="${cb.id}"]`), be = document.querySelector(`[data-cbb="${cb.id}"]`);
            if (te) cb.title = te.innerHTML.trim(); if (be) cb.content = be.innerHTML.trim();
        });
        saveEntityCfg(key, cfg);
        window.openEntitySubpage(t, id); showToast('✅ 详情页修改已保存！');
    };

    // =========================================================================
    // 五、唯一民宿界面（La Fuga 青野·驿 & 关若析介绍）编辑器（消除重复渲染）
    // =========================================================================
    function getHostelCfg() {
        const def = {
            photoLimit: 12, cols: 2,
            staff: [{
                id: 'st_guan', name: '关若析 (Guan Ruoxi)', role: 'La Fuga 青野·驿 主要负责人 / 主理人',
                edu: '毕业于西班牙巴塞罗那自治大学 (Universitat Autònoma de Barcelona, UAB) · 酒店管理专业硕士',
                bio: '拥有系统的欧洲高等酒店管理学术背景与国际化接待运营经验。全权负责青年力量洲际队千岛湖亚运村基地「La Fuga 青野·驿」的日常运营、骑友社群接待及赛训后勤保障。', photo: ''
            }],
            features: [{ id: 'hf1', title: '千岛湖亚运村 · 职业级骑行驿站配套', desc: '配备专业技师洗车维修区、赞助商器材展陈区及骑友社交空间，出门即达千岛湖环湖精华路线。' }],
            photos: [
                { id: 'hp1', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80', caption: '千岛湖亚运村 La Fuga 青野·驿 舒适住宿空间' },
                { id: 'hp2', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80', caption: '毗邻千岛湖环湖经典骑行路线与车队训练基地' }
            ]
        };
        try { return { ...def, ...JSON.parse(localStorage.getItem('yp_hostel_unified_v4') || '{}') }; } catch (e) { return def; }
    }
    function saveHostelCfg(c) { localStorage.setItem('yp_hostel_unified_v4', JSON.stringify({ ...getHostelCfg(), ...c })); }

    window.renderHostelUnified = function () {
        const ridesPage = document.getElementById('page-rides');
        if (!ridesPage) return;
        window.renderPageBgController('rides', ridesPage, '民宿界面(La Fuga 青野·驿)');

        // 清理任何旧版遗留容器，确保只渲染 1 套
        document.getElementById('lafuga-enhanced-box')?.remove();
        let box = document.getElementById('yp-hostel-unified-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'yp-hostel-unified-box';
            box.className = 'mb-10 space-y-8';
            const postParent = document.getElementById('ride-posts-list')?.parentElement;
            if (postParent) ridesPage.insertBefore(box, postParent); else ridesPage.appendChild(box);
        }

        const c = getHostelCfg(), isAdmin = isSuperAdmin();
        const visiblePhotos = (c.photos || []).slice(0, c.photoLimit || 12);

        box.innerHTML = `
            ${isAdmin ? `
                <div data-no-edit="true" class="p-4 rounded-2xl bg-gray-900 text-white border-2 border-amber-400 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span class="font-black text-amber-400">🏡 民宿界面(青野·驿)管理：支持增删人员与房间特色块、拖动排序及调整图片数量</span>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="addHostelStaffPrompt()" class="px-3 py-1.5 bg-yp-green text-white font-black rounded-lg">➕ 新增民宿团队人员</button>
                        <button onclick="addHostelFeaturePrompt()" class="px-3 py-1.5 bg-amber-400 text-gray-900 font-black rounded-lg">➕ 新增民宿设施介绍块</button>
                    </div>
                </div>
            ` : ''}

            <div id="hostel-staff-sort" class="space-y-6">
                ${c.staff.map(st => `
                    <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-lg border border-gray-800 grid grid-cols-1 md:grid-cols-12" data-hst-id="${st.id}">
                        <div class="md:col-span-4 bg-gray-800 min-h-[250px] relative flex items-center justify-center">
                            ${st.photo ? `<img src="${st.photo}" class="w-full h-full object-cover">` : `<div class="text-center p-6 text-gray-400 text-xs"><i class="fa-solid fa-user-tie text-3xl text-yp-lime mb-2 block"></i>${st.name}</div>`}
                            <span class="absolute top-3 left-3 px-2.5 py-1 bg-yp-green text-white text-xs font-bold rounded">${st.role}</span>
                            ${isAdmin ? `<label data-no-edit="true" class="cursor-pointer absolute bottom-3 right-3 px-3 py-1 bg-yp-red text-white text-xs font-black rounded-lg">上传照片<input type="file" accept="image/*" class="hidden" onchange="uploadHostelStaffPhoto(event,'${st.id}')"></label>` : ''}
                        </div>
                        <div class="md:col-span-8 p-8 flex flex-col justify-between">
                            <div>
                                <div class="flex justify-between items-center">
                                    <span class="text-xs text-yp-lime font-bold">${st.role}</span>
                                    ${isAdmin && c.staff.length > 1 ? `<button onclick="delHostelStaff('${st.id}')" data-no-edit="true" class="text-xs text-red-400">删除</button>` : ''}
                                </div>
                                <h3 class="yp-editable text-2xl font-black mt-1 mb-2">${st.name}</h3>
                                <div class="yp-editable p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-amber-400 font-bold mb-3"><i class="fa-solid fa-graduation-cap mr-1.5"></i>${st.edu}</div>
                                <p class="yp-editable text-sm text-gray-300 leading-relaxed">${st.bio}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div id="hostel-feat-sort" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${(c.features || []).map(f => `
                    <div class="bg-white/95 rounded-2xl p-6 border border-gray-200 shadow-xs" data-hft-id="${f.id}">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs font-black text-yp-darkGreen">LA FUGA SERVICE</span>
                            ${isAdmin ? `<button onclick="delHostelFeature('${f.id}')" data-no-edit="true" class="text-xs text-yp-red font-bold">删除</button>` : ''}
                        </div>
                        <h4 class="yp-editable text-lg font-black text-gray-900 mb-1.5">${f.title}</h4>
                        <p class="yp-editable text-xs text-gray-600 leading-relaxed">${f.desc}</p>
                    </div>
                `).join('')}
            </div>

            <div class="bg-white/95 rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h3 class="text-xl font-black text-gray-900">🏨 La Fuga 青野·驿 · 实景图集 (显示 ${visiblePhotos.length}/${c.photos.length} 张)</h3>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-2 text-xs" data-no-edit="true">
                            <label class="cursor-pointer px-3.5 py-1.5 bg-yp-darkGreen text-white font-black rounded-xl">➕ 批量传图<input type="file" accept="image/*" multiple class="hidden" onchange="uploadHostelPhotos(event)"></label>
                            <select onchange="setHostelLimit(this.value)" class="rounded bg-gray-100 border px-2 py-1 font-bold">
                                <option value="2" ${c.photoLimit == 2 ? 'selected' : ''}>最多2张</option>
                                <option value="4" ${c.photoLimit == 4 ? 'selected' : ''}>最多4张</option>
                                <option value="6" ${c.photoLimit == 6 ? 'selected' : ''}>最多6张</option>
                                <option value="99" ${c.photoLimit >= 12 ? 'selected' : ''}>全部显示</option>
                            </select>
                            <button onclick="setHostelCols(2)" class="px-2.5 py-1 rounded bg-gray-100 font-bold">2列</button>
                            <button onclick="setHostelCols(3)" class="px-2.5 py-1 rounded bg-gray-100 font-bold">3列</button>
                        </div>
                    ` : ''}
                </div>
                <div id="hostel-pic-sort" class="grid grid-cols-1 md:grid-cols-${c.cols || 2} gap-6">
                    ${visiblePhotos.map(p => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 relative" data-hpic-id="${p.id}">
                            <img src="${p.url}" draggable="false" class="w-full h-64 object-cover">
                            <div class="p-3 bg-white flex justify-between items-center text-xs font-bold text-gray-800">
                                <span class="yp-editable">${p.caption || 'La Fuga 青野·驿'}</span>
                                ${isAdmin ? `<button onclick="delHostelPhoto('${p.id}')" data-no-edit="true" class="text-yp-red">删除</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        bindSortable(document.getElementById('hostel-pic-sort'), '[data-hpic-id]', 'data-hpic-id', (ids) => {
            const cur = getHostelCfg();
            saveHostelCfg({ photos: ids.map(id => cur.photos.find(x => String(x.id) === String(id))).filter(Boolean) });
        });
    };

    window.addHostelStaffPrompt = function () {
        const name = prompt('新增人员姓名：'); if (!name) return;
        const role = prompt('职务/角色：', '青野·驿主理团队') || '';
        const edu = prompt('学历/专业背景：', '') || '';
        const bio = prompt('详细介绍：', '') || '';
        const c = getHostelCfg(); c.staff.push({ id: 'st_' + Date.now(), name, role, edu, bio, photo: '' });
        saveHostelCfg({ staff: c.staff }); window.renderHostelUnified();
    };
    window.delHostelStaff = function (id) { const c = getHostelCfg(); saveHostelCfg({ staff: c.staff.filter(s => s.id !== id) }); window.renderHostelUnified(); };
    window.uploadHostelStaffPhoto = function (ev, id) {
        const f = (ev.target.files || [])[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => { const c = getHostelCfg(), st = c.staff.find(x => x.id === id); if (st) { st.photo = e.target.result; saveHostelCfg({ staff: c.staff }); window.renderHostelUnified(); } };
        r.readAsDataURL(f);
    };
    window.addHostelFeaturePrompt = function () {
        const title = prompt('新增民宿设施/房间介绍标题：'); if (!title) return;
        const desc = prompt('详细描述：') || '';
        const c = getHostelCfg(); c.features.push({ id: 'hf_' + Date.now(), title, desc });
        saveHostelCfg({ features: c.features }); window.renderHostelUnified();
    };
    window.delHostelFeature = function (id) { const c = getHostelCfg(); saveHostelCfg({ features: c.features.filter(f => f.id !== id) }); window.renderHostelUnified(); };
    window.uploadHostelPhotos = function (ev) {
        const files = Array.from(ev.target.files || []); if (!files.length) return;
        const c = getHostelCfg(); let k = 0;
        files.forEach(f => {
            const r = new FileReader();
            r.onload = e => {
                c.photos.push({ id: 'hp_' + Date.now() + Math.random().toString(36).slice(2, 5), url: e.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                if (++k === files.length) { saveHostelCfg({ photos: c.photos }); window.renderHostelUnified(); }
            };
            r.readAsDataURL(f);
        });
    };
    window.delHostelPhoto = function (id) { const c = getHostelCfg(); saveHostelCfg({ photos: c.photos.filter(p => p.id !== id) }); window.renderHostelUnified(); };
    window.setHostelLimit = function (lim) { saveHostelCfg({ photoLimit: Number(lim) }); window.renderHostelUnified(); };
    window.setHostelCols = function (cols) { saveHostelCfg({ cols: Number(cols) }); window.renderHostelUnified(); };

    // =========================================================================
    // 六、唯一 B站双播放列表剧场 (2012662 & 3469448) —— 单一活跃实例无双重背景音
    // =========================================================================
    let activeEpIdx = 0, userClickedPlay = false;

    function getPlaylistsState() {
        const def = {
            activeListId: LIST_ID_1, showOnHome: true,
            lists: {
                [LIST_ID_1]: { id: LIST_ID_1, name: '📺 播放列表一 (List #2012662)', url: 'https://space.bilibili.com/4502039/lists/2012662', episodes: [] },
                [LIST_ID_2]: { id: LIST_ID_2, name: '📺 播放列表二 (List #3469448)', url: 'https://space.bilibili.com/4502039/lists/3469448', episodes: [] }
            }
        };
        try { return JSON.parse(localStorage.getItem('yp_bili_dual_playlists_v2') || 'null') || def; } catch (e) { return def; }
    }
    function savePlaylistsState(s) { localStorage.setItem('yp_bili_dual_playlists_v2', JSON.stringify(s)); }

    function buildTheaterBoxHtml(containerKey, isVisiblePage) {
        const state = getPlaylistsState(), isAdmin = isSuperAdmin();
        const activeId = state.activeListId || LIST_ID_1;
        const curList = state.lists[activeId] || state.lists[LIST_ID_1];
        const eps = curList.episodes || [];
        if (activeEpIdx >= eps.length) activeEpIdx = 0;
        const ep = eps[activeEpIdx] || null;

        let playerHtml = '';
        if (!isVisiblePage) {
            playerHtml = `<div class="w-full h-[420px] bg-gray-950 flex items-center justify-center text-gray-500 text-xs">视频窗口待命</div>`;
        } else if (!ep) {
            playerHtml = `
                <div class="w-full h-[420px] bg-gray-950 flex flex-col items-center justify-center text-gray-300 p-8 text-center">
                    <i class="fa-brands fa-bilibili text-4xl text-pink-400 mb-3"></i>
                    <h4 class="text-base font-black text-white mb-2">${curList.name}</h4>
                    <p class="text-xs text-gray-400 max-w-md mb-5">可点击下方前往B站观看原列表，或在右下角直接粘贴B站视频链接/BV号添加到此窗口播放！</p>
                    <a href="${curList.url}" target="_blank" class="px-5 py-2.5 bg-pink-500 text-white text-xs font-black rounded-xl shadow">打开B站播放列表 (#${activeId}) &nearr;</a>
                </div>
            `;
        } else {
            const bvMatch = ep.bvid.match(/(BV[a-zA-Z0-9]{10})/i);
            const bvid = bvMatch ? bvMatch[1] : ep.bvid;
            playerHtml = `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0&autoplay=${userClickedPlay ? 1 : 0}" class="w-full h-[420px] sm:h-[460px] bg-black" frameborder="0" allowfullscreen="true"></iframe>`;
        }

        return `
            <div class="bg-gray-900 text-white rounded-3xl overflow-hidden border-2 border-gray-800 shadow-2xl" data-no-edit="true">
                <div class="p-6 bg-gray-950 border-b border-gray-800">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h3 class="text-xl sm:text-2xl font-black"><i class="fa-brands fa-bilibili text-pink-400 mr-2"></i>青年力量发展车队 · B站双播放列表剧场</h3>
                        <a href="${curList.url}" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-pink-500 text-white text-xs font-black">前往B站原列表 (#${activeId}) &nearr;</a>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button onclick="selectBiliList('${LIST_ID_1}')" class="text-left p-3.5 rounded-2xl border-2 transition ${activeId === LIST_ID_1 ? 'bg-yp-darkGreen/30 border-yp-lime' : 'bg-gray-800/70 border-gray-700'}">
                            <div class="text-xs font-black text-yp-lime">播放列表 01 · ID: 2012662 (${state.lists[LIST_ID_1].episodes.length}集)</div>
                            <div class="text-sm font-black mt-1">${state.lists[LIST_ID_1].name}</div>
                        </button>
                        <button onclick="selectBiliList('${LIST_ID_2}')" class="text-left p-3.5 rounded-2xl border-2 transition ${activeId === LIST_ID_2 ? 'bg-yp-darkGreen/30 border-yp-lime' : 'bg-gray-800/70 border-gray-700'}">
                            <div class="text-xs font-black text-yp-lime">播放列表 02 · ID: 3469448 (${state.lists[LIST_ID_2].episodes.length}集)</div>
                            <div class="text-sm font-black mt-1">${state.lists[LIST_ID_2].name}</div>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-12 bg-gray-950">
                    <div class="lg:col-span-8 border-r border-gray-800">${playerHtml}</div>
                    <div class="lg:col-span-4 flex flex-col h-[420px] sm:h-[460px] bg-gray-900">
                        <div class="p-3.5 border-b border-gray-800 text-xs font-black">📋 列表选集 (${eps.length})</div>
                        <div class="flex-1 overflow-y-auto p-3 space-y-2">
                            ${eps.map((e, i) => `
                                <div onclick="playBiliEp(${i})" class="cursor-pointer p-2.5 rounded-xl border text-xs flex justify-between items-center ${i === activeEpIdx ? 'bg-yp-darkGreen/40 border-yp-lime text-yp-lime font-bold' : 'bg-gray-800/60 border-gray-800 text-gray-300'}">
                                    <span class="truncate pr-2">${i + 1}. ${e.title}</span>
                                    ${isAdmin ? `<button onclick="event.stopPropagation();delBiliEp(${i})" class="text-red-400 shrink-0">✕</button>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <form onsubmit="addQuickBiliEp(event,'${containerKey}')" class="p-3 bg-gray-950 border-t border-gray-800 flex gap-2 text-xs">
                            <input type="text" id="bili-add-input-${containerKey}" required placeholder="粘贴B站视频URL或BV号..." class="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-white">
                            <button type="submit" class="px-3 py-1.5 bg-yp-green text-white font-black rounded-lg shrink-0">添加/播放</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    window.renderDualPlaylistTheater = function () {
        const galleryPage = document.getElementById('page-gallery');
        const homePage = document.getElementById('page-home');
        const inGallery = galleryPage && galleryPage.classList.contains('active');
        const inHome = homePage && homePage.classList.contains('active');

        if (galleryPage) {
            let gBox = document.getElementById('yp-dual-playlist-gallery');
            if (!gBox) {
                gBox = document.createElement('div'); gBox.id = 'yp-dual-playlist-gallery'; gBox.className = 'mb-10';
                galleryPage.insertBefore(gBox, galleryPage.firstChild);
            }
            gBox.innerHTML = buildTheaterBoxHtml('gallery', inGallery);
        }
        if (homePage) {
            let hBox = document.getElementById('yp-dual-playlist-home');
            if (!hBox) {
                hBox = document.createElement('section'); hBox.id = 'yp-dual-playlist-home';
                hBox.setAttribute('data-hsec-id', 'sec_video');
                hBox.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10';
                homePage.appendChild(hBox);
            }
            hBox.innerHTML = buildTheaterBoxHtml('home', inHome);
        }
    };

    window.selectBiliList = function (id) { const s = getPlaylistsState(); s.activeListId = id; activeEpIdx = 0; userClickedPlay = false; savePlaylistsState(s); window.renderDualPlaylistTheater(); };
    window.playBiliEp = function (idx) { activeEpIdx = idx; userClickedPlay = true; window.renderDualPlaylistTheater(); };
    window.addQuickBiliEp = function (e, key) {
        e.preventDefault();
        const raw = document.getElementById(`bili-add-input-${key}`)?.value.trim(); if (!raw) return;
        const m = raw.match(/(BV[a-zA-Z0-9]{10})/i);
        const bvid = m ? m[1] : raw;
        const s = getPlaylistsState(), aid = s.activeListId || LIST_ID_1;
        const title = isSuperAdmin() ? (prompt('请输入该视频的显示标题：', `车队精选视频 (${bvid})`) || `车队视频 (${bvid})`) : `点播视频 (${bvid})`;
        s.lists[aid].episodes.unshift({ bvid, title });
        activeEpIdx = 0; userClickedPlay = true;
        if (isSuperAdmin()) savePlaylistsState(s);
        window.renderDualPlaylistTheater();
    };
    window.delBiliEp = function (idx) {
        const s = getPlaylistsState(); s.lists[s.activeListId || LIST_ID_1].episodes.splice(idx, 1);
        activeEpIdx = 0; userClickedPlay = false; savePlaylistsState(s); window.renderDualPlaylistTheater();
    };

    // =========================================================================
    // 七、底部赞助商 Logo 栏 & 独立赞助商名录页 (page-partners)
    // =========================================================================
    const defaultSponsors = [
        { id: 'sp_spect', name: '空力公式 (Spect)', tier: '官方车架合作伙伴', logoText: 'SPECT 空力公式', logoUrl: '', highlight: '提供公路气动、综合爬坡、TT及Gravel碳纤维车架支持', desc: '空力公式（Spect）旗下 Mira 破风气动车架与 Strada 超轻综合车架伴随青年力量洲际队征战国内外赛场。' },
        { id: 'sp_elves', name: 'ELVES (精灵)', tier: '官方器材合作伙伴', logoText: 'ELVES 精灵', logoUrl: '', highlight: 'UCI认证竞赛车架品牌 · Vanyar / Falath EVO 全系支持', desc: 'ELVES（精灵）拥有多项 UCI 认证竞赛车架，为车队选手提供硬核器材保障。' },
        { id: 'sp_essen', name: 'ESSEN 头盔', tier: '官方安全护具合作伙伴', logoText: 'ESSEN', logoUrl: '', highlight: '赫拉 (HELA) 气动破风头盔、爬坡盔官方赞助商', desc: 'ESSEN 为青年力量洲际队提供风洞优化的大组气动盔、爬坡盔与计时盔。' },
        { id: 'sp_zeray', name: '和博 / 卓锐 (ZERAY)', tier: '官方配件合作伙伴', logoText: 'ZERAY 卓锐', logoUrl: '', highlight: 'ZP-115 碳纤维公路自锁脚踏及竞赛水壶官方赞助商', desc: '卓锐（ZERAY）为车队提供轻量化碳纤维自锁脚踏与赛训水壶。' }
    ];
    function getSponsorsList() { try { return JSON.parse(localStorage.getItem('yp_sponsors_v4') || 'null') || defaultSponsors; } catch (e) { return defaultSponsors; } }

    window.renderSponsorsBar = function () {
        const footer = document.querySelector('footer'); if (!footer) return;
        let bar = document.getElementById('global-sponsor-bar');
        if (!bar) {
            bar = document.createElement('section'); bar.id = 'global-sponsor-bar';
            bar.className = 'bg-gray-900 border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8';
            footer.parentNode.insertBefore(bar, footer);
        }
        const list = getSponsorsList();
        bar.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">OFFICIAL PARTNERS · 官方合作伙伴（点击标志进入品牌独立详情页）</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    ${list.map(sp => `
                        <div onclick="openEntitySubpage('sponsor','${sp.id}')" class="cursor-pointer bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yp-lime rounded-2xl p-4 h-20 flex flex-col items-center justify-center transition">
                            <div class="text-sm font-black text-white">${sp.logoText || sp.name}</div>
                            <div class="text-[10px] text-yp-lime mt-0.5">${sp.tier}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    // =========================================================================
    // 八、微软神经网络翻译引擎 (Microsoft Edge/Bing) + 全站统一初始化
    // =========================================================================
    let msToken = null, msExpire = 0;
    async function getMsToken() {
        if (msToken && Date.now() < msExpire) return msToken;
        try { const r = await fetch('https://edge.microsoft.com/translate/auth'); if (r.ok) { msToken = await r.text(); msExpire = Date.now() + 480000; return msToken; } } catch (e) {}
        return null;
    }

    window.translateEntireDOM = async function (targetLang) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: n => (n.parentElement && !['script', 'style', 'noscript', 'textarea'].includes(n.parentElement.tagName.toLowerCase()) && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        }, false);
        const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
        if (targetLang === 'zh') { nodes.forEach(x => { if (x.__origZh) x.nodeValue = x.__origZh; }); return; }

        const cache = JSON.parse(localStorage.getItem('yp_ms_cache_v4') || '{"en":{},"es":{}}');
        const uncached = [];
        nodes.forEach(x => {
            if (!x.__origZh && /[\u4e00-\u9fa5]/.test(x.nodeValue)) x.__origZh = x.nodeValue;
            const src = (x.__origZh || x.nodeValue).trim();
            if (/[\u4e00-\u9fa5]/.test(src)) {
                if (cache[targetLang]?.[src]) x.nodeValue = cache[targetLang][src];
                else uncached.push({ node: x, src });
            }
        });
        if (!uncached.length) return;
        const token = await getMsToken(); if (!token) return;
        for (let i = 0; i < uncached.length; i += 8) {
            const batch = uncached.slice(i, i + 8);
            try {
                const res = await fetch(`https://api-edge.cognitive.microsofttranslator.com/translate?from=zh-Hans&to=${targetLang === 'es' ? 'es' : 'en'}&api-version=3.0`, {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify(batch.map(b => ({ Text: b.src })))
                });
                if (res.ok) {
                    const data = await res.json();
                    batch.forEach((b, idx) => {
                        const t = data[idx]?.translations?.[0]?.text;
                        if (t) { b.node.nodeValue = t; cache[targetLang][b.src] = t; }
                    });
                    localStorage.setItem('yp_ms_cache_v4', JSON.stringify(cache));
                }
            } catch (e) {}
        }
    };

    function refreshAll() {
        cleanQiuHaolin();
        window.renderHomeAll();
        window.renderRoster();
        window.renderHostelUnified();
        window.renderDualPlaylistTheater();
        window.renderSponsorsBar();
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(refreshAll, 80);

        const origSwitch = window.switchPage;
        if (origSwitch) {
            window.switchPage = function (pageId) {
                userClickedPlay = false;
                origSwitch(pageId);
                window.renderDualPlaylistTheater();
                if (pageId === 'home') window.renderHomeAll();
                if (pageId === 'roster') window.renderRoster();
                if (pageId === 'rides') window.renderHostelUnified();
                if (window.__ypLang !== 'zh') setTimeout(() => window.translateEntireDOM(window.__ypLang), 50);
            };
        }

        const origAuth = window.updateAuthUI;
        if (origAuth) {
            window.updateAuthUI = function () {
                origAuth();
                refreshAll();
            };
        }

        const origLang = window.setLanguage;
        window.setLanguage = function (lang) {
            window.__ypLang = lang;
            if (origLang) origLang(lang);
            window.translateEntireDOM(lang);
        };
    });
})();
