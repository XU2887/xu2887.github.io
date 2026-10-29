/**
 * 青年力量洲际队官网 - 独立升级插件 03 号 (update-03.js)
 * 功能：为主界面(Home)、民宿界面(La Fuga 青野·驿)、成员介绍界面(Roster)及每个成员的【单独个人详情页】提供全方位可视化编辑：
 *   1. 页面级「背景大图选择 + 遮罩浓度滑块(0~95%) + 遮罩色调 + 毛玻璃模糊度」控制器（支持主界面、民宿页、成员列表页及每位成员的独立详情页）
 *   2. 丝滑拖拽排序 (Drag & Drop) + ▲▼◀▶ 按钮调序：支持拖动主界面模块、民宿图文块/相册、成员卡片及个人详情页内的自定义章节与图片
 *   3. 自由增加 / 删减内容：主界面自定义图文块、民宿房间/人员卡片、成员档案、以及每个成员个人详情页内的自定义档案模块和相册图片
 *   4. 调整详情页图片展示数量上限与多维布局切换（1~4列平铺 / 首图巨幅焦点 / 电影宽画幅 / 错落画报流 / 5种页面主体排版）
 */

(function () {
    'use strict';

    const ADMIN_EMAIL = 'team_youthpower@outlook.com';

    function isSuperAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) {
            return false;
        }
    }

    // 注入全局样式：拖拽高亮、可编辑文本高亮、背景遮罩过渡
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .u3-sortable-item {
            transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        .u3-sortable-item img {
            -webkit-user-drag: none;
            user-select: none;
        }
        .u3-dragging {
            opacity: 0.4 !important;
            transform: scale(0.98) !important;
            outline: 3px dashed #76c729 !important;
        }
        .u3-drag-over {
            outline: 3px solid #1db954 !important;
            box-shadow: 0 12px 30px -5px rgba(29, 185, 84, 0.35) !important;
        }
        .u3-editable[contenteditable="true"] {
            outline: 2px dashed #76c729 !important;
            outline-offset: 3px;
            background-color: rgba(118, 199, 41, 0.14) !important;
            border-radius: 6px;
            padding: 2px 6px;
            cursor: text;
        }
        .u3-editable[contenteditable="true"]:focus {
            outline: 2px solid #1db954 !important;
            background-color: rgba(17, 24, 39, 0.92) !important;
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(styleEl);

    // =========================================================================
    // 一、通用丝滑拖拽排序绑定器（支持任意容器的子模块或图片卡片拖动换位）
    // =========================================================================
    function bindSortableContainer(containerEl, itemSelector, idAttr, onSortedCallback) {
        if (!containerEl || !isSuperAdmin()) return;
        let draggingNode = null;

        const items = Array.from(containerEl.querySelectorAll(itemSelector));
        items.forEach(item => {
            item.classList.add('u3-sortable-item');
            item.setAttribute('draggable', 'true');
            item.querySelectorAll('img, a').forEach(el => el.setAttribute('draggable', 'false'));

            item.ondragstart = function (e) {
                if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                draggingNode = this;
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', this.getAttribute(idAttr)); } catch (err) {}
                setTimeout(() => this.classList.add('u3-dragging'), 0);
            };

            item.ondragend = function (e) {
                e.stopPropagation();
                this.classList.remove('u3-dragging');
                containerEl.querySelectorAll(itemSelector).forEach(el => el.classList.remove('u3-drag-over'));
                draggingNode = null;
                const orderedIds = Array.from(containerEl.querySelectorAll(itemSelector)).map(el => el.getAttribute(idAttr));
                if (onSortedCallback) onSortedCallback(orderedIds);
            };

            item.ondragover = function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!draggingNode || draggingNode === this || draggingNode.parentNode !== this.parentNode) return;
                this.classList.add('u3-drag-over');

                const siblings = Array.from(containerEl.querySelectorAll(itemSelector));
                const fromIdx = siblings.indexOf(draggingNode);
                const toIdx = siblings.indexOf(this);
                if (fromIdx < toIdx) {
                    containerEl.insertBefore(draggingNode, this.nextSibling);
                } else {
                    containerEl.insertBefore(draggingNode, this);
                }
            };

            item.ondragleave = function () {
                this.classList.remove('u3-drag-over');
            };

            item.ondrop = function (e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('u3-drag-over');
            };
        });
    }

    // =========================================================================
    // 二、全局页面级「背景图选择 + 遮罩浓度 + 遮罩色调 + 毛玻璃设置」引擎
    // 支持：page-home(主界面)、page-rides(民宿界面)、page-roster(成员列表)、rider_xxx(每个成员单独详情页)
    // =========================================================================
    function getPageBgConfig(pageKey) {
        const defaults = {
            bgUrl: '',
            opacity: 70,       // 0 ~ 95 (%)
            tint: 'dark',      // 'dark'(深邃黑) | 'green'(竞速绿) | 'navy'(深海蓝) | 'warm'(暖金棕)
            blur: 0,           // 0 ~ 16 (px)
            fixed: true        // 是否视差固定背景
        };
        try {
            const all = JSON.parse(localStorage.getItem('yp_u3_page_bgs') || '{}');
            return { ...defaults, ...(all[pageKey] || {}) };
        } catch (e) {
            return defaults;
        }
    }

    function savePageBgConfig(pageKey, newCfg) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_u3_page_bgs') || '{}');
            all[pageKey] = { ...getPageBgConfig(pageKey), ...newCfg };
            localStorage.setItem('yp_u3_page_bgs', JSON.stringify(all));
        } catch (e) {}
    }

    function computeOverlayGradient(tint, opacityPct) {
        const alpha = Math.min(0.96, Math.max(0, Number(opacityPct) / 100));
        const alphaEnd = Math.min(0.98, alpha + 0.12);
        if (tint === 'green') {
            return `linear-gradient(135deg, rgba(12, 56, 26, ${alpha}) 0%, rgba(17, 24, 39, ${alphaEnd}) 100%)`;
        } else if (tint === 'navy') {
            return `linear-gradient(135deg, rgba(15, 23, 42, ${alpha}) 0%, rgba(10, 35, 66, ${alphaEnd}) 100%)`;
        } else if (tint === 'warm') {
            return `linear-gradient(135deg, rgba(45, 30, 18, ${alpha}) 0%, rgba(17, 24, 39, ${alphaEnd}) 100%)`;
        }
        return `linear-gradient(180deg, rgba(17, 24, 39, ${alpha}) 0%, rgba(17, 24, 39, ${alphaEnd}) 100%)`;
    }

    // 将背景图与遮罩应用到目标 DOM 容器，并渲染管理员背景设置条
    window.applyPageBackdropAndToolbar = function (pageKey, targetContainerEl, pageLabel) {
        if (!targetContainerEl) return;
        const cfg = getPageBgConfig(pageKey);
        const isAdmin = isSuperAdmin();

        if (cfg.bgUrl) {
            const grad = computeOverlayGradient(cfg.tint, cfg.opacity);
            targetContainerEl.style.backgroundImage = `${grad}, url('${cfg.bgUrl}')`;
            targetContainerEl.style.backgroundSize = 'cover';
            targetContainerEl.style.backgroundPosition = 'center';
            targetContainerEl.style.backgroundAttachment = cfg.fixed ? 'fixed' : 'scroll';
        } else {
            targetContainerEl.style.backgroundImage = '';
            targetContainerEl.style.backgroundSize = '';
            targetContainerEl.style.backgroundPosition = '';
            targetContainerEl.style.backgroundAttachment = '';
        }

        const toolbarId = `u3-bg-toolbar-${pageKey}`;
        let toolbar = document.getElementById(toolbarId);
        if (!isAdmin) {
            if (toolbar) toolbar.remove();
            return;
        }

        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = toolbarId;
            toolbar.setAttribute('data-no-edit', 'true');
            toolbar.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 mb-4 relative z-30';
            targetContainerEl.insertBefore(toolbar, targetContainerEl.firstChild);
        }

        toolbar.innerHTML = `
            <div class="p-4 rounded-2xl bg-gray-900/95 backdrop-blur-md border-2 border-yp-lime text-white shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2.5 py-1 bg-purple-600 text-white font-black rounded-lg">🌌 ${pageLabel} · 背景图与遮罩设置</span>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <label class="cursor-pointer px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-lg shadow flex items-center space-x-1 transition">
                        <i class="fa-solid fa-image"></i>
                        <span>上传本地背景图</span>
                        <input type="file" accept="image/*" class="hidden" onchange="u3UploadPageBg(event, '${pageKey}')">
                    </label>
                    <button onclick="u3PromptPageBgUrl('${pageKey}')" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 font-bold rounded-lg">
                        🔗 粘贴背景图URL
                    </button>
                    <div class="flex items-center space-x-1.5 bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700">
                        <span class="text-gray-300 font-bold">遮罩暗度: <strong id="u3-op-val-${pageKey}" class="text-yp-lime">${cfg.opacity}%</strong></span>
                        <input type="range" min="0" max="95" step="5" value="${cfg.opacity}" oninput="u3ChangePageBgOpacity('${pageKey}', this.value)" class="w-20 accent-yp-lime cursor-pointer">
                    </div>
                    <select onchange="u3ChangePageBgTint('${pageKey}', this.value)" class="rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-white font-bold">
                        <option value="dark" ${cfg.tint === 'dark' ? 'selected' : ''}>色调：深邃暗黑</option>
                        <option value="green" ${cfg.tint === 'green' ? 'selected' : ''}>色调：竞速深绿</option>
                        <option value="navy" ${cfg.tint === 'navy' ? 'selected' : ''}>色调：深海夜蓝</option>
                        <option value="warm" ${cfg.tint === 'warm' ? 'selected' : ''}>色调：复古暖金</option>
                    </select>
                    <button onclick="u3TogglePageBgFixed('${pageKey}')" class="px-2.5 py-1.5 rounded-lg border ${cfg.fixed ? 'border-yp-lime text-yp-lime bg-yp-green/10' : 'border-gray-700 text-gray-400 bg-gray-800'} font-bold">
                        ${cfg.fixed ? '📌 视差固定' : '📜 随页滚动'}
                    </button>
                    ${cfg.bgUrl ? `<button onclick="u3ClearPageBg('${pageKey}')" class="px-2 py-1.5 text-red-400 hover:underline font-bold">清除背景</button>` : ''}
                </div>
            </div>
        `;
    };

    window.u3UploadPageBg = function (event, pageKey) {
        if (!isSuperAdmin()) return;
        const file = (event.target.files || [])[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            savePageBgConfig(pageKey, { bgUrl: ev.target.result });
            refreshCurrentPageBg(pageKey);
            if (typeof showToast === 'function') showToast('✅ 页面背景大图已更新并保存！');
        };
        reader.readAsDataURL(file);
    };

    window.u3PromptPageBgUrl = function (pageKey) {
        if (!isSuperAdmin()) return;
        const cur = getPageBgConfig(pageKey).bgUrl;
        const url = prompt('请输入背景大图的图片 URL 链接：', cur);
        if (url && url.trim()) {
            savePageBgConfig(pageKey, { bgUrl: url.trim() });
            refreshCurrentPageBg(pageKey);
            if (typeof showToast === 'function') showToast('✅ 页面背景大图已设置！');
        }
    };

    window.u3ChangePageBgOpacity = function (pageKey, val) {
        if (!isSuperAdmin()) return;
        const label = document.getElementById(`u3-op-val-${pageKey}`);
        if (label) label.textContent = `${val}%`;
        savePageBgConfig(pageKey, { opacity: Number(val) });
        refreshCurrentPageBg(pageKey);
    };

    window.u3ChangePageBgTint = function (pageKey, tint) {
        if (!isSuperAdmin()) return;
        savePageBgConfig(pageKey, { tint });
        refreshCurrentPageBg(pageKey);
    };

    window.u3TogglePageBgFixed = function (pageKey) {
        if (!isSuperAdmin()) return;
        const cur = getPageBgConfig(pageKey);
        savePageBgConfig(pageKey, { fixed: !cur.fixed });
        refreshCurrentPageBg(pageKey);
    };

    window.u3ClearPageBg = function (pageKey) {
        if (!isSuperAdmin()) return;
        savePageBgConfig(pageKey, { bgUrl: '' });
        refreshCurrentPageBg(pageKey);
        if (typeof showToast === 'function') showToast('已清除当前页面背景图');
    };

    function refreshCurrentPageBg(pageKey) {
        if (pageKey === 'home') {
            window.applyPageBackdropAndToolbar('home', document.getElementById('page-home'), '主界面(首页)');
        } else if (pageKey === 'rides') {
            window.applyPageBackdropAndToolbar('rides', document.getElementById('page-rides'), '民宿界面(青野·驿)');
        } else if (pageKey === 'roster') {
            window.applyPageBackdropAndToolbar('roster', document.getElementById('page-roster'), '成员介绍列表页');
        } else if (pageKey.startsWith('rider_')) {
            const riderId = pageKey.replace('rider_', '');
            window.openEntitySubpage('rider', riderId);
        }
    }

    // =========================================================================
    // 三、主界面（page-home）全方位编辑器：模块拖拽排序 + 新增/删减自定义图文模块 + 照片数量控制
    // =========================================================================
    function getHomeCustomBlocks() {
        try { return JSON.parse(localStorage.getItem('yp_u3_home_blocks') || '[]'); } catch (e) { return []; }
    }

    function saveHomeCustomBlocks(list) {
        localStorage.setItem('yp_u3_home_blocks', JSON.stringify(list));
    }

    function getHomeSectionsOrder() {
        try { return JSON.parse(localStorage.getItem('yp_u3_home_sec_order') || '[]'); } catch (e) { return []; }
    }

    function saveHomeSectionsOrder(orderIds) {
        localStorage.setItem('yp_u3_home_sec_order', JSON.stringify(orderIds));
    }

    window.renderHomeEditorEnhancements = function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;
        const isAdmin = isSuperAdmin();

        // 1. 挂载主界面整体背景图与遮罩控制器
        window.applyPageBackdropAndToolbar('home', homePage, '主界面(首页)');

        // 2. 为主界面的各个原生/插件 Section 赋予唯一可排序 ID
        const heroSec = homePage.querySelector('section.hero-bg');
        if (heroSec) heroSec.setAttribute('data-home-sec-id', 'sec_hero');
        const showcaseSec = document.getElementById('home-photo-showcase-sec');
        if (showcaseSec) showcaseSec.setAttribute('data-home-sec-id', 'sec_showcase');
        const videoSec = document.getElementById('yp-dual-playlist-home');
        if (videoSec) videoSec.setAttribute('data-home-sec-id', 'sec_video');

        // 车队愿景与荣誉榜 section
        Array.from(homePage.querySelectorAll(':scope > section')).forEach(sec => {
            if (!sec.getAttribute('data-home-sec-id')) {
                sec.setAttribute('data-home-sec-id', 'sec_vision');
            }
        });

        // 3. 渲染管理员在主界面新增的自定义图文/画廊模块
        document.querySelectorAll('.u3-home-custom-sec').forEach(el => el.remove());
        const customBlocks = getHomeCustomBlocks();
        customBlocks.forEach(blk => {
            const sec = document.createElement('section');
            sec.className = 'u3-home-custom-sec max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
            sec.setAttribute('data-home-sec-id', blk.id);
            const cols = blk.cols || 3;
            const limit = blk.maxPhotos || 12;
            const displayPhotos = (blk.photos || []).slice(0, limit);

            sec.innerHTML = `
                <div class="bg-white/95 backdrop-blur-md rounded-3xl p-8 border border-gray-200 shadow-md relative">
                    ${isAdmin ? `
                        <div data-no-edit="true" class="mb-4 pb-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div class="flex items-center space-x-2">
                                <span class="px-2.5 py-1 bg-amber-400 text-gray-900 font-black rounded cursor-grab"><i class="fa-solid fa-grip-vertical mr-1"></i>按住拖动此模块排序</span>
                                <button onclick="u3MoveHomeSection('${blk.id}', -1)" class="px-2 py-1 bg-gray-800 text-white rounded font-bold">▲ 上移模块</button>
                                <button onclick="u3MoveHomeSection('${blk.id}', 1)" class="px-2 py-1 bg-gray-800 text-white rounded font-bold">▼ 下移模块</button>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <label class="cursor-pointer px-3 py-1 bg-yp-green text-white font-bold rounded-lg">
                                    ➕ 上传图片到此模块
                                    <input type="file" accept="image/*" multiple class="hidden" onchange="u3UploadHomeBlockPhotos(event, '${blk.id}')">
                                </label>
                                <select onchange="u3SetHomeBlockLayout('${blk.id}', this.value, null)" class="rounded bg-gray-100 border border-gray-300 px-2 py-1 text-gray-800 font-bold">
                                    <option value="1" ${cols == 1 ? 'selected' : ''}>1列巨幕</option>
                                    <option value="2" ${cols == 2 ? 'selected' : ''}>2列大图</option>
                                    <option value="3" ${cols == 3 ? 'selected' : ''}>3列标准</option>
                                    <option value="4" ${cols == 4 ? 'selected' : ''}>4列紧凑</option>
                                </select>
                                <button onclick="u3DeleteHomeBlock('${blk.id}')" class="px-3 py-1 bg-yp-red text-white font-bold rounded-lg">🗑️ 删除此模块</button>
                            </div>
                        </div>
                    ` : ''}
                    <span class="u3-editable text-yp-darkGreen font-black text-xs uppercase tracking-widest" data-hb-field="subtitle" data-hb-id="${blk.id}">${blk.subtitle || 'TEAM FEATURE'}</span>
                    <h3 class="u3-editable text-2xl sm:text-3xl font-black text-gray-900 mt-1 mb-3" data-hb-field="title" data-hb-id="${blk.id}">${blk.title}</h3>
                    <div class="u3-editable text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line" data-hb-field="content" data-hb-id="${blk.id}">${blk.content}</div>
                    ${displayPhotos.length > 0 ? `
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-5">
                            ${displayPhotos.map((p, idx) => `
                                <div class="rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 relative group">
                                    <img src="${p.url}" class="w-full ${cols == 1 ? 'h-96' : 'h-60'} object-cover">
                                    ${isAdmin ? `
                                        <button onclick="u3DeleteHomeBlockPhoto('${blk.id}', ${idx})" data-no-edit="true" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-yp-red text-white text-xs font-bold shadow">✕</button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            homePage.appendChild(sec);
        });

        // 4. 应用保存的主界面模块上下排列顺序
        const savedOrder = getHomeSectionsOrder();
        if (savedOrder.length > 0) {
            savedOrder.forEach(secId => {
                const node = homePage.querySelector(`[data-home-sec-id="${secId}"]`);
                if (node) homePage.appendChild(node);
            });
        }

        // 5. 注入主界面管理员「新增图文模块 & 模块排序」总控条
        let masterBar = document.getElementById('u3-home-master-bar');
        if (!isAdmin) {
            if (masterBar) masterBar.remove();
            return;
        }
        if (!masterBar) {
            masterBar = document.createElement('div');
            masterBar.id = 'u3-home-master-bar';
            masterBar.setAttribute('data-no-edit', 'true');
            masterBar.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 relative z-30';
            const bgToolbar = document.getElementById('u3-bg-toolbar-home');
            if (bgToolbar && bgToolbar.nextSibling) {
                homePage.insertBefore(masterBar, bgToolbar.nextSibling);
            } else {
                homePage.insertBefore(masterBar, homePage.firstChild);
            }
        }

        masterBar.innerHTML = `
            <div class="p-4 rounded-2xl bg-gray-800 border-2 border-amber-400 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2.5 py-1 bg-amber-400 text-gray-900 font-black rounded-lg">🏠 主界面模块增删与布局排序</span>
                    <span class="text-gray-300">支持在主界面新增任意图文/相册区块，或直接上下移动首页各大模块顺序：</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button onclick="u3AddHomeCustomBlock()" class="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-lg shadow">
                        ➕ 在主界面新增图文/照片模块
                    </button>
                    <button onclick="u3MoveHomeSection('sec_showcase', -1)" class="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-600">▲ 上移照片墙</button>
                    <button onclick="u3MoveHomeSection('sec_video', -1)" class="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-600">▲ 上移视频窗口</button>
                    <button onclick="u3MoveHomeSection('sec_vision', -1)" class="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-600">▲ 上移荣誉榜</button>
                </div>
            </div>
        `;

        // 绑定主界面模块拖拽排序
        bindSortableContainer(homePage, '[data-home-sec-id]', 'data-home-sec-id', (newOrder) => {
            saveHomeSectionsOrder(newOrder);
            if (typeof showToast === 'function') showToast('✅ 主界面模块上下布局顺序已保存！');
        });
    };

    window.u3AddHomeCustomBlock = function () {
        if (!isSuperAdmin()) return;
        const title = prompt('请输入新增主界面模块的标题：', '车队最新专栏与赛场动态');
        if (!title) return;
        const content = prompt('请输入该模块的正文介绍内容：', '在这里输入文字内容，您也可以随时上传多张配图并调整每行排列列数。') || '';
        const list = getHomeCustomBlocks();
        const newId = 'hb_' + Date.now();
        list.push({ id: newId, subtitle: 'YOUTH POWER FEATURE', title: title.trim(), content: content.trim(), cols: 3, maxPhotos: 12, photos: [] });
        saveHomeCustomBlocks(list);
        window.renderHomeEditorEnhancements();
        if (typeof showToast === 'function') showToast('✅ 已在主界面底部新增自定义模块！');
    };

    window.u3DeleteHomeBlock = function (id) {
        if (!isSuperAdmin() || !confirm('确定要删除主界面上的这个模块吗？')) return;
        saveHomeCustomBlocks(getHomeCustomBlocks().filter(b => String(b.id) !== String(id)));
        window.renderHomeEditorEnhancements();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该主界面模块');
    };

    window.u3UploadHomeBlockPhotos = function (event, id) {
        if (!isSuperAdmin()) return;
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const list = getHomeCustomBlocks();
        const blk = list.find(b => String(b.id) === String(id));
        if (!blk) return;
        let count = 0;
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = ev => {
                blk.photos.push({ url: ev.target.result, caption: '' });
                count++;
                if (count === files.length) {
                    saveHomeCustomBlocks(list);
                    window.renderHomeEditorEnhancements();
                    if (typeof showToast === 'function') showToast(`✅ 已添加 ${files.length} 张图片到该模块！`);
                }
            };
            reader.readAsDataURL(f);
        });
    };

    window.u3DeleteHomeBlockPhoto = function (id, photoIdx) {
        if (!isSuperAdmin()) return;
        const list = getHomeCustomBlocks();
        const blk = list.find(b => String(b.id) === String(id));
        if (!blk) return;
        blk.photos.splice(photoIdx, 1);
        saveHomeCustomBlocks(list);
        window.renderHomeEditorEnhancements();
    };

    window.u3SetHomeBlockLayout = function (id, cols, maxPhotos) {
        if (!isSuperAdmin()) return;
        const list = getHomeCustomBlocks();
        const blk = list.find(b => String(b.id) === String(id));
        if (!blk) return;
        if (cols) blk.cols = Number(cols);
        if (maxPhotos) blk.maxPhotos = Number(maxPhotos);
        saveHomeCustomBlocks(list);
        window.renderHomeEditorEnhancements();
    };

    window.u3MoveHomeSection = function (secId, dir) {
        if (!isSuperAdmin()) return;
        const homePage = document.getElementById('page-home');
        if (!homePage) return;
        const secs = Array.from(homePage.querySelectorAll('[data-home-sec-id]'));
        const idx = secs.findIndex(el => el.getAttribute('data-home-sec-id') === secId);
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= secs.length) return;
        if (dir < 0) {
            homePage.insertBefore(secs[idx], secs[targetIdx]);
        } else {
            homePage.insertBefore(secs[idx], secs[targetIdx].nextSibling);
        }
        const newOrder = Array.from(homePage.querySelectorAll('[data-home-sec-id]')).map(el => el.getAttribute('data-home-sec-id'));
        saveHomeSectionsOrder(newOrder);
        if (typeof showToast === 'function') showToast('✅ 已调整主界面模块顺序！');
    };

    // =========================================================================
    // 四、民宿界面（La Fuga 青野·驿 page-rides）全面可视化编辑器
    // 支持：背景图与遮罩 + 关若析及民宿团队成员增删拖拽 + 民宿房间/设施模块增删 + 图片数量与布局控制
    // =========================================================================
    function getHostelFullConfig() {
        const defaults = {
            photoLimit: 12,
            photoCols: 3,
            layoutMode: 'grid', // 'grid' | 'featured' | 'cinematic'
            staffList: [
                {
                    id: 'staff_guan',
                    name: '关若析 (Guan Ruoxi)',
                    role: 'La Fuga 青野·驿 主要负责人 / 主理人',
                    edu: '毕业于西班牙巴塞罗那自治大学 (Universitat Autònoma de Barcelona, UAB) · 酒店管理专业硕士',
                    bio: '拥有系统的欧洲高等酒店管理学术背景与丰富的国际化接待运营经验。全权负责青年力量洲际队千岛湖亚运村基地「La Fuga 青野·驿」青年旅舍的日常运营、骑友社群接待、赛训后勤保障及食宿标准管理。',
                    photo: ''
                }
            ],
            featureBlocks: [
                {
                    id: 'hf_1',
                    tag: 'CYCLING FRIENDLY HOSTEL',
                    title: '千岛湖亚运村 · 职业车队级骑行驿站配套',
                    desc: '店内配备专业技师维修洗车区、室内骑行台热身区、赞助商正版器材展陈区及舒适的骑友社交咖啡厅，出门即达千岛湖环湖精华赛段。'
                }
            ]
        };
        try {
            const saved = JSON.parse(localStorage.getItem('yp_u3_hostel_full_cfg') || 'null');
            // 同步旧版关若析照片
            const oldData = JSON.parse(localStorage.getItem('yp_lafuga_hostel_data') || '{}');
            if (!saved && oldData.managerPhoto) {
                defaults.staffList[0].photo = oldData.managerPhoto;
            }
            return saved ? { ...defaults, ...saved } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    function saveHostelFullConfig(cfg) {
        localStorage.setItem('yp_u3_hostel_full_cfg', JSON.stringify({ ...getHostelFullConfig(), ...cfg }));
    }

    window.renderHostelCustomSection = function () {
        const ridesPage = document.getElementById('page-rides');
        if (!ridesPage) return;

        // 1. 挂载民宿页面背景图与遮罩设置条
        window.applyPageBackdropAndToolbar('rides', ridesPage, '民宿界面(La Fuga 青野·驿)');

        let container = document.getElementById('lafuga-enhanced-box');
        if (!container) {
            container = document.createElement('div');
            container.id = 'lafuga-enhanced-box';
            container.className = 'mb-10 space-y-8';
            const postListParent = document.getElementById('ride-posts-list')?.parentElement;
            if (postListParent) ridesPage.insertBefore(container, postListParent);
            else ridesPage.appendChild(container);
        }

        const cfg = getHostelFullConfig();
        const oldData = JSON.parse(localStorage.getItem('yp_lafuga_hostel_data') || '{}');
        const photos = Array.isArray(oldData.photos) ? oldData.photos : [
            { id: 'hp_1', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80', caption: '千岛湖亚运村 La Fuga 青野·驿 舒适骑友住宿空间' },
            { id: 'hp_2', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80', caption: '毗邻千岛湖环湖经典骑行路线与车队常态化训练大本营' }
        ];
        const visiblePhotos = photos.slice(0, cfg.photoLimit || 12);
        const isAdmin = isSuperAdmin();

        let photoGridHtml = '';
        if (cfg.layoutMode === 'featured' && visiblePhotos.length > 0) {
            photoGridHtml = `
                <div id="hostel-photos-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${visiblePhotos.map((p, idx) => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group relative ${idx === 0 ? 'md:col-span-2' : ''}" data-hostel-photo-id="${p.id}">
                            <div class="${idx === 0 ? 'h-[420px]' : 'h-64'} overflow-hidden bg-black">
                                <img src="${p.url}" alt="${p.caption}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                            </div>
                            <div class="p-3.5 bg-white flex items-center justify-between gap-2">
                                <span class="text-xs font-bold text-gray-800">${p.caption || 'La Fuga 青野·驿'}</span>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-1 shrink-0" data-no-edit="true">
                                        <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded cursor-grab">拖动</span>
                                        <button onclick="editHostelPhotoCaption('${p.id}')" class="px-2 py-1 bg-gray-100 text-gray-700 text-[11px] font-bold rounded">改字</button>
                                        <button onclick="deleteHostelPhoto('${p.id}')" class="px-2 py-1 bg-red-50 text-yp-red text-[11px] font-bold rounded">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (cfg.layoutMode === 'cinematic') {
            photoGridHtml = `
                <div id="hostel-photos-grid" class="space-y-6">
                    ${visiblePhotos.map(p => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group relative" data-hostel-photo-id="${p.id}">
                            <div class="h-[440px] overflow-hidden bg-black">
                                <img src="${p.url}" alt="${p.caption}" draggable="false" class="w-full h-full object-cover">
                            </div>
                            <div class="p-4 bg-white flex items-center justify-between">
                                <span class="text-sm font-bold text-gray-800">${p.caption || 'La Fuga 青野·驿'}</span>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-1" data-no-edit="true">
                                        <button onclick="editHostelPhotoCaption('${p.id}')" class="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">改字</button>
                                        <button onclick="deleteHostelPhoto('${p.id}')" class="px-2.5 py-1 bg-red-50 text-yp-red text-xs font-bold rounded">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            photoGridHtml = `
                <div id="hostel-photos-grid" class="grid grid-cols-1 md:grid-cols-${cfg.photoCols || 3} gap-6">
                    ${visiblePhotos.map(p => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group relative" data-hostel-photo-id="${p.id}">
                            <div class="h-64 overflow-hidden bg-black">
                                <img src="${p.url}" alt="${p.caption}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                            </div>
                            <div class="p-3.5 bg-white flex items-center justify-between gap-2">
                                <span class="text-xs font-bold text-gray-800">${p.caption || 'La Fuga 青野·驿'}</span>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-1 shrink-0" data-no-edit="true">
                                        <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded cursor-grab">拖动</span>
                                        <button onclick="editHostelPhotoCaption('${p.id}')" class="px-2 py-1 bg-gray-100 text-gray-700 text-[11px] font-bold rounded">改字</button>
                                        <button onclick="deleteHostelPhoto('${p.id}')" class="px-2 py-1 bg-red-50 text-yp-red text-[11px] font-bold rounded">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = `
            <!-- 管理员：民宿页面全方位编辑控制台 -->
            ${isAdmin ? `
                <div data-no-edit="true" class="p-4 rounded-2xl bg-gray-900 text-white border-2 border-amber-400 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center space-x-2">
                        <span class="px-2.5 py-1 bg-amber-400 text-gray-900 font-black rounded-lg">🏡 民宿界面(青野·驿)内容与排版管理</span>
                        <span class="text-gray-300">支持新增/删减团队人员、新增民宿房间特色块、拖动排序及控制图片数量与布局：</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="u3AddHostelStaff()" class="px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-lg">➕ 新增民宿团队成员</button>
                        <button onclick="u3AddHostelFeatureBlock()" class="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-lg">➕ 新增民宿房间/设施介绍块</button>
                    </div>
                </div>
            ` : ''}

            <!-- 1. 民宿负责人（关若析）及团队成员列表（支持拖动排序与增删） -->
            <div id="u3-hostel-staff-list" class="space-y-6">
                ${cfg.staffList.map((st, idx) => `
                    <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-lg border border-gray-800 grid grid-cols-1 md:grid-cols-12 relative" data-hostel-staff-id="${st.id}">
                        <div class="md:col-span-4 bg-gray-800 min-h-[260px] relative flex flex-col items-center justify-center overflow-hidden">
                            ${st.photo ? `<img src="${st.photo}" alt="${st.name}" draggable="false" class="w-full h-full object-cover">` : `
                                <div class="p-6 text-center">
                                    <div class="w-16 h-16 rounded-full bg-gray-700 border border-dashed border-gray-500 flex items-center justify-center mx-auto mb-2 text-yp-lime">
                                        <i class="fa-solid fa-user-tie text-2xl"></i>
                                    </div>
                                    <div class="text-xs font-bold text-gray-300">${st.name}</div>
                                </div>
                            `}
                            <span class="absolute top-3 left-3 px-2.5 py-1 bg-yp-green text-white text-xs font-bold rounded">${st.role}</span>
                            ${isAdmin ? `
                                <label data-no-edit="true" class="cursor-pointer absolute bottom-3 right-3 px-3 py-1.5 bg-yp-red hover:bg-red-700 text-white text-xs font-black rounded-lg shadow flex items-center space-x-1">
                                    <i class="fa-solid fa-camera"></i>
                                    <span>上传照片</span>
                                    <input type="file" accept="image/*" class="hidden" onchange="u3UploadHostelStaffPhoto(event, '${st.id}')">
                                </label>
                            ` : ''}
                        </div>
                        <div class="md:col-span-8 p-8 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between">
                                    <div class="text-xs text-yp-lime font-bold uppercase tracking-wider">${st.role}</div>
                                    ${isAdmin ? `
                                        <div class="flex items-center space-x-1.5 text-xs" data-no-edit="true">
                                            <span class="px-2 py-0.5 bg-amber-400 text-gray-900 font-black rounded cursor-grab">✥ 拖动排序</span>
                                            <button onclick="u3EditHostelStaff('${st.id}')" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold rounded">✏️ 编辑资料</button>
                                            ${cfg.staffList.length > 1 ? `<button onclick="u3DeleteHostelStaff('${st.id}')" class="px-2.5 py-1 bg-red-600/80 text-white font-bold rounded">🗑️ 删除</button>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                                <h3 class="text-2xl sm:text-3xl font-black mt-1 mb-2">${st.name}</h3>
                                <div class="p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-amber-400 font-bold mb-4">
                                    <i class="fa-solid fa-graduation-cap mr-1.5"></i>${st.edu}
                                </div>
                                <p class="text-sm text-gray-300 leading-relaxed">${st.bio}</p>
                            </div>
                            <div class="mt-6 pt-4 border-t border-gray-800 flex flex-wrap justify-between items-center text-xs text-gray-400">
                                <span>📍 地址：杭州千岛湖亚运村 · La Fuga 青野·驿</span>
                                <span>青年力量洲际队官方驿站</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- 2. 民宿自定义房间/设施介绍区块（可自由增删与拖动排序） -->
            <div id="u3-hostel-features-list" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${cfg.featureBlocks.map(fb => `
                    <div class="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between" data-hostel-fb-id="${fb.id}">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[11px] font-black text-yp-darkGreen uppercase">${fb.tag || 'LA FUGA FEATURE'}</span>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-1.5 text-xs" data-no-edit="true">
                                        <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded cursor-grab">拖动</span>
                                        <button onclick="u3EditHostelFeature('${fb.id}')" class="text-blue-600 font-bold hover:underline">编辑</button>
                                        <button onclick="u3DeleteHostelFeature('${fb.id}')" class="text-yp-red font-bold hover:underline">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                            <h4 class="text-lg font-black text-gray-900 mb-2">${fb.title}</h4>
                            <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-line">${fb.desc}</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- 3. 民宿实景图片画廊（支持调整展示图片数量、切换3种版式与2~4列布局） -->
            <div class="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <span class="text-yp-darkGreen font-black text-xs uppercase">LA FUGA HOSTEL GALLERY</span>
                        <h3 class="text-2xl font-black text-gray-900 mt-0.5">🏨 La Fuga 青野·驿 · 实景图集 (显示 ${visiblePhotos.length}/${photos.length} 张)</h3>
                    </div>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-2 text-xs" data-no-edit="true">
                            <label class="cursor-pointer px-3.5 py-2 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl shadow flex items-center space-x-1">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                <span>➕ 批量上传图片</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange="handleHostelPhotosUpload(event)">
                            </label>
                            <div class="flex items-center space-x-1 bg-gray-100 px-2.5 py-1.5 rounded-xl border border-gray-300">
                                <span class="text-gray-700 font-bold">显示数量上限:</span>
                                <select onchange="u3SetHostelPhotoLimit(this.value)" class="bg-transparent font-black text-yp-darkGreen">
                                    <option value="2" ${cfg.photoLimit == 2 ? 'selected' : ''}>2张</option>
                                    <option value="4" ${cfg.photoLimit == 4 ? 'selected' : ''}>4张</option>
                                    <option value="6" ${cfg.photoLimit == 6 ? 'selected' : ''}>6张</option>
                                    <option value="9" ${cfg.photoLimit == 9 ? 'selected' : ''}>9张</option>
                                    <option value="99" ${cfg.photoLimit >= 12 ? 'selected' : ''}>全部显示</option>
                                </select>
                            </div>
                            <button onclick="u3SetHostelGalleryLayout('grid', 2)" class="px-2.5 py-1.5 rounded-lg ${cfg.layoutMode === 'grid' && cfg.photoCols == 2 ? 'bg-gray-900 text-white font-bold' : 'bg-gray-100 text-gray-700'}">2列</button>
                            <button onclick="u3SetHostelGalleryLayout('grid', 3)" class="px-2.5 py-1.5 rounded-lg ${cfg.layoutMode === 'grid' && cfg.photoCols == 3 ? 'bg-gray-900 text-white font-bold' : 'bg-gray-100 text-gray-700'}">3列</button>
                            <button onclick="u3SetHostelGalleryLayout('grid', 4)" class="px-2.5 py-1.5 rounded-lg ${cfg.layoutMode === 'grid' && cfg.photoCols == 4 ? 'bg-gray-900 text-white font-bold' : 'bg-gray-100 text-gray-700'}">4列</button>
                            <button onclick="u3SetHostelGalleryLayout('featured', 2)" class="px-2.5 py-1.5 rounded-lg ${cfg.layoutMode === 'featured' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-100 text-gray-700'}">🌟 首图焦点</button>
                            <button onclick="u3SetHostelGalleryLayout('cinematic', 1)" class="px-2.5 py-1.5 rounded-lg ${cfg.layoutMode === 'cinematic' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-100 text-gray-700'}">🎞️ 巨幕流</button>
                        </div>
                    ` : ''}
                </div>
                ${photoGridHtml}
            </div>
        `;

        // 绑定民宿人员、特色块、图片的拖拽排序
        bindSortableContainer(document.getElementById('u3-hostel-staff-list'), '[data-hostel-staff-id]', 'data-hostel-staff-id', (ids) => {
            const c = getHostelFullConfig();
            c.staffList = ids.map(id => c.staffList.find(s => String(s.id) === String(id))).filter(Boolean);
            saveHostelFullConfig(c);
        });
        bindSortableContainer(document.getElementById('u3-hostel-features-list'), '[data-hostel-fb-id]', 'data-hostel-fb-id', (ids) => {
            const c = getHostelFullConfig();
            c.featureBlocks = ids.map(id => c.featureBlocks.find(f => String(f.id) === String(id))).filter(Boolean);
            saveHostelFullConfig(c);
        });
        bindSortableContainer(document.getElementById('hostel-photos-grid'), '[data-hostel-photo-id]', 'data-hostel-photo-id', (ids) => {
            const d = JSON.parse(localStorage.getItem('yp_lafuga_hostel_data') || '{}');
            if (Array.isArray(d.photos)) {
                d.photos = ids.map(id => d.photos.find(p => String(p.id) === String(id))).filter(Boolean);
                localStorage.setItem('yp_lafuga_hostel_data', JSON.stringify(d));
            }
        });
    };

    window.u3AddHostelStaff = function () {
        if (!isSuperAdmin()) return;
        const name = prompt('请输入新增民宿人员姓名：', '');
        if (!name) return;
        const role = prompt('请输入职务/角色：', 'La Fuga 青野·驿 店长 / 驻店技师') || '';
        const edu = prompt('请输入毕业院校/专业或资历背景：', '') || '';
        const bio = prompt('请输入详细介绍：', '') || '';
        const c = getHostelFullConfig();
        c.staffList.push({ id: 'staff_' + Date.now(), name: name.trim(), role: role.trim(), edu: edu.trim(), bio: bio.trim(), photo: '' });
        saveHostelFullConfig(c);
        window.renderHostelCustomSection();
    };

    window.u3EditHostelStaff = function (id) {
        if (!isSuperAdmin()) return;
        const c = getHostelFullConfig();
        const st = c.staffList.find(s => String(s.id) === String(id));
        if (!st) return;
        const name = prompt('修改姓名：', st.name);
        if (name === null) return;
        const role = prompt('修改职务/角色：', st.role);
        const edu = prompt('修改学历/专业资历：', st.edu);
        const bio = prompt('修改详细介绍：', st.bio);
        st.name = name.trim() || st.name;
        if (role !== null) st.role = role.trim();
        if (edu !== null) st.edu = edu.trim();
        if (bio !== null) st.bio = bio.trim();
        saveHostelFullConfig(c);
        window.renderHostelCustomSection();
    };

    window.u3DeleteHostelStaff = function (id) {
        if (!isSuperAdmin() || !confirm('确定删除该人员卡片吗？')) return;
        const c = getHostelFullConfig();
        c.staffList = c.staffList.filter(s => String(s.id) !== String(id));
        saveHostelFullConfig(c);
        window.renderHostelCustomSection();
    };

    window.u3UploadHostelStaffPhoto = function (event, id) {
        if (!isSuperAdmin()) return;
        const file = (event.target.files || [])[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const c = getHostelFullConfig();
            const st = c.staffList.find(s => String(s.id) === String(id));
            if (st) {
                st.photo = ev.target.result;
                saveHostelFullConfig(c);
                window.renderHostelCustomSection();
            }
        };
        reader.readAsDataURL(file);
    };

    window.u3AddHostelFeatureBlock = function () {
        if (!isSuperAdmin()) return;
        const title = prompt('请输入民宿新增介绍块的标题（如：客房配置 / 驻店技师洗车服务）：');
        if (!title) return;
        const desc = prompt('请输入详细说明内容：') || '';
        const c = getHostelFullConfig();
        c.featureBlocks.push({ id: 'hf_' + Date.now(), tag: 'LA FUGA SERVICE', title: title.trim(), desc: desc.trim() });
        saveHostelFullConfig(c);
        window.renderHostelCustomSection();
    };

    window.u3EditHostelFeature = function (id) {
        if (!isSuperAdmin()) return;
        const c = getHostelFullConfig();
        const fb = c.featureBlocks.find(f => String(f.id) === String(id));
        if (!fb) return;
        const title = prompt('修改标题：', fb.title);
        if (title === null) return;
        const desc = prompt('修改详细内容：', fb.desc);
        fb.title = title.trim() || fb.title;
        if (desc !== null) fb.desc = desc.trim();
        saveHostelFullConfig(c);
        window.renderHostelCustomSection();
    };

    window.u3DeleteHostelFeature = function (id) {
        if (!isSuperAdmin()) return;
        const c = getHostelFullConfig();
        c.featureBlocks = c.featureBlocks.filter(f => String(f.id) !== String(id));
        saveHostelFullConfig(c);
        window.renderHostelCustomSection();
    };

    window.u3SetHostelPhotoLimit = function (limit) {
        if (!isSuperAdmin()) return;
        saveHostelFullConfig({ photoLimit: Number(limit) });
        window.renderHostelCustomSection();
    };

    window.u3SetHostelGalleryLayout = function (mode, cols) {
        if (!isSuperAdmin()) return;
        saveHostelFullConfig({ layoutMode: mode, photoCols: Number(cols) });
        window.renderHostelCustomSection();
    };

    // =========================================================================
    // 五、每个车队成员的「单独个人详情页」深度强化：
    // 1. 支持在个人详情页自由【增加 / 删减 / 拖动排序】多个自定义档案章节（如：功率数据、历年战绩、使用器材）
    // 2. 支持控制详情页【展示图片数量上限 (1~全部)】与【图片布局切换】
    // 3. 顶部直接集成该队员主页的【背景大图选择 + 遮罩暗度滑块 + 遮罩色调】
    // =========================================================================
    function getRiderCustomSections(riderId) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_u3_rider_sections') || '{}');
            return Array.isArray(all[riderId]) ? all[riderId] : [];
        } catch (e) { return []; }
    }

    function saveRiderCustomSections(riderId, list) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_u3_rider_sections') || '{}');
            all[riderId] = list;
            localStorage.setItem('yp_u3_rider_sections', JSON.stringify(all));
        } catch (e) {}
    }

    function getRiderPhotoLimit(riderId) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_u3_rider_photo_limits') || '{}');
            return all[riderId] || 99;
        } catch (e) { return 99; }
    }

    window.u3SetRiderPhotoLimit = function (riderId, limit) {
        if (!isSuperAdmin()) return;
        try {
            const all = JSON.parse(localStorage.getItem('yp_u3_rider_photo_limits') || '{}');
            all[riderId] = Number(limit);
            localStorage.setItem('yp_u3_rider_photo_limits', JSON.stringify(all));
            window.openEntitySubpage('rider', riderId);
            if (typeof showToast === 'function') showToast(`✅ 已设置该成员详情页最多展示 ${limit == 99 ? '全部' : limit + '张'} 图片`);
        } catch (e) {}
    };

    window.u3AddRiderCustomSection = function (riderId) {
        if (!isSuperAdmin()) return;
        const title = prompt('请输入要为该成员新增的档案模块标题（如：🏆 历年主要战绩 / ⚡ 个人功率数据 / 🚲 2027战车配置）：');
        if (!title) return;
        const content = prompt('请输入该模块的详细内容（支持多行文字）：') || '';
        const list = getRiderCustomSections(riderId);
        list.push({
            id: 'rsec_' + Date.now(),
            title: title.trim(),
            content: content.trim()
        });
        saveRiderCustomSections(riderId, list);
        window.openEntitySubpage('rider', riderId);
        if (typeof showToast === 'function') showToast('✅ 已为该成员详情页新增自定义内容模块！');
    };

    window.u3EditRiderCustomSection = function (riderId, secId) {
        if (!isSuperAdmin()) return;
        const list = getRiderCustomSections(riderId);
        const item = list.find(s => String(s.id) === String(secId));
        if (!item) return;
        const t = prompt('修改模块标题：', item.title);
        if (t === null) return;
        const c = prompt('修改模块内容：', item.content);
        item.title = t.trim() || item.title;
        if (c !== null) item.content = c.trim();
        saveRiderCustomSections(riderId, list);
        window.openEntitySubpage('rider', riderId);
    };

    window.u3DeleteRiderCustomSection = function (riderId, secId) {
        if (!isSuperAdmin() || !confirm('确定删除该成员详情页中的这个内容模块吗？')) return;
        const list = getRiderCustomSections(riderId).filter(s => String(s.id) !== String(secId));
        saveRiderCustomSections(riderId, list);
        window.openEntitySubpage('rider', riderId);
    };

    // 钩住 openEntitySubpage：为每个成员的独立详情页注入背景遮罩控制器、可增删拖拽章节及图片数量控制器
    const origOpenEntitySubpage = window.openEntitySubpage;
    window.openEntitySubpage = function (type, id) {
        if (origOpenEntitySubpage) origOpenEntitySubpage(type, id);

        const backdropWrapper = document.getElementById('subdetail-backdrop-wrapper');
        const contentBox = document.getElementById('subdetail-content');
        if (!backdropWrapper || !contentBox) return;

        // 1. 挂载该详情页专属的「背景大图选择 + 遮罩浓度0~95%滑块 + 色调」控制器
        const pageKey = `${type}_${id}`;
        window.applyPageBackdropAndToolbar(pageKey, backdropWrapper, type === 'rider' ? `成员个人详情页 (#${id})` : `详情页 (#${id})`);

        if (type !== 'rider') return;

        const isAdmin = isSuperAdmin();
        const sections = getRiderCustomSections(id);
        const photoLimit = getRiderPhotoLimit(id);

        // 2. 控制相册展示图片数量上限
        const albumGrid = document.getElementById('entity-album-sortable-grid');
        if (albumGrid) {
            const allCards = Array.from(albumGrid.children);
            allCards.forEach((card, idx) => {
                card.style.display = idx < photoLimit ? '' : 'none';
            });
        }

        // 3. 在相册控制栏加入「图片显示数量上限」下拉框
        if (isAdmin) {
            const albumHeaderRight = contentBox.querySelector('#entity-album-sortable-grid')?.parentElement?.querySelector('.flex.flex-wrap.items-center.gap-1\\.5');
            if (albumHeaderRight && !document.getElementById('u3-rider-photo-limit-sel')) {
                const limitWrap = document.createElement('div');
                limitWrap.id = 'u3-rider-photo-limit-sel';
                limitWrap.className = 'inline-flex items-center space-x-1 bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-600 text-xs mr-2';
                limitWrap.innerHTML = `
                    <span class="text-yp-lime font-bold">图片显示数量:</span>
                    <select onchange="u3SetRiderPhotoLimit('${id}', this.value)" class="bg-gray-900 text-white font-black rounded px-1">
                        <option value="1" ${photoLimit == 1 ? 'selected' : ''}>仅显示 1 张</option>
                        <option value="2" ${photoLimit == 2 ? 'selected' : ''}>最多 2 张</option>
                        <option value="3" ${photoLimit == 3 ? 'selected' : ''}>最多 3 张</option>
                        <option value="4" ${photoLimit == 4 ? 'selected' : ''}>最多 4 张</option>
                        <option value="6" ${photoLimit == 6 ? 'selected' : ''}>最多 6 张</option>
                        <option value="9" ${photoLimit == 9 ? 'selected' : ''}>最多 9 张</option>
                        <option value="99" ${photoLimit >= 99 ? 'selected' : ''}>全部显示</option>
                    </select>
                `;
                albumHeaderRight.insertBefore(limitWrap, albumHeaderRight.firstChild);
            }
        }

        // 4. 渲染该成员个人详情页的可增删、可拖拽排序自定义内容模块
        let secContainer = document.getElementById('u3-rider-custom-sections-box');
        if (!secContainer) {
            secContainer = document.createElement('div');
            secContainer.id = 'u3-rider-custom-sections-box';
            secContainer.className = 'mt-8 space-y-5';
            contentBox.appendChild(secContainer);
        }

        secContainer.innerHTML = `
            ${isAdmin ? `
                <div data-no-edit="true" class="p-4 rounded-2xl bg-gray-900 text-white border-2 border-amber-400 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center space-x-2">
                        <span class="px-2.5 py-1 bg-amber-400 text-gray-900 font-black rounded">📋 成员个人主页 · 自定义内容区块管理</span>
                        <span class="text-gray-300">可为该队员单独添加战绩表、功率数据、器材配置等任意模块，并支持按住拖动调整顺序：</span>
                    </div>
                    <button onclick="u3AddRiderCustomSection('${id}')" class="px-4 py-2 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl shadow">
                        ➕ 为该成员新增内容模块
                    </button>
                </div>
            ` : ''}
            <div id="u3-rider-secs-sortable" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${sections.map(s => `
                    <div class="bg-gray-900/90 backdrop-blur-md text-white rounded-3xl p-6 sm:p-8 border border-gray-700 shadow-xl flex flex-col justify-between" data-rsec-id="${s.id}">
                        <div>
                            <div class="flex items-center justify-between mb-3">
                                <span class="px-2.5 py-0.5 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">RIDER ARCHIVE MODULE</span>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-1.5 text-xs" data-no-edit="true">
                                        <span class="px-2 py-0.5 bg-amber-400 text-gray-900 font-black rounded cursor-grab">✥ 拖动排序</span>
                                        <button onclick="u3EditRiderCustomSection('${id}', '${s.id}')" class="px-2 py-0.5 bg-gray-800 text-amber-400 font-bold rounded">编辑</button>
                                        <button onclick="u3DeleteRiderCustomSection('${id}', '${s.id}')" class="px-2 py-0.5 bg-yp-red text-white font-bold rounded">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                            <h4 class="yp-editable-field text-xl font-black text-white mb-3">${s.title}</h4>
                            <div class="yp-editable-field text-sm text-gray-300 leading-relaxed whitespace-pre-line">${s.content}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        bindSortableContainer(document.getElementById('u3-rider-secs-sortable'), '[data-rsec-id]', 'data-rsec-id', (newIds) => {
            const cur = getRiderCustomSections(id);
            const ordered = newIds.map(sid => cur.find(x => String(x.id) === String(sid))).filter(Boolean);
            saveRiderCustomSections(id, ordered);
            if (typeof showToast === 'function') showToast('✅ 成员个人主页模块顺序已保存！');
        });
    };

    // =========================================================================
    // 六、初始化挂载与全局切换监听
    // =========================================================================
    function initAllU3Enhancements() {
        window.renderHomeEditorEnhancements();
        window.renderHostelCustomSection();
        window.applyPageBackdropAndToolbar('roster', document.getElementById('page-roster'), '成员介绍列表页');
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initAllU3Enhancements, 200);

        const prevSwitchPage = window.switchPage;
        if (prevSwitchPage) {
            window.switchPage = function (pageId) {
                prevSwitchPage(pageId);
                if (pageId === 'home') window.renderHomeEditorEnhancements();
                if (pageId === 'rides') window.renderHostelCustomSection();
                if (pageId === 'roster') window.applyPageBackdropAndToolbar('roster', document.getElementById('page-roster'), '成员介绍列表页');
            };
        }

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                initAllU3Enhancements();
            };
        }
    });
})();
