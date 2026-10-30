/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 独立升级插件 (update-02.js)
 * 说明：零冲突独立扩展插件，无需修改 index.html 与 custom-update.js，不会影响管理员密码与已有功能！
 * 核心功能：
 * 1. 【登录框净化】：自动移除登录弹窗中关于管理员操作权限的提示说明文字
 * 2. 【赞助商介绍模块（取代原招募赞助商页）】：在 #page-sponsorship 实现与队员介绍完全相同的卡片管理（增删、拖动排序、2/3/4列切换、换封面、点击进入同款独立详情页）
 * 3. 【车队风采“影集 (Photo Albums)”系统】：支持创建/删除影集、影集拖动与按钮排序、点开影集批量上传多张图片、影集内图片排序与改说明
 * 4. 【主页选定影集幻灯片/滚动播放器】：在主页自动轮播选定影集的照片，支持管理员随时切换轮播哪个影集及调节轮播速度
 */

(function () {
    'use strict';

    if (window.__YP_UPDATE_02_LOADED__) return;
    window.__YP_UPDATE_02_LOADED__ = true;

    const ADMIN_EMAIL = 'team_youthpower@outlook.com';

    function isAdminUser() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) { return false; }
    }

    // 复用安全拖拽绑定器
    function bindAlbumSortable(containerEl, itemSelector, idAttr, onOrderChanged) {
        if (!containerEl || !isAdminUser()) return;
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
                if (onOrderChanged) onOrderChanged(orderedIds);
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
    // 一、删除登录界面对管理员登录后所能取得的操作权限的说明
    // =========================================================================
    function cleanLoginModalAdminHint() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.querySelectorAll('p').forEach(p => {
                if (p.textContent.includes('管理员') || p.textContent.includes('权限')) {
                    p.remove();
                }
            });
        }
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            const headerTitle = authModal.querySelector('h3');
            if (headerTitle && headerTitle.textContent.includes('管理员')) {
                headerTitle.textContent = '青年力量车队 · 账号登录与注册';
            }
            const tabLogin = document.getElementById('tab-login');
            if (tabLogin && tabLogin.textContent.includes('管理员')) {
                tabLogin.textContent = '账号登录';
            }
        }
    }

    // =========================================================================
    // 二、商业赞助页改造：删去招募赞助商部分，替换为「赞助商介绍模块」（与队员介绍操作逻辑一致）
    // =========================================================================
    const defaultSponsorsData = [
        {
            id: 'sp_spect',
            name: '空力公式 (Spect)',
            tier: '官方车架合作伙伴',
            logoText: 'SPECT 空力公式',
            logoUrl: '',
            highlight: '提供公路气动、综合爬坡、TT及Gravel专业碳纤维车架支持',
            desc: '空力公式（Spect）致力于高性能碳纤维自行车架研发，旗下 Mira 破风气动车架与 Strada 超轻综合车架伴随青年力量洲际队征战国内外高级别职业赛场。'
        },
        {
            id: 'sp_elves',
            name: 'ELVES (精灵)',
            tier: '官方器材合作伙伴',
            logoText: 'ELVES 精灵',
            logoUrl: '',
            highlight: 'UCI认证竞赛车架品牌 · Vanyar / Falath EVO / Mori 全系支持',
            desc: 'ELVES（精灵）拥有多项 UCI 国际自盟认证竞赛车架，为车队选手在高山爬坡、平路冲刺与 Gravel 世锦赛赛场提供硬核器材保障。'
        },
        {
            id: 'sp_essen',
            name: 'ESSEN 头盔',
            tier: '官方安全护具合作伙伴',
            logoText: 'ESSEN',
            logoUrl: '',
            highlight: '赫拉 (HELA) 气动破风头盔、爬坡盔及 ITT 计时盔官方赞助商',
            desc: 'ESSEN 深耕骑行安全领域，为青年力量洲际队提供全方位风洞优化的大组气动盔、超轻爬坡盔及个人计时赛头盔。'
        },
        {
            id: 'sp_zeray',
            name: '和博 / 卓锐 (ZERAY)',
            tier: '官方配件与传动合作伙伴',
            logoText: 'ZERAY 卓锐',
            logoUrl: '',
            highlight: 'ZP-115 碳纤维公路自锁脚踏及职业竞赛水壶官方赞助商',
            desc: '和博旗下卓锐（ZERAY）品牌为车队提供高传动效率的轻量化碳纤维自锁脚踏、锁片及赛训补给水壶。'
        },
        {
            id: 'sp_jingteng',
            name: '静藤轮组 (Jingteng)',
            tier: '品牌出海战略合作伙伴',
            logoText: 'JINGTENG 静藤',
            logoUrl: '',
            highlight: '依托车队哥伦比亚与西班牙赛训网络，共同开拓拉美与欧洲车店市场',
            desc: '青年力量洲际队不仅在赛场使用静藤高性能碳纤维轮组，更作为其海外实地推广团队，成功将产品引入哥伦比亚和西班牙实体车店网络。'
        }
    ];

    function getSponsorsData() {
        try {
            const saved = localStorage.getItem('yp_sponsors_v4');
            return saved ? JSON.parse(saved) : defaultSponsorsData;
        } catch (e) { return defaultSponsorsData; }
    }

    function saveSponsorsData(list) {
        localStorage.setItem('yp_sponsors_v4', JSON.stringify(list));
    }

    window.setSponsorCols = function (cols) {
        localStorage.setItem('yp_sponsor_cols_v2', String(cols));
        window.renderSponsorshipModule();
    };

    window.moveSponsorCard = function (id, dir) {
        if (!isAdminUser()) return;
        const list = getSponsorsData();
        const i = list.findIndex(s => String(s.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveSponsorsData(list);
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
    };

    window.deleteSponsorCard = function (id) {
        if (!isAdminUser() || !confirm('确定删除该赞助商档案吗？')) return;
        saveSponsorsData(getSponsorsData().filter(s => String(s.id) !== String(id)));
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该赞助商');
    };

    let editingSponsorId = null;
    const spPhotoInput = document.createElement('input');
    spPhotoInput.type = 'file';
    spPhotoInput.accept = 'image/*';
    spPhotoInput.className = 'hidden';
    spPhotoInput.onchange = function (e) {
        const file = (e.target.files || [])[0];
        if (!file || !editingSponsorId) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const list = getSponsorsData();
            const sp = list.find(s => String(s.id) === String(editingSponsorId));
            if (sp) {
                sp.logoUrl = ev.target.result;
                saveSponsorsData(list);
                window.renderSponsorshipModule();
                if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
                if (typeof showToast === 'function') showToast('✅ 赞助商标志/封面已更新！');
            }
        };
        reader.readAsDataURL(file);
    };
    document.body.appendChild(spPhotoInput);

    window.triggerSponsorCoverUpload = function (spId) {
        editingSponsorId = spId;
        spPhotoInput.value = '';
        spPhotoInput.click();
    };

    // 将 #page-sponsorship 彻底替换为与队员介绍一致的「赞助商介绍模块」
    window.renderSponsorshipModule = function () {
        const spPage = document.getElementById('page-sponsorship');
        if (!spPage) return;

        // 移除顶部可能重复的“合作伙伴Logo”导航按钮，统一使用“商业赞助/赞助商介绍”
        document.querySelectorAll('[data-target="partners"]').forEach(btn => btn.remove());

        // 更换导航栏文字为“赞助商介绍”
        document.querySelectorAll('[data-target="sponsorship"]').forEach(btn => {
            if (window.__ypLang === 'zh') btn.textContent = '赞助商介绍';
        });

        spPage.className = 'page-section py-14 bg-gray-900 text-white min-h-[85vh]';
        if (document.querySelector('.nav-btn.text-yp-darkGreen')?.getAttribute('data-target') === 'sponsorship') {
            spPage.classList.add('active');
        }

        const isAdmin = isAdminUser();
        const cols = localStorage.getItem('yp_sponsor_cols_v2') || '3';
        const list = getSponsorsData();

        spPage.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between mb-10">
                    <div>
                        <span class="text-yp-lime font-black tracking-widest text-sm uppercase">OFFICIAL SPONSORS & PARTNERS</span>
                        <h2 class="text-3xl sm:text-4xl font-black mt-1">官方赞助商与合作伙伴介绍</h2>
                        <p class="text-gray-400 text-sm mt-1">
                            感谢各合作伙伴对青年力量洲际队（Youth Power Continental Team）海内外征程的鼎力支持。点击任意品牌卡片可进入其专属独立详情主页。
                        </p>
                    </div>
                </div>

                ${isAdmin ? `
                    <div data-no-edit="true" class="mb-7 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div class="flex flex-wrap items-center gap-3">
                            <button onclick="openAddSponsorModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                                <i class="fa-solid fa-plus-circle"></i><span>➕ 添加赞助商 / 合作伙伴</span>
                            </button>
                            <span class="text-yp-lime font-bold">✥ 按住任意赞助商卡片可直接【拖动排序】；点击下方绿色按钮可进入【品牌独立详情页】编辑多图与5种排版！</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-gray-300 font-bold">每行数量：</span>
                            <button onclick="setSponsorCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">2个</button>
                            <button onclick="setSponsorCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">3个</button>
                            <button onclick="setSponsorCols(4)" class="px-3 py-1.5 rounded-lg ${cols == '4' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">4个</button>
                        </div>
                    </div>
                ` : ''}

                <div id="sponsors-main-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7">
                    ${list.map(sp => {
                        let album = [];
                        try { album = JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}')[`sponsor_${sp.id}`] || []; } catch (e) {}
                        const coverImg = sp.logoUrl || (album.length > 0 ? album[0].url : '');
                        return `
                            <div class="bg-gray-800/95 backdrop-blur-xs rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-spcard-id="${sp.id}">
                                <div>
                                    <div onclick="openSponsorDetail('${sp.id}')" class="relative h-60 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer p-6">
                                        ${coverImg ? `
                                            <img src="${coverImg}" alt="${sp.name}" draggable="false" class="w-full h-full object-contain group-hover:scale-105 transition duration-300">
                                        ` : `
                                            <div class="text-center">
                                                <div class="text-2xl sm:text-3xl font-black text-white group-hover:text-yp-lime tracking-widest transition">${sp.logoText || sp.name}</div>
                                                <span class="text-xs text-gray-500 mt-2 block">点击进入品牌详情页</span>
                                            </div>
                                        `}
                                        <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${sp.tier || '官方合作伙伴'}</span>
                                        ${isAdmin ? `
                                            <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                                <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                                <button onclick="moveSponsorCard('${sp.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">◀</button>
                                                <button onclick="moveSponsorCard('${sp.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">▶</button>
                                            </div>
                                            <button onclick="event.stopPropagation();triggerSponsorCoverUpload('${sp.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red text-white text-[11px] font-black rounded-lg shadow">📷 换Logo/封面</button>
                                        ` : ''}
                                    </div>
                                    <div class="p-6">
                                        <div class="text-xs text-gray-400 mb-1">${sp.logoText || sp.name}</div>
                                        <h3 onclick="openSponsorDetail('${sp.id}')" class="text-2xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${sp.name}</h3>
                                        <div class="p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${sp.highlight || ''}</div>
                                        <div class="text-xs text-gray-300 leading-relaxed space-y-1.5 line-clamp-4">${sp.desc || ''}</div>
                                    </div>
                                </div>
                                <div data-no-edit="true" class="p-4 bg-gray-900/90 border-t border-gray-700 flex items-center justify-between gap-2">
                                    <button onclick="openSponsorDetail('${sp.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5">
                                        <i class="fa-solid fa-building"></i><span>🏢 进入品牌独立详情页 (${album.length}图)</span><i class="fa-solid fa-arrow-right"></i>
                                    </button>
                                    ${isAdmin ? `<button onclick="deleteSponsorCard('${sp.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        if (typeof window.renderPageBgController === 'function') {
            window.renderPageBgController('sponsorship', spPage, '赞助商介绍界面');
        }

        const grid = document.getElementById('sponsors-main-grid');
        bindAlbumSortable(grid, '[data-spcard-id]', 'data-spcard-id', (newIds) => {
            const cur = getSponsorsData();
            const ordered = newIds.map(id => cur.find(s => String(s.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                saveSponsorsData(ordered);
                if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
                if (typeof showToast === 'function') showToast('✅ 赞助商排列顺序已保存！');
            }
        });
    };

    // 打开赞助商独立详情页，并将返回按钮指向 sponsorship
    window.openSponsorDetail = function (spId) {
        if (typeof window.openEntitySubpage === 'function') {
            window.openEntitySubpage('sponsor', spId);
            // 修正详情页左上角返回按钮指向 sponsorship 页面
            const backBtn = document.querySelector('#subdetail-content button[onclick*="switchPage"]');
            if (backBtn) {
                backBtn.setAttribute('onclick', "switchPage('sponsorship')");
                backBtn.innerHTML = '<i class="fa-solid fa-arrow-left mr-1.5"></i>返回赞助商介绍列表';
            }
        }
    };

    // 同步底部全局赞助商图标栏
    window.renderSponsorsBar = function () {
        const footer = document.querySelector('footer'); if (!footer) return;
        let bar = document.getElementById('global-sponsor-bar');
        if (!bar) {
            bar = document.createElement('section'); bar.id = 'global-sponsor-bar';
            bar.className = 'bg-gray-900 border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8';
            footer.parentNode.insertBefore(bar, footer);
        }
        const list = getSponsorsData();
        bar.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center justify-between mb-4">
                    <div class="text-xs font-black text-gray-400 uppercase tracking-wider">OFFICIAL PARTNERS · 官方赞助商与合作伙伴（点击标志进入品牌独立详情页）</div>
                    <button onclick="switchPage('sponsorship')" data-no-edit="true" class="text-xs font-bold text-yp-lime hover:underline">查看全部赞助商介绍 &rarr;</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    ${list.map(sp => `
                        <div onclick="openSponsorDetail('${sp.id}')" class="cursor-pointer bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yp-lime rounded-2xl p-4 h-20 flex flex-col items-center justify-center transition overflow-hidden">
                            ${sp.logoUrl ? `<img src="${sp.logoUrl}" class="max-h-12 max-w-[130px] object-contain">` : `
                                <div class="text-sm font-black text-white truncate max-w-full">${sp.logoText || sp.name}</div>
                                <div class="text-[10px] text-yp-lime mt-0.5 truncate max-w-full">${sp.tier}</div>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    // 快捷新增赞助商弹窗（与添加队员弹窗完全一致）
    window.openAddSponsorModal = function () {
        let m = document.getElementById('yp-add-sponsor-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-add-sponsor-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            m.innerHTML = `
                <div onclick="document.getElementById('yp-add-sponsor-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
                <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                    <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                        <h3 class="text-lg font-black text-yp-lime">➕ 添加新赞助商 / 合作伙伴</h3>
                        <button onclick="document.getElementById('yp-add-sponsor-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitAddSponsorModal(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">品牌名称 *</label><input type="text" id="asm-name" required placeholder="如：NZSE 骑行服" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">合作头衔/级别 *</label><input type="text" id="asm-tier" required placeholder="如：官方骑行服合作伙伴" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">标志英文/简称</label><input type="text" id="asm-logotext" placeholder="如：NZSE PRO APPAREL" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">上传品牌Logo图（可选）</label><input type="file" id="asm-file" accept="image/*" class="w-full text-xs"></div>
                        </div>
                        <div><label class="block font-bold mb-1">高光亮点一句话 *</label><input type="text" id="asm-high" required placeholder="如：提供全套职业连体骑行服与赛训装备支持" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold mb-1">品牌与合作详细介绍 *</label><textarea id="asm-desc" required rows="3" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 保存并生成品牌独立详情页</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitAddSponsorModal = function (e) {
        e.preventDefault();
        const name = document.getElementById('asm-name').value.trim();
        const tier = document.getElementById('asm-tier').value.trim();
        const logoText = document.getElementById('asm-logotext').value.trim() || name;
        const highlight = document.getElementById('asm-high').value.trim();
        const desc = document.getElementById('asm-desc').value.trim();
        const f = document.getElementById('asm-file').files[0];

        const save = (logoUrl) => {
            const list = getSponsorsData();
            list.push({ id: 'sp_' + Date.now(), name, tier, logoText, logoUrl: logoUrl || '', highlight, desc });
            saveSponsorsData(list);
            window.renderSponsorshipModule();
            window.renderSponsorsBar();
            e.target.reset();
            document.getElementById('yp-add-sponsor-modal').classList.add('hidden');
            if (typeof showToast === 'function') showToast(`✅ 已添加赞助商：${name}`);
        };
        if (f) { const r = new FileReader(); r.onload = ev => save(ev.target.result); r.readAsDataURL(f); } else save('');
    };

    // =========================================================================
    // 三、车队风采 Gallery 升级为「影集 (Photo Albums) 系统」 + 主页幻灯片轮播
    // =========================================================================
    const defaultPhotoAlbums = [
        {
            id: 'alb_championship',
            title: '🏆 全国U系列锦标赛与公开赛夺冠影集',
            tag: '冠军时刻',
            desc: '记录青年力量车队在全国青少年U系列锦标赛（常州溧阳等站）及全国公开赛包揽冠亚军的荣耀瞬间。',
            cover: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80',
            photos: [
                { id: 'ap_1', url: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80', caption: '全国U系列锦标赛领奖台包揽冠亚军荣耀时刻' },
                { id: 'ap_2', url: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=1200&q=80', caption: '2026全国公开赛（湖北枝江）大学生组单飞冲线夺冠' },
                { id: 'ap_3', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80', caption: '个人计时赛（ITT）高速巡航破风瞬间' }
            ]
        },
        {
            id: 'alb_overseas',
            title: '🌍 西班牙、摩洛哥与拉美外赛征程影集',
            tag: '海外赛场',
            desc: '车队自2022年起与西班牙、摩洛哥及哥伦比亚车队深度合作，征战国际UCI赛事的高光掠影。',
            cover: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
            photos: [
                { id: 'ap_4', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80', caption: '欧洲与北非高难度山地赛段主集团突围' },
                { id: 'ap_5', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80', caption: '赛前队车整备与职业战车阵列' }
            ]
        },
        {
            id: 'alb_training',
            title: '🚴 千岛湖亚运村与余杭基地冬训影集',
            tag: '冬训纪实',
            desc: '车队在杭州余杭及千岛湖亚运村（La Fuga青野·驿）常态化训练基地的高强度团练与生活点滴。',
            cover: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=1200&q=80',
            photos: [
                { id: 'ap_6', url: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=1200&q=80', caption: '千岛湖环湖经典路线梯队轮换领骑拉练' },
                { id: 'ap_7', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80', caption: 'La Fuga 青野·驿大本营赛后恢复与交流' }
            ]
        }
    ];

    function getAlbumsState() {
        const def = {
            homeCarouselAlbumId: 'alb_championship',
            carouselIntervalSec: 4,
            showCarouselOnHome: true,
            albumCols: 3,
            albums: defaultPhotoAlbums
        };
        try {
            const saved = localStorage.getItem('yp_photo_albums_v2');
            return saved ? { ...def, ...JSON.parse(saved) } : def;
        } catch (e) { return def; }
    }

    function saveAlbumsState(state) {
        localStorage.setItem('yp_photo_albums_v2', JSON.stringify({ ...getAlbumsState(), ...state }));
    }

    let currentViewingAlbumId = null;

    // 渲染车队风采页中的「影集 (Albums) 管理系统」
    window.renderGalleryAlbumsSystem = function () {
        const galleryPage = document.getElementById('page-gallery');
        if (!galleryPage) return;

        // 隐藏旧版单图上传框与旧网格，全面由影集系统接管
        document.getElementById('admin-gallery-uploader')?.classList.add('hidden');
        const oldGrid = document.getElementById('gallery-grid');
        if (oldGrid) oldGrid.classList.add('hidden');
        const topStaffBtn = galleryPage.querySelector('button[onclick*="handleStaffUploadClick"]');
        if (topStaffBtn) topStaffBtn.classList.add('hidden');

        let albumRoot = document.getElementById('yp-albums-system-root');
        if (!albumRoot) {
            albumRoot = document.createElement('div');
            albumRoot.id = 'yp-albums-system-root';
            albumRoot.className = 'mt-6';
            galleryPage.appendChild(albumRoot);
        }

        const state = getAlbumsState();
        const isAdmin = isAdminUser();
        const albums = state.albums || [];

        // 如果当前点开了某个影集，渲染【影集内部照片管理与浏览视图】
        if (currentViewingAlbumId) {
            const alb = albums.find(a => String(a.id) === String(currentViewingAlbumId));
            if (!alb) {
                currentViewingAlbumId = null;
                return window.renderGalleryAlbumsSystem();
            }
            const photos = alb.photos || [];
            const isHomeSelected = state.homeCarouselAlbumId === alb.id;

            albumRoot.innerHTML = `
                <div class="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm">
                    <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6" data-no-edit="true">
                        <button onclick="closeAlbumDetailView()" class="px-4 py-2 rounded-xl bg-gray-900 text-yp-lime text-xs font-black hover:bg-gray-800 transition flex items-center space-x-1.5 shadow">
                            <i class="fa-solid fa-arrow-left"></i><span>返回全部车队影集列表</span>
                        </button>
                        <div class="flex flex-wrap items-center gap-2 text-xs">
                            ${isHomeSelected ? `
                                <span class="px-3 py-1.5 rounded-xl bg-green-100 text-yp-darkGreen font-black">🎠 当前已在主页幻灯片轮播此影集</span>
                            ` : (isAdmin ? `
                                <button onclick="setHomeCarouselAlbum('${alb.id}')" class="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-black shadow">
                                    🎠 设为主页幻灯片轮播影集
                                </button>
                            ` : '')}
                            ${isAdmin ? `
                                <button onclick="editAlbumMetaPrompt('${alb.id}')" class="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold">✏️ 修改影集标题/简介</button>
                                <button onclick="deleteAlbumItem('${alb.id}')" class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-yp-red font-bold">🗑️ 删除整个影集</button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="mb-8">
                        <span class="px-2.5 py-1 bg-yp-green/15 text-yp-darkGreen text-xs font-black rounded">${alb.tag || '车队影集'} · 共 ${photos.length} 张照片</span>
                        <h3 class="text-2xl sm:text-3xl font-black text-gray-900 mt-2">${alb.title}</h3>
                        <p class="text-sm text-gray-600 mt-1.5 leading-relaxed">${alb.desc || ''}</p>
                    </div>

                    ${isAdmin ? `
                        <div data-no-edit="true" class="mb-8 p-5 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs">
                            <div class="lg:col-span-5">
                                <label class="cursor-pointer w-full py-3 px-4 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl flex items-center justify-center space-x-2 shadow transition">
                                    <i class="fa-solid fa-cloud-arrow-up text-base"></i>
                                    <span>➕ 批量上传本地照片到此影集（支持多选）</span>
                                    <input type="file" accept="image/*" multiple class="hidden" onchange="uploadPhotosToAlbum(event, '${alb.id}')">
                                </label>
                            </div>
                            <form onsubmit="addPhotoUrlToAlbum(event, '${alb.id}')" class="lg:col-span-7 flex flex-wrap sm:flex-nowrap gap-2">
                                <input type="url" id="alb-photo-url-input" required placeholder="或粘贴照片URL链接 https://..." class="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                                <input type="text" id="alb-photo-cap-input" placeholder="照片说明文字(选填)" class="w-40 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                                <button type="submit" class="px-4 py-2.5 bg-amber-400 text-gray-900 font-black rounded-xl hover:bg-amber-300 shrink-0">添加照片</button>
                            </form>
                        </div>
                    ` : ''}

                    ${photos.length === 0 ? `
                        <div class="text-center py-14 border border-dashed border-gray-300 rounded-2xl text-gray-400 text-xs">
                            此影集暂无照片。${isAdmin ? '管理员请点击上方绿色按钮批量上传照片！' : ''}
                        </div>
                    ` : `
                        <div id="album-inner-photos-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${photos.map((p, idx) => `
                                <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group relative flex flex-col justify-between" data-alb-pid="${p.id}">
                                    <div class="h-64 bg-black overflow-hidden relative">
                                        <img src="${p.url}" alt="${p.caption || alb.title}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                        ${isAdmin ? `
                                            <div data-no-edit="true" class="absolute top-2.5 left-2.5 flex items-center space-x-1">
                                                <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                                <button onclick="movePhotoInAlbum('${alb.id}', ${idx}, -1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">◀</button>
                                                <button onclick="movePhotoInAlbum('${alb.id}', ${idx}, 1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">▶</button>
                                            </div>
                                            <div data-no-edit="true" class="absolute top-2.5 right-2.5 flex items-center space-x-1">
                                                <button onclick="setAlbumCoverPhoto('${alb.id}', '${p.url}')" class="px-2 py-1 bg-yp-green text-white text-[10px] font-bold rounded shadow">设为封面</button>
                                                <button onclick="editAlbumPhotoCaption('${alb.id}', '${p.id}')" class="px-2 py-1 bg-gray-800 text-amber-400 text-[10px] font-bold rounded shadow">改字</button>
                                                <button onclick="deletePhotoFromAlbum('${alb.id}', '${p.id}')" class="w-6 h-6 bg-yp-red text-white text-xs font-bold rounded shadow">✕</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="p-3.5 bg-white text-xs font-bold text-gray-800 flex items-center justify-between">
                                        <span>${p.caption || alb.title}</span>
                                        <span class="text-[10px] text-gray-400">#${idx + 1}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;

            bindAlbumSortable(document.getElementById('album-inner-photos-grid'), '[data-alb-pid]', 'data-alb-pid', (newIds) => {
                const s = getAlbumsState();
                const targetAlb = s.albums.find(a => String(a.id) === String(alb.id));
                if (targetAlb) {
                    targetAlb.photos = newIds.map(pid => targetAlb.photos.find(x => String(x.id) === String(pid))).filter(Boolean);
                    saveAlbumsState({ albums: s.albums });
                    window.renderHomeAlbumCarousel();
                    if (typeof showToast === 'function') showToast('✅ 影集内照片顺序已保存！');
                }
            });
            return;
        }

        // 默认渲染【全部影集列表视图】
        const cols = state.albumCols || 3;
        albumRoot.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <span class="px-2.5 py-0.5 bg-yp-green/15 text-yp-darkGreen text-xs font-black rounded">TEAM PHOTO ALBUMS</span>
                    <h3 class="text-2xl font-black text-gray-900 mt-1">📸 车队风采主题影集 (${albums.length}个影集)</h3>
                    <p class="text-xs text-gray-500 mt-0.5">点击任意影集封面即可进入浏览该影集内的全部高清大图。</p>
                </div>
                ${isAdmin ? `
                    <div data-no-edit="true" class="flex flex-wrap items-center gap-2 text-xs">
                        <button onclick="openCreateAlbumModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5">
                            <i class="fa-solid fa-folder-plus"></i><span>➕ 创建新影集</span>
                        </button>
                        <button onclick="setAlbumsGridCols(2)" class="px-3 py-2 rounded-xl font-bold ${cols == 2 ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}">2列</button>
                        <button onclick="setAlbumsGridCols(3)" class="px-3 py-2 rounded-xl font-bold ${cols == 3 ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}">3列</button>
                    </div>
                ` : ''}
            </div>

            ${isAdmin ? `
                <div data-no-edit="true" class="mb-6 p-3.5 rounded-2xl bg-gray-900 text-yp-lime border border-yp-lime text-xs font-bold flex items-center justify-between">
                    <span>✥ 管理员提示：按住下方任意影集卡片可直接【拖动排序】，或点击卡片上的【◀ ▶】按钮移动顺序；点击「🎠 设为主页轮播」可将该影集投放到主页幻灯片！</span>
                </div>
            ` : ''}

            <div id="albums-outer-sortable-grid" class="grid grid-cols-1 md:grid-cols-${cols} gap-7">
                ${albums.map((alb, idx) => {
                    const count = (alb.photos || []).length;
                    const coverUrl = alb.cover || (count > 0 ? alb.photos[0].url : 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80');
                    const isHomeCarousel = state.homeCarouselAlbumId === alb.id;
                    return `
                        <div class="bg-white rounded-3xl overflow-hidden border-2 ${isHomeCarousel ? 'border-yp-green shadow-lg' : 'border-gray-200 shadow-xs'} hover:shadow-xl transition flex flex-col justify-between group relative" data-album-card-id="${alb.id}">
                            <div>
                                <div onclick="openAlbumDetailView('${alb.id}')" class="relative h-64 bg-gray-900 overflow-hidden cursor-pointer">
                                    <img src="${coverUrl}" alt="${alb.title}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"></div>
                                    <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 text-yp-lime text-xs font-bold rounded">${alb.tag || '官方影集'}</span>
                                    <span class="absolute top-3 right-3 px-2.5 py-1 bg-black/75 text-white text-xs font-bold rounded"><i class="fa-regular fa-images mr-1"></i>${count} 张照片</span>
                                    ${isHomeCarousel ? `<span class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-green text-white text-[11px] font-black rounded shadow">🎠 主页轮播中</span>` : ''}
                                    ${isAdmin ? `
                                        <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                            <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab">✥ 拖动排序</span>
                                            <button onclick="moveAlbumStep(${idx}, -1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">◀</button>
                                            <button onclick="moveAlbumStep(${idx}, 1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">▶</button>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="p-6">
                                    <h4 onclick="openAlbumDetailView('${alb.id}')" class="text-xl font-black text-gray-900 hover:text-yp-darkGreen cursor-pointer mb-2">${alb.title}</h4>
                                    <p class="text-xs text-gray-600 leading-relaxed line-clamp-2">${alb.desc || ''}</p>
                                </div>
                            </div>
                            <div data-no-edit="true" class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                                <button onclick="openAlbumDetailView('${alb.id}')" class="text-yp-darkGreen font-black hover:underline flex items-center">
                                    <span>打开影集浏览 (${count}张)</span><i class="fa-solid fa-arrow-right ml-1.5"></i>
                                </button>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-2">
                                        ${!isHomeCarousel ? `<button onclick="setHomeCarouselAlbum('${alb.id}')" class="text-amber-600 hover:underline font-bold">🎠 设为主页轮播</button>` : ''}
                                        <button onclick="deleteAlbumItem('${alb.id}')" class="text-yp-red hover:underline font-bold">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        bindAlbumSortable(document.getElementById('albums-outer-sortable-grid'), '[data-album-card-id]', 'data-album-card-id', (newIds) => {
            const s = getAlbumsState();
            const ordered = newIds.map(id => s.albums.find(a => String(a.id) === String(id))).filter(Boolean);
            if (ordered.length === s.albums.length) {
                saveAlbumsState({ albums: ordered });
                if (typeof showToast === 'function') showToast('✅ 影集排列顺序已保存！');
            }
        });
    };

    window.openAlbumDetailView = function (albumId) {
        currentViewingAlbumId = albumId;
        window.renderGalleryAlbumsSystem();
    };

    window.closeAlbumDetailView = function () {
        currentViewingAlbumId = null;
        window.renderGalleryAlbumsSystem();
    };

    window.setAlbumsGridCols = function (cols) {
        saveAlbumsState({ albumCols: Number(cols) });
        window.renderGalleryAlbumsSystem();
    };

    window.moveAlbumStep = function (idx, dir) {
        if (!isAdminUser()) return;
        const s = getAlbumsState();
        const target = idx + dir;
        if (target < 0 || target >= s.albums.length) return;
        const tmp = s.albums[idx]; s.albums[idx] = s.albums[target]; s.albums[target] = tmp;
        saveAlbumsState({ albums: s.albums });
        window.renderGalleryAlbumsSystem();
    };

    window.deleteAlbumItem = function (albumId) {
        if (!isAdminUser() || !confirm('确定要删除整个影集及其内部照片吗？')) return;
        const s = getAlbumsState();
        const filtered = s.albums.filter(a => String(a.id) !== String(albumId));
        if (s.homeCarouselAlbumId === albumId && filtered.length > 0) {
            s.homeCarouselAlbumId = filtered[0].id;
        }
        currentViewingAlbumId = null;
        saveAlbumsState({ albums: filtered, homeCarouselAlbumId: s.homeCarouselAlbumId });
        window.renderGalleryAlbumsSystem();
        window.renderHomeAlbumCarousel();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该影集');
    };

    window.editAlbumMetaPrompt = function (albumId) {
        if (!isAdminUser()) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        const t = prompt('修改影集名称：', alb.title);
        if (t && t.trim()) alb.title = t.trim();
        const tag = prompt('修改影集分类标签：', alb.tag || '官方影集');
        if (tag !== null) alb.tag = tag.trim();
        const d = prompt('修改影集简介说明：', alb.desc || '');
        if (d !== null) alb.desc = d.trim();
        saveAlbumsState({ albums: s.albums });
        window.renderGalleryAlbumsSystem();
        window.renderHomeAlbumCarousel();
    };

    // 创建新影集弹窗
    window.openCreateAlbumModal = function () {
        let m = document.getElementById('yp-create-album-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-create-album-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            m.innerHTML = `
                <div onclick="document.getElementById('yp-create-album-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
                <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                    <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                        <h3 class="text-lg font-black text-yp-lime">📸 创建新车队风采影集</h3>
                        <button onclick="document.getElementById('yp-create-album-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitCreateAlbumModal(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-3 gap-3">
                            <div class="col-span-2"><label class="block font-bold mb-1">影集标题 *</label><input type="text" id="nalb-title" required placeholder="如：2027环鄱阳湖赛场影集" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">分类标签</label><input type="text" id="nalb-tag" value="赛事影集" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">影集简介说明</label><textarea id="nalb-desc" rows="2" placeholder="输入对该影集的介绍..." class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <div><label class="block font-bold mb-1">批量选择初始照片上传（支持一次选多张）</label><input type="file" id="nalb-files" accept="image/*" multiple class="w-full text-xs"></div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 立即创建影集</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitCreateAlbumModal = function (e) {
        e.preventDefault();
        const title = document.getElementById('nalb-title').value.trim();
        const tag = document.getElementById('nalb-tag').value.trim() || '车队影集';
        const desc = document.getElementById('nalb-desc').value.trim();
        const files = Array.from(document.getElementById('nalb-files').files || []);

        const finishCreate = (photosArr) => {
            const s = getAlbumsState();
            const newId = 'alb_' + Date.now();
            s.albums.unshift({
                id: newId,
                title,
                tag,
                desc,
                cover: photosArr.length > 0 ? photosArr[0].url : '',
                photos: photosArr
            });
            saveAlbumsState({ albums: s.albums });
            currentViewingAlbumId = newId;
            window.renderGalleryAlbumsSystem();
            window.renderHomeAlbumCarousel();
            e.target.reset();
            document.getElementById('yp-create-album-modal').classList.add('hidden');
            if (typeof showToast === 'function') showToast(`✅ 新影集「${title}」已创建！`);
        };

        if (files.length === 0) {
            finishCreate([]);
        } else {
            const arr = [];
            let k = 0;
            files.forEach(f => {
                const r = new FileReader();
                r.onload = ev => {
                    arr.push({ id: 'ap_' + Date.now() + Math.random().toString(36).slice(2, 5), url: ev.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                    if (++k === files.length) finishCreate(arr);
                };
                r.readAsDataURL(f);
            });
        }
    };

    window.uploadPhotosToAlbum = function (ev, albumId) {
        if (!isAdminUser()) return;
        const files = Array.from(ev.target.files || []);
        if (!files.length) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        let k = 0;
        files.forEach(f => {
            const r = new FileReader();
            r.onload = e => {
                alb.photos.push({ id: 'ap_' + Date.now() + Math.random().toString(36).slice(2, 5), url: e.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                if (!alb.cover) alb.cover = e.target.result;
                if (++k === files.length) {
                    saveAlbumsState({ albums: s.albums });
                    window.renderGalleryAlbumsSystem();
                    window.renderHomeAlbumCarousel();
                    if (typeof showToast === 'function') showToast(`✅ 已向影集添加 ${files.length} 张新照片！`);
                }
            };
            r.readAsDataURL(f);
        });
    };

    window.addPhotoUrlToAlbum = function (e, albumId) {
        e.preventDefault();
        if (!isAdminUser()) return;
        const url = document.getElementById('alb-photo-url-input')?.value.trim();
        const cap = document.getElementById('alb-photo-cap-input')?.value.trim();
        if (!url) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        alb.photos.push({ id: 'ap_' + Date.now(), url, caption: cap || alb.title });
        if (!alb.cover) alb.cover = url;
        saveAlbumsState({ albums: s.albums });
        window.renderGalleryAlbumsSystem();
        window.renderHomeAlbumCarousel();
    };

    window.movePhotoInAlbum = function (albumId, idx, dir) {
        if (!isAdminUser()) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        if (!alb || idx + dir < 0 || idx + dir >= alb.photos.length) return;
        const tmp = alb.photos[idx]; alb.photos[idx] = alb.photos[idx + dir]; alb.photos[idx + dir] = tmp;
        saveAlbumsState({ albums: s.albums });
        window.renderGalleryAlbumsSystem();
        window.renderHomeAlbumCarousel();
    };

    window.setAlbumCoverPhoto = function (albumId, photoUrl) {
        if (!isAdminUser()) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        if (alb) {
            alb.cover = photoUrl;
            saveAlbumsState({ albums: s.albums });
            if (typeof showToast === 'function') showToast('⭐ 已设为该影集封面！');
        }
    };

    window.editAlbumPhotoCaption = function (albumId, photoId) {
        if (!isAdminUser()) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        const p = alb?.photos.find(x => String(x.id) === String(photoId));
        if (!p) return;
        const txt = prompt('修改照片说明文字：', p.caption || '');
        if (txt !== null) {
            p.caption = txt.trim();
            saveAlbumsState({ albums: s.albums });
            window.renderGalleryAlbumsSystem();
            window.renderHomeAlbumCarousel();
        }
    };

    window.deletePhotoFromAlbum = function (albumId, photoId) {
        if (!isAdminUser()) return;
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(albumId));
        if (alb) {
            alb.photos = alb.photos.filter(x => String(x.id) !== String(photoId));
            saveAlbumsState({ albums: s.albums });
            window.renderGalleryAlbumsSystem();
            window.renderHomeAlbumCarousel();
        }
    };

    // =========================================================================
    // 四、主页（#page-home）选定影集照片 · 幻灯片/滚动自动播放器
    // =========================================================================
    let carouselSlideIdx = 0;
    let carouselTimer = null;
    let carouselPaused = false;

    window.setHomeCarouselAlbum = function (albumId) {
        carouselSlideIdx = 0;
        saveAlbumsState({ homeCarouselAlbumId: albumId });
        window.renderHomeAlbumCarousel();
        if (document.getElementById('page-gallery')?.classList.contains('active')) {
            window.renderGalleryAlbumsSystem();
        }
        if (typeof showToast === 'function') showToast('🎠 已更新主页幻灯片轮播的影集！');
    };

    window.setHomeCarouselSpeed = function (sec) {
        saveAlbumsState({ carouselIntervalSec: Number(sec) });
        window.renderHomeAlbumCarousel();
    };

    window.stepHomeCarousel = function (dir) {
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(s.homeCarouselAlbumId)) || s.albums[0];
        if (!alb || !alb.photos.length) return;
        carouselSlideIdx = (carouselSlideIdx + dir + alb.photos.length) % alb.photos.length;
        updateCarouselSlideDOM(alb);
    };

    window.goToHomeCarouselSlide = function (idx) {
        const s = getAlbumsState();
        const alb = s.albums.find(a => String(a.id) === String(s.homeCarouselAlbumId)) || s.albums[0];
        if (!alb) return;
        carouselSlideIdx = idx;
        updateCarouselSlideDOM(alb);
    };

    window.toggleHomeCarouselPause = function () {
        carouselPaused = !carouselPaused;
        const btn = document.getElementById('btn-carousel-pause');
        if (btn) btn.innerHTML = carouselPaused ? '<i class="fa-solid fa-play mr-1"></i>继续滚动' : '<i class="fa-solid fa-pause mr-1"></i>暂停滚动';
    };

    window.jumpToSelectedAlbumInGallery = function (albumId) {
        currentViewingAlbumId = albumId;
        if (typeof window.switchPage === 'function') window.switchPage('gallery');
        window.renderGalleryAlbumsSystem();
    };

    function updateCarouselSlideDOM(alb) {
        const photos = alb.photos || [];
        if (!photos.length) return;
        if (carouselSlideIdx >= photos.length) carouselSlideIdx = 0;
        const cur = photos[carouselSlideIdx];

        const imgEl = document.getElementById('yp-home-carousel-img');
        const capEl = document.getElementById('yp-home-carousel-cap');
        const idxEl = document.getElementById('yp-home-carousel-counter');
        if (imgEl) imgEl.src = cur.url;
        if (capEl) capEl.textContent = cur.caption || alb.title;
        if (idxEl) idxEl.textContent = `${carouselSlideIdx + 1} / ${photos.length}`;

        document.querySelectorAll('.yp-carousel-dot').forEach((dot, i) => {
            dot.className = i === carouselSlideIdx
                ? 'yp-carousel-dot w-7 h-2 rounded-full bg-yp-lime transition-all cursor-pointer'
                : 'yp-carousel-dot w-2 h-2 rounded-full bg-white/40 hover:bg-white/80 transition-all cursor-pointer';
        });
    }

    window.renderHomeAlbumCarousel = function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;

        // 隐藏旧版简单静态三图展示区，由全新的“选定影集幻灯片播放器”升级替代
        const oldShowcase = document.getElementById('home-photo-showcase-sec');
        if (oldShowcase) oldShowcase.classList.add('hidden');

        let carouselSec = document.getElementById('yp-home-album-carousel-sec');
        if (!carouselSec) {
            carouselSec = document.createElement('section');
            carouselSec.id = 'yp-home-album-carousel-sec';
            carouselSec.setAttribute('data-hsec-id', 'sec_album_carousel');
            carouselSec.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10';
            const heroSec = homePage.querySelector('section.hero-bg');
            if (heroSec && heroSec.nextSibling) {
                homePage.insertBefore(carouselSec, heroSec.nextSibling);
            } else {
                homePage.appendChild(carouselSec);
            }
        }

        const s = getAlbumsState();
        const isAdmin = isAdminUser();
        const alb = s.albums.find(a => String(a.id) === String(s.homeCarouselAlbumId)) || s.albums[0];
        if (!alb || !alb.photos || alb.photos.length === 0) {
            carouselSec.innerHTML = '';
            return;
        }

        if (carouselSlideIdx >= alb.photos.length) carouselSlideIdx = 0;
        const curPhoto = alb.photos[carouselSlideIdx];

        carouselSec.innerHTML = `
            ${isAdmin ? `
                <div data-no-edit="true" class="mb-4 p-3.5 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded">🎠 主页影集幻灯片设置</span>
                        <span class="font-bold text-gray-200">选择要在主页自动滚动播放的影集：</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <select onchange="setHomeCarouselAlbum(this.value)" class="rounded-xl bg-gray-800 border border-gray-600 px-3 py-1.5 text-yp-lime font-black">
                            ${s.albums.map(a => `<option value="${a.id}" ${a.id === alb.id ? 'selected' : ''}>📸 ${a.title} (${(a.photos || []).length}张)</option>`).join('')}
                        </select>
                        <select onchange="setHomeCarouselSpeed(this.value)" class="rounded-xl bg-gray-800 border border-gray-600 px-2.5 py-1.5 text-white font-bold">
                            <option value="3" ${s.carouselIntervalSec == 3 ? 'selected' : ''}>轮播速度：3秒/张</option>
                            <option value="4" ${s.carouselIntervalSec == 4 ? 'selected' : ''}>轮播速度：4秒/张</option>
                            <option value="6" ${s.carouselIntervalSec == 6 ? 'selected' : ''}>轮播速度：6秒/张</option>
                        </select>
                        <button onclick="jumpToSelectedAlbumInGallery('${alb.id}')" class="px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl">
                            ⚙️ 管理此影集照片
                        </button>
                    </div>
                </div>
            ` : ''}

            <div class="bg-gray-900 rounded-3xl overflow-hidden border-2 border-gray-800 shadow-2xl relative group" data-no-edit="true">
                <!-- 顶部影集信息浮层 -->
                <div class="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div class="px-3.5 py-1.5 rounded-full bg-gray-900/85 backdrop-blur-md border border-white/15 text-white text-xs font-black flex items-center space-x-2 pointer-events-auto">
                        <span class="w-2 h-2 rounded-full bg-yp-lime animate-ping"></span>
                        <span>正在轮播影集：${alb.title}</span>
                        <span id="yp-home-carousel-counter" class="text-yp-lime ml-1">${carouselSlideIdx + 1} / ${alb.photos.length}</span>
                    </div>
                    <div class="flex items-center space-x-2 pointer-events-auto">
                        <button id="btn-carousel-pause" onclick="toggleHomeCarouselPause()" class="px-3 py-1.5 rounded-full bg-gray-900/85 backdrop-blur-md border border-white/15 text-gray-200 hover:text-white text-xs font-bold transition">
                            <i class="fa-solid fa-pause mr-1"></i>暂停滚动
                        </button>
                        <button onclick="jumpToSelectedAlbumInGallery('${alb.id}')" class="px-3.5 py-1.5 rounded-full bg-yp-green/90 hover:bg-yp-green text-white text-xs font-black shadow transition">
                            查看完整影集 &rarr;
                        </button>
                    </div>
                </div>

                <!-- 幻灯片大图主舞台 -->
                <div class="relative h-[380px] sm:h-[480px] lg:h-[520px] w-full bg-black overflow-hidden">
                    <img id="yp-home-carousel-img" src="${curPhoto.url}" alt="${alb.title}" class="w-full h-full object-cover transition-all duration-700">
                    <div class="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-transparent to-black/30"></div>

                    <!-- 左右切换按钮 -->
                    <button onclick="stepHomeCarousel(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gray-900/75 hover:bg-yp-green text-white flex items-center justify-center shadow-lg transition">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button onclick="stepHomeCarousel(1)" class="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gray-900/75 hover:bg-yp-green text-white flex items-center justify-center shadow-lg transition">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>

                    <!-- 底部图注与进度圆点 -->
                    <div class="absolute bottom-5 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <span class="px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[10px] font-black rounded uppercase">${alb.tag || 'FEATURED ALBUM'}</span>
                            <div id="yp-home-carousel-cap" class="text-lg sm:text-2xl font-black text-white mt-1.5 drop-shadow">${curPhoto.caption || alb.title}</div>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${alb.photos.map((_, i) => `
                                <span onclick="goToHomeCarouselSlide(${i})" class="yp-carousel-dot ${i === carouselSlideIdx ? 'w-7 bg-yp-lime' : 'w-2 bg-white/40 hover:bg-white/80'} h-2 rounded-full transition-all cursor-pointer"></span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 启动自动滚动定时器
        clearInterval(carouselTimer);
        carouselTimer = setInterval(() => {
            if (carouselPaused) return;
            const hp = document.getElementById('page-home');
            if (hp && hp.classList.contains('active')) {
                window.stepHomeCarousel(1);
            }
        }, (s.carouselIntervalSec || 4) * 1000);
    };

    // =========================================================================
    // 五、无冲突统一挂载与生命周期监听
    // =========================================================================
    function runUpdate02All() {
        cleanLoginModalAdminHint();
        window.renderSponsorshipModule();
        window.renderSponsorsBar();
        window.renderGalleryAlbumsSystem();
        window.renderHomeAlbumCarousel();
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(runUpdate02All, 140);

        const prevSwitch = window.switchPage;
        if (prevSwitch) {
            window.switchPage = function (pageId) {
                if (pageId === 'partners') pageId = 'sponsorship';
                prevSwitch(pageId);
                if (pageId === 'sponsorship') window.renderSponsorshipModule();
                if (pageId === 'gallery') window.renderGalleryAlbumsSystem();
                if (pageId === 'home') window.renderHomeAlbumCarousel();
                if (window.__ypLang && window.__ypLang !== 'zh' && typeof window.translateEntireDOM === 'function') {
                    setTimeout(() => window.translateEntireDOM(window.__ypLang), 60);
                }
            };
        }

        const prevAuth = window.updateAuthUI;
        if (prevAuth) {
            window.updateAuthUI = function () {
                prevAuth();
                setTimeout(runUpdate02All, 40);
            };
        }
    });
})();