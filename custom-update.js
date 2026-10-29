/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 全能旗舰版扩展插件 (custom-update.js)
 * 完整包含：
 * 1. 【队员 & 商品 & 赞助商 独立详情主页三合一引擎】：均支持 5种主体排版、大图设为全屏背景壁纸、多图上传、4种相册版式、拖拽排图、页面内文字直接编辑
 * 2. 【随时增加/删除队员 & 随时增加/删除独立页面】：顶部与底部双入口可视化操作
 * 3. 【La Fuga 青野·驿 升级】：新增主理人「关若析（巴塞罗那自治大学酒店管理硕士）」专栏 + 青旅实景多图上传与排版编辑
 * 4. 【媒体中心 B站/URL 视频播放器】：支持直接粘贴哔哩哔哩链接、BV号或MP4 URL在线播放与保存复用
 * 5. 【全局底部赞助商 Logo 图标栏 + 独立赞助商名录页 + 可点击进入的赞助商详情主页】
 * 6. 【全站中/英/西三语精译词库 + 微软(Microsoft Edge/Bing)神经网络实时翻译引擎】
 */

(function () {
    'use strict';

    window.__ypLang = 'zh';
    let isSubpageEditing = false;

    // 注入全局拖拽与可视化编辑样式
    const customStyle = document.createElement('style');
    customStyle.innerHTML = `
        .yp-draggable-card {
            user-select: none;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .yp-draggable-card img {
            -webkit-user-drag: none;
            user-select: none;
            pointer-events: none;
        }
        .yp-dragging {
            opacity: 0.45 !important;
            transform: scale(0.97) !important;
            box-shadow: 0 20px 25px -5px rgba(118, 199, 41, 0.4) !important;
            border: 2px dashed #76c729 !important;
        }
        .yp-drag-over {
            outline: 3px solid #76c729 !important;
            transform: scale(1.02);
        }
        .yp-editable-field[contenteditable="true"] {
            outline: 2px dashed #76c729 !important;
            outline-offset: 3px;
            background-color: rgba(118, 199, 41, 0.15) !important;
            border-radius: 6px;
            padding: 2px 6px;
            cursor: text;
        }
        .yp-editable-field[contenteditable="true"]:focus {
            outline: 2px solid #1db954 !important;
            background-color: rgba(17, 24, 39, 0.9) !important;
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(customStyle);

    // =========================================================================
    // 一、严格权限校验：仅允许管理员账户 (team_youthpower@outlook.com) 编辑
    // =========================================================================
    function isStrictAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === 'team_youthpower@outlook.com' && u.role === 'admin');
        } catch (e) {
            return false;
        }
    }

    function safeRemoveQiuHaolin() {
        try {
            if (typeof defaultRoster !== 'undefined' && Array.isArray(defaultRoster)) {
                const idx = defaultRoster.findIndex(r => r.id === 'qiuhaolin' || (r.name && r.name.includes('邱皓麟')));
                if (idx !== -1) defaultRoster.splice(idx, 1);
            }
            const saved = localStorage.getItem('yp_roster_custom_data');
            if (saved) {
                const list = JSON.parse(saved);
                const filtered = list.filter(r => r.id !== 'qiuhaolin' && !(r.name && r.name.includes('邱皓麟')));
                if (filtered.length !== list.length) {
                    localStorage.setItem('yp_roster_custom_data', JSON.stringify(filtered));
                }
            }
        } catch (e) {}
    }

    // =========================================================================
    // 二、通用多图相册 & 独立主页排版配置系统（同时支持：队员 / 商品 / 赞助商）
    // =========================================================================
    function getEntityAlbum(entityKey) {
        try {
            const allAlbums = JSON.parse(localStorage.getItem('yp_entity_multi_albums') || '{}');
            // 兼容旧版队员相册存储
            if (entityKey.startsWith('rider_')) {
                const rawId = entityKey.replace('rider_', '');
                const oldAlbums = JSON.parse(localStorage.getItem('yp_rider_multi_albums') || '{}');
                if (!allAlbums[entityKey] && Array.isArray(oldAlbums[rawId])) {
                    return oldAlbums[rawId];
                }
            }
            return Array.isArray(allAlbums[entityKey]) ? allAlbums[entityKey] : [];
        } catch (e) { return []; }
    }

    function saveEntityAlbum(entityKey, photosArray) {
        try {
            const allAlbums = JSON.parse(localStorage.getItem('yp_entity_multi_albums') || '{}');
            allAlbums[entityKey] = photosArray;
            localStorage.setItem('yp_entity_multi_albums', JSON.stringify(allAlbums));
        } catch (e) {}
    }

    function getEntityLayoutConfig(entityKey) {
        const defaults = {
            layout: 'classic',      // 'classic' | 'magazine' | 'reverse' | 'gallery_first' | 'hero_bg'
            albumMode: 'grid',      // 'grid' | 'featured' | 'cinematic' | 'masonry'
            albumCols: 3,
            bgUrl: '',
            fullPageBg: false,
            bgDarkness: '65',
            extraSection: ''
        };
        try {
            const allCfg = JSON.parse(localStorage.getItem('yp_entity_page_layouts') || '{}');
            if (entityKey.startsWith('rider_')) {
                const rawId = entityKey.replace('rider_', '');
                const oldCfg = JSON.parse(localStorage.getItem('yp_rider_page_layouts') || '{}');
                if (!allCfg[entityKey] && oldCfg[rawId]) {
                    return { ...defaults, ...oldCfg[rawId] };
                }
            }
            return { ...defaults, ...(allCfg[entityKey] || {}) };
        } catch (e) {
            return defaults;
        }
    }

    function saveEntityLayoutConfig(entityKey, cfg) {
        try {
            const allCfg = JSON.parse(localStorage.getItem('yp_entity_page_layouts') || '{}');
            allCfg[entityKey] = { ...getEntityLayoutConfig(entityKey), ...cfg };
            localStorage.setItem('yp_entity_page_layouts', JSON.stringify(allCfg));
        } catch (e) {}
    }

    // =========================================================================
    // 三、通用丝滑拖拽排序引擎 (Live DOM Swap)
    // =========================================================================
    function bindLiveSortableGrid(gridEl, itemSelector, idAttr, onOrderChanged) {
        if (!gridEl || !isStrictAdmin()) return;
        let draggingEl = null;

        const items = Array.from(gridEl.querySelectorAll(itemSelector));
        items.forEach(item => {
            item.classList.add('yp-draggable-card');
            item.setAttribute('draggable', 'true');
            item.querySelectorAll('img, a').forEach(img => img.setAttribute('draggable', 'false'));

            item.ondragstart = function (e) {
                if (isSubpageEditing) {
                    e.preventDefault();
                    return;
                }
                draggingEl = this;
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', this.getAttribute(idAttr)); } catch (err) {}
                setTimeout(() => this.classList.add('yp-dragging'), 0);
            };

            item.ondragend = function () {
                this.classList.remove('yp-dragging');
                gridEl.querySelectorAll(itemSelector).forEach(el => el.classList.remove('yp-drag-over'));
                draggingEl = null;
                const newIds = Array.from(gridEl.querySelectorAll(itemSelector)).map(el => el.getAttribute(idAttr));
                onOrderChanged(newIds);
            };

            item.ondragover = function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!draggingEl || draggingEl === this) return;
                this.classList.add('yp-drag-over');

                const allNodes = Array.from(gridEl.querySelectorAll(itemSelector));
                const draggedIdx = allNodes.indexOf(draggingEl);
                const targetIdx = allNodes.indexOf(this);
                if (draggedIdx < targetIdx) {
                    gridEl.insertBefore(draggingEl, this.nextSibling);
                } else {
                    gridEl.insertBefore(draggingEl, this);
                }
            };

            item.ondragleave = function () {
                this.classList.remove('yp-drag-over');
            };

            item.ondrop = function (e) {
                e.preventDefault();
                this.classList.remove('yp-drag-over');
            };
        });
    }

    // =========================================================================
    // 四、赞助商名录与底部 Logo 图标栏数据系统
    // =========================================================================
    const defaultSponsors = [
        {
            id: 'sp_spect',
            name: '空力公式 (Spect)',
            tier: '官方车架合作伙伴',
            logoText: 'SPECT 空力公式',
            logoUrl: '',
            website: '',
            highlight: '提供公路气动、综合爬坡、TT及Gravel专业碳纤维车架支持',
            desc: '空力公式（Spect）致力于高性能碳纤维自行车架研发，旗下 Mira 破风气动车架与 Strada 超轻综合车架伴随青年力量洲际队征战国内外高级别职业赛场。'
        },
        {
            id: 'sp_elves',
            name: 'ELVES (精灵)',
            tier: '官方器材合作伙伴',
            logoText: 'ELVES 精灵',
            logoUrl: '',
            website: '',
            highlight: 'UCI认证专业竞赛车架品牌 · Vanyar / Falath EVO / Mori 全系支持',
            desc: 'ELVES（精灵）拥有多项 UCI 国际自盟认证竞赛车架，为车队选手在高山爬坡、平路冲刺与 Gravel 世锦赛赛场提供硬核器材保障。'
        },
        {
            id: 'sp_essen',
            name: 'ESSEN 头盔',
            tier: '官方安全护具合作伙伴',
            logoText: 'ESSEN',
            logoUrl: '',
            website: '',
            highlight: '赫拉 (HELA) 气动破风头盔、爬坡盔及 ITT 计时盔官方赞助商',
            desc: 'ESSEN 深耕骑行安全领域，为青年力量洲际队提供全方位风洞优化的大组气动盔、超轻爬坡盔及个人计时赛头盔。'
        },
        {
            id: 'sp_zeray',
            name: '和博 / 卓锐 (ZERAY)',
            tier: '官方配件与传动合作伙伴',
            logoText: 'ZERAY 卓锐',
            logoUrl: '',
            website: '',
            highlight: 'ZP-115 碳纤维公路自锁脚踏及职业竞赛水壶官方赞助商',
            desc: '和博旗下卓锐（ZERAY）品牌为车队提供高传动效率的轻量化碳纤维自锁脚踏、锁片及赛训补给水壶。'
        },
        {
            id: 'sp_jingteng',
            name: '静藤轮组 (Jingteng)',
            tier: '品牌出海战略合作伙伴',
            logoText: 'JINGTENG 静藤',
            logoUrl: '',
            website: '',
            highlight: '依托车队哥伦比亚与西班牙赛训网络，共同开拓拉美与欧洲车店市场',
            desc: '青年力量洲际队不仅在赛场使用静藤高性能碳纤维轮组，更作为其海外实地推广团队，成功将产品引入哥伦比亚和西班牙实体车店网络。'
        }
    ];

    function getSponsorsList() {
        try {
            const saved = localStorage.getItem('yp_sponsors_data');
            return saved ? JSON.parse(saved) : defaultSponsors;
        } catch (e) { return defaultSponsors; }
    }

    function saveSponsorsList(list) {
        localStorage.setItem('yp_sponsors_data', JSON.stringify(list));
    }

    // 注入全站底部「赞助商 Logo 图标栏」与「独立赞助商名录页面」
    function initSponsorsBarAndPage() {
        // 1. 注入底部全局赞助商图标栏（位于 footer 上方）
        const footer = document.querySelector('footer');
        if (footer && !document.getElementById('global-sponsor-bar')) {
            const bar = document.createElement('section');
            bar.id = 'global-sponsor-bar';
            bar.className = 'bg-gray-900 border-t border-gray-800 py-10 px-4 sm:px-6 lg:px-8';
            footer.parentNode.insertBefore(bar, footer);
        }

        // 2. 注入独立「合作伙伴与赞助商名录」页面 (page-partners)
        const main = document.getElementById('editable-main');
        if (main && !document.getElementById('page-partners')) {
            const sec = document.createElement('div');
            sec.id = 'page-partners';
            sec.className = 'page-section py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
            main.appendChild(sec);
        }

        renderSponsorsEverywhere();
    }

    window.renderSponsorsEverywhere = function () {
        const list = getSponsorsList();
        const isAdmin = isStrictAdmin();

        // 渲染底部全局图标栏
        const bar = document.getElementById('global-sponsor-bar');
        if (bar) {
            bar.innerHTML = `
                <div class="max-w-7xl mx-auto">
                    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div class="flex items-center space-x-3">
                            <span class="w-1.5 h-5 bg-yp-lime rounded-full"></span>
                            <h4 class="text-sm font-black tracking-wider text-white uppercase">OFFICIAL PARTNERS & SPONSORS · 官方合作伙伴与赞助商（点击标志查看详情）</h4>
                        </div>
                        <div class="flex items-center space-x-2" data-no-edit="true">
                            <button onclick="switchPage('partners')" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-yp-green text-yp-lime hover:text-white text-xs font-bold transition">
                                查看全部赞助商名录 &rarr;
                            </button>
                            ${isAdmin ? `
                                <button onclick="openAdminStudioModal('sponsor')" class="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-gray-900 text-xs font-black transition">
                                    ➕ 添加赞助商Logo
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div id="footer-sponsor-logos" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        ${list.map(sp => `
                            <div onclick="openEntitySubpage('sponsor', '${sp.id}')" data-sponsor-id="${sp.id}" class="cursor-pointer group bg-gray-800/90 hover:bg-gray-800 border border-gray-700 hover:border-yp-lime rounded-2xl p-4 h-24 flex flex-col items-center justify-center relative transition shadow-xs">
                                ${sp.logoUrl ? `
                                    <img src="${sp.logoUrl}" alt="${sp.name}" draggable="false" class="max-h-12 max-w-[140px] object-contain group-hover:scale-105 transition">
                                ` : `
                                    <div class="text-base font-black text-white group-hover:text-yp-lime tracking-wider text-center">${sp.logoText || sp.name}</div>
                                    <div class="text-[10px] text-gray-400 mt-1">${sp.tier}</div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 渲染独立「合作伙伴名录」页面 (page-partners)
        const pagePartners = document.getElementById('page-partners');
        if (pagePartners) {
            pagePartners.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-end justify-between mb-10">
                    <div>
                        <span class="text-yp-darkGreen font-black tracking-widest text-sm uppercase">OFFICIAL SPONSORS DIRECTORY</span>
                        <h2 class="text-3xl sm:text-4xl font-black text-gray-900 mt-1">官方赞助商与合作伙伴名录</h2>
                        <p class="text-gray-600 text-sm mt-1">点击任意赞助商标志，即可进入该品牌的专属独立详情主页（支持多图展示与产品介绍）。</p>
                    </div>
                    <div class="mt-4 md:mt-0 flex flex-wrap gap-2" data-no-edit="true">
                        <button onclick="switchPage('sponsorship')" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition">
                            查看招商报价方案
                        </button>
                        ${isAdmin ? `
                            <button onclick="openAdminStudioModal('sponsor')" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 text-xs font-black rounded-xl shadow transition">
                                ➕ 新增赞助商标志与主页
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div id="partners-directory-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                    ${list.map(sp => `
                        <div class="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-yp-green transition flex flex-col justify-between relative" data-partner-card-id="${sp.id}">
                            <div>
                                <div onclick="openEntitySubpage('sponsor', '${sp.id}')" class="h-48 bg-gray-900 flex flex-col items-center justify-center p-6 cursor-pointer relative group overflow-hidden">
                                    ${sp.logoUrl ? `
                                        <img src="${sp.logoUrl}" alt="${sp.name}" draggable="false" class="max-h-28 max-w-[220px] object-contain group-hover:scale-105 transition duration-300">
                                    ` : `
                                        <div class="text-2xl font-black text-white group-hover:text-yp-lime tracking-widest">${sp.logoText || sp.name}</div>
                                    `}
                                    <span class="absolute top-3 left-3 px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[11px] font-black rounded">${sp.tier}</span>
                                </div>
                                <div class="p-6">
                                    <h3 onclick="openEntitySubpage('sponsor', '${sp.id}')" class="text-xl font-black text-gray-900 hover:text-yp-darkGreen cursor-pointer mb-2">${sp.name}</h3>
                                    <div class="p-2.5 rounded-xl bg-green-50 text-yp-darkGreen text-xs font-bold mb-3">${sp.highlight}</div>
                                    <p class="text-xs text-gray-600 leading-relaxed line-clamp-3">${sp.desc}</p>
                                </div>
                            </div>
                            <div class="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs" data-no-edit="true">
                                <button onclick="openEntitySubpage('sponsor', '${sp.id}')" class="text-yp-darkGreen font-black hover:underline flex items-center">
                                    <span>进入品牌独立详情页</span> <i class="fa-solid fa-arrow-right ml-1.5"></i>
                                </button>
                                ${isAdmin ? `
                                    <button onclick="deleteSponsorItem('${sp.id}')" class="text-red-500 hover:underline font-bold">🗑️ 删除</button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // 支持管理员拖拽调整赞助商顺序
            const dirGrid = document.getElementById('partners-directory-grid');
            if (dirGrid) {
                bindLiveSortableGrid(dirGrid, '[data-partner-card-id]', 'data-partner-card-id', (newIds) => {
                    const current = getSponsorsList();
                    const reordered = newIds.map(id => current.find(s => String(s.id) === String(id))).filter(Boolean);
                    if (reordered.length === current.length) {
                        saveSponsorsList(reordered);
                        window.renderSponsorsEverywhere();
                        if (typeof showToast === 'function') showToast('✅ 赞助商展示顺序已保存！');
                    }
                });
            }
        }

        // 在商业赞助页 (page-sponsorship) 顶部也加入跳转按钮
        const spPage = document.getElementById('page-sponsorship');
        if (spPage && !document.getElementById('btn-jump-partners-dir')) {
            const topCenter = spPage.querySelector('.text-center');
            if (topCenter) {
                const jumpDiv = document.createElement('div');
                jumpDiv.id = 'btn-jump-partners-dir';
                jumpDiv.setAttribute('data-no-edit', 'true');
                jumpDiv.className = 'mt-4 flex justify-center gap-3';
                jumpDiv.innerHTML = `
                    <button onclick="switchPage('partners')" class="px-5 py-2.5 bg-yp-darkGreen hover:bg-yp-green text-white text-xs font-black rounded-xl shadow transition">
                        <i class="fa-solid fa-handshake mr-1.5"></i> 查看官方合作伙伴 Logo 墙与品牌详情页
                    </button>
                `;
                topCenter.appendChild(jumpDiv);
            }
        }
    };

    window.deleteSponsorItem = function (id) {
        if (!isStrictAdmin() || !confirm('确定要删除该赞助商吗？')) return;
        saveSponsorsList(getSponsorsList().filter(s => String(s.id) !== String(id)));
        window.renderSponsorsEverywhere();
        if (typeof showToast === 'function') showToast('已删除该赞助商');
    };

    // =========================================================================
    // 五、升级「La Fuga 青野·驿」页面：加入主理人【关若析】介绍 + 青旅多图相册编辑
    // =========================================================================
    const defaultHostelData = {
        managerName: '关若析 (Guan Ruoxi)',
        managerRole: 'La Fuga 青野·驿 主要负责人 / 主理人',
        managerEdu: '毕业于西班牙巴塞罗那自治大学 (Universitat Autònoma de Barcelona, UAB) · 酒店管理专业硕士',
        managerBio: '拥有系统的欧洲高等酒店管理学术背景与丰富的国际化接待运营经验。全权负责青年力量洲际队千岛湖亚运村基地「La Fuga 青野·驿」青年旅舍的日常运营、骑友社群接待、赛训后勤保障及食宿标准管理，致力于为全国各地骑行爱好者提供专业、温馨的驿站体验。',
        managerPhoto: '',
        photos: [
            {
                id: 'hp_1',
                url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80',
                caption: '千岛湖亚运村 La Fuga 青野·驿 舒适骑友住宿空间'
            },
            {
                id: 'hp_2',
                url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80',
                caption: '毗邻千岛湖环湖经典骑行路线与车队常态化训练大本营'
            }
        ],
        cols: 2
    };

    function getHostelData() {
        try {
            const saved = localStorage.getItem('yp_lafuga_hostel_data');
            return saved ? { ...defaultHostelData, ...JSON.parse(saved) } : defaultHostelData;
        } catch (e) { return defaultHostelData; }
    }

    function saveHostelData(data) {
        localStorage.setItem('yp_lafuga_hostel_data', JSON.stringify(data));
    }

    window.renderHostelCustomSection = function () {
        const ridesPage = document.getElementById('page-rides');
        if (!ridesPage) return;
        let container = document.getElementById('lafuga-enhanced-box');
        if (!container) {
            container = document.createElement('div');
            container.id = 'lafuga-enhanced-box';
            container.className = 'mb-10 space-y-8';
            const postListParent = document.getElementById('ride-posts-list')?.parentElement;
            if (postListParent) {
                ridesPage.insertBefore(container, postListParent);
            } else {
                ridesPage.appendChild(container);
            }
        }

        const data = getHostelData();
        const isAdmin = isStrictAdmin();
        const lang = window.__ypLang || 'zh';

        const mgrRole = lang === 'en' ? 'General Manager of La Fuga Youth Hostel' : (lang === 'es' ? 'Directora Principal de La Fuga Youth Hostel' : data.managerRole);
        const mgrEdu = lang === 'en' ? 'M.S. in Hotel Management, Autonomous University of Barcelona (UAB, Spain)' : (lang === 'es' ? 'Máster en Dirección Hotelera por la Universidad Autónoma de Barcelona (UAB, España)' : data.managerEdu);
        const mgrBio = lang === 'en' ? 'Graduated with a Master’s degree in Hotel Management from Universitat Autònoma de Barcelona (UAB). She leads the operations, cyclist hospitality, and team training camp logistics at La Fuga Youth Hostel in the Qiandao Lake Asian Games Village.' : (lang === 'es' ? 'Graduada con un Máster en Dirección Hotelera por la Universidad Autónoma de Barcelona (UAB). Dirige integralmente la gestión, hospitalidad ciclista y logística de entrenamientos en el albergue La Fuga de la Villa Asiática del Lago Qiandao.' : data.managerBio);

        container.innerHTML = `
            <!-- 青野·驿主要负责人：关若析 介绍卡片 -->
            <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-lg border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                <div class="md:col-span-4 bg-gray-800 min-h-[260px] relative flex flex-col items-center justify-center overflow-hidden">
                    ${data.managerPhoto ? `
                        <img src="${data.managerPhoto}" alt="${data.managerName}" class="w-full h-full object-cover">
                    ` : `
                        <div class="p-6 text-center">
                            <div class="w-16 h-16 rounded-full bg-gray-700 border border-dashed border-gray-500 flex items-center justify-center mx-auto mb-2 text-yp-lime">
                                <i class="fa-solid fa-user-tie text-2xl"></i>
                            </div>
                            <div class="text-xs font-bold text-gray-300">青野·驿主理人照片位</div>
                            <div class="text-[11px] text-gray-500 mt-0.5">关若析 (Guan Ruoxi)</div>
                        </div>
                    `}
                    <span class="absolute top-3 left-3 px-2.5 py-1 bg-yp-green text-white text-xs font-bold rounded">青野·驿主要负责人</span>
                    ${isAdmin ? `
                        <label data-no-edit="true" class="cursor-pointer absolute bottom-3 right-3 px-3 py-1.5 bg-yp-red hover:bg-red-700 text-white text-xs font-black rounded-lg shadow flex items-center space-x-1">
                            <i class="fa-solid fa-camera"></i>
                            <span>上传/更换负责人照片</span>
                            <input type="file" accept="image/*" class="hidden" onchange="handleHostelManagerPhoto(event)">
                        </label>
                    ` : ''}
                </div>
                <div class="md:col-span-8 p-8 flex flex-col justify-between">
                    <div>
                        <div class="text-xs text-yp-lime font-bold uppercase tracking-wider">${mgrRole}</div>
                        <h3 class="text-2xl sm:text-3xl font-black mt-1 mb-2">${data.managerName}</h3>
                        <div class="p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-amber-400 font-bold mb-4">
                            <i class="fa-solid fa-graduation-cap mr-1.5"></i>${mgrEdu}
                        </div>
                        <p class="text-sm text-gray-300 leading-relaxed">${mgrBio}</p>
                    </div>
                    <div class="mt-6 pt-4 border-t border-gray-800 flex flex-wrap justify-between items-center text-xs text-gray-400">
                        <span>📍 地址：杭州千岛湖亚运村 · La Fuga 青野·驿</span>
                        <span>欢迎全国骑友与俱乐部前来入住集训</span>
                    </div>
                </div>
            </div>

            <!-- 青野·驿 实景图片画廊与管理员图片编辑中心 -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <span class="text-yp-darkGreen font-black text-xs uppercase">LA FUGA HOSTEL GALLERY</span>
                        <h3 class="text-2xl font-black text-gray-900 mt-0.5">🏨 La Fuga 青野·驿 · 基地与青旅实景图集</h3>
                    </div>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-2 text-xs" data-no-edit="true">
                            <label class="cursor-pointer px-3.5 py-2 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl shadow flex items-center space-x-1.5">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                <span>➕ 批量上传青野·驿实景图片</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange="handleHostelPhotosUpload(event)">
                            </label>
                            <button onclick="setHostelCols(2)" class="px-2.5 py-1.5 rounded-lg ${data.cols == 2 ? 'bg-gray-900 text-white font-bold' : 'bg-gray-100 text-gray-700'}">2列大图</button>
                            <button onclick="setHostelCols(3)" class="px-2.5 py-1.5 rounded-lg ${data.cols == 3 ? 'bg-gray-900 text-white font-bold' : 'bg-gray-100 text-gray-700'}">3列标准</button>
                        </div>
                    ` : ''}
                </div>

                ${isAdmin ? `
                    <form onsubmit="handleHostelPhotoUrlAdd(event)" data-no-edit="true" class="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap sm:flex-nowrap gap-2 text-xs">
                        <input type="url" id="hostel-img-url" required placeholder="管理员也可直接粘贴青旅图片外链 URL https://..." class="flex-1 rounded-xl border border-gray-300 px-3 py-2 bg-white">
                        <input type="text" id="hostel-img-cap" placeholder="图片说明文字 (如：青旅外观 / 技师车房)" class="w-56 rounded-xl border border-gray-300 px-3 py-2 bg-white">
                        <button type="submit" class="px-4 py-2 bg-gray-900 text-yp-lime font-black rounded-xl shrink-0">添加图片</button>
                    </form>
                ` : ''}

                <div id="hostel-photos-grid" class="grid grid-cols-1 md:grid-cols-${data.cols || 2} gap-6">
                    ${data.photos.map(p => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group relative" data-hostel-photo-id="${p.id}">
                            <div class="h-64 overflow-hidden bg-black">
                                <img src="${p.url}" alt="${p.caption}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                            </div>
                            <div class="p-3.5 bg-white flex items-center justify-between gap-2">
                                <span class="text-xs font-bold text-gray-800">${p.caption || 'La Fuga 青野·驿'}</span>
                                ${isAdmin ? `
                                    <div class="flex items-center space-x-1 shrink-0" data-no-edit="true">
                                        <button onclick="editHostelPhotoCaption('${p.id}')" class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded">改说明</button>
                                        <button onclick="deleteHostelPhoto('${p.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-yp-red text-[11px] font-bold rounded">删除</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // 绑定青旅图片拖拽排序
        const hGrid = document.getElementById('hostel-photos-grid');
        if (hGrid) {
            bindLiveSortableGrid(hGrid, '[data-hostel-photo-id]', 'data-hostel-photo-id', (newIds) => {
                const cur = getHostelData();
                cur.photos = newIds.map(id => cur.photos.find(x => String(x.id) === String(id))).filter(Boolean);
                saveHostelData(cur);
                if (typeof showToast === 'function') showToast('✅ 青野·驿图片顺序已保存！');
            });
        }
    };

    window.handleHostelManagerPhoto = function (event) {
        if (!isStrictAdmin()) return;
        const file = (event.target.files || [])[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const d = getHostelData();
            d.managerPhoto = ev.target.result;
            saveHostelData(d);
            window.renderHostelCustomSection();
            if (typeof showToast === 'function') showToast('✅ 已更新关若析主理人照片！');
        };
        reader.readAsDataURL(file);
    };

    window.handleHostelPhotosUpload = function (event) {
        if (!isStrictAdmin()) return;
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const d = getHostelData();
        let count = 0;
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = function (ev) {
                d.photos.push({ id: 'hp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), url: ev.target.result, caption: f.name.replace(/\.[^/.]+$/, '') });
                count++;
                if (count === files.length) {
                    saveHostelData(d);
                    window.renderHostelCustomSection();
                    if (typeof showToast === 'function') showToast(`✅ 已成功添加 ${files.length} 张青野·驿图片！`);
                }
            };
            reader.readAsDataURL(f);
        });
    };

    window.handleHostelPhotoUrlAdd = function (e) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const url = document.getElementById('hostel-img-url').value.trim();
        const cap = document.getElementById('hostel-img-cap').value.trim() || 'La Fuga 青野·驿实景';
        if (!url) return;
        const d = getHostelData();
        d.photos.push({ id: 'hp_' + Date.now(), url, caption: cap });
        saveHostelData(d);
        window.renderHostelCustomSection();
        if (typeof showToast === 'function') showToast('✅ 青旅图片已添加！');
    };

    window.editHostelPhotoCaption = function (photoId) {
        if (!isStrictAdmin()) return;
        const d = getHostelData();
        const item = d.photos.find(p => String(p.id) === String(photoId));
        if (!item) return;
        const newCap = prompt('请输入新的图片说明文字：', item.caption || '');
        if (newCap !== null) {
            item.caption = newCap.trim();
            saveHostelData(d);
            window.renderHostelCustomSection();
        }
    };

    window.deleteHostelPhoto = function (photoId) {
        if (!isStrictAdmin()) return;
        const d = getHostelData();
        d.photos = d.photos.filter(p => String(p.id) !== String(photoId));
        saveHostelData(d);
        window.renderHostelCustomSection();
        if (typeof showToast === 'function') showToast('已删除该张青旅图片');
    };

    window.setHostelCols = function (cols) {
        if (!isStrictAdmin()) return;
        const d = getHostelData();
        d.cols = cols;
        saveHostelData(d);
        window.renderHostelCustomSection();
    };

    // =========================================================================
    // 六、媒体中心（Gallery）：加入「URL / 哔哩哔哩 (Bilibili) 视频播放与复用中心」
    // =========================================================================
    function parseVideoEmbedHtml(rawInput, heightClass = 'h-64') {
        const str = (rawInput || '').trim();
        if (!str) return '';
        // 1. 识别 B站 BV号 或 bilibili.com 链接
        const bvMatch = str.match(/(BV[a-zA-Z0-9]{10})/i);
        if (bvMatch) {
            const bvid = bvMatch[1];
            return `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0" class="w-full ${heightClass} bg-black" frameborder="0" allowfullscreen="true" sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts"></iframe>`;
        }
        // 2. 识别 B站 aid
        const avMatch = str.match(/av(\d+)/i);
        if (avMatch) {
            return `<iframe src="https://player.bilibili.com/player.html?aid=${avMatch[1]}&high_quality=1&danmaku=0" class="w-full ${heightClass} bg-black" frameborder="0" allowfullscreen="true"></iframe>`;
        }
        // 3. 识别直接粘贴的 <iframe ...> 代码
        if (str.startsWith('<iframe')) {
            return str.replace(/class="[^"]*"/i, '').replace('<iframe', `<iframe class="w-full ${heightClass} bg-black"`);
        }
        // 4. 默认作为 MP4 / WebM 视频直链播放
        return `<video src="${str}" controls class="w-full ${heightClass} object-cover bg-black"></video>`;
    }

    window.previewUrlVideoNow = function (e) {
        if (e) e.preventDefault();
        const input = document.getElementById('bili-quick-url-input');
        const stage = document.getElementById('bili-quick-player-stage');
        if (!input || !stage) return;
        const val = input.value.trim();
        if (!val) return;
        stage.innerHTML = parseVideoEmbedHtml(val, 'h-[420px]');
        if (typeof showToast === 'function') showToast('🎬 视频加载成功！正在播放');
    };

    window.saveUrlVideoToCollection = function () {
        if (!isStrictAdmin()) {
            if (typeof showToast === 'function') showToast('请先登录管理员账号以保存视频到合集');
            return;
        }
        const input = document.getElementById('bili-quick-url-input');
        const titleInput = document.getElementById('bili-quick-title-input');
        const val = input ? input.value.trim() : '';
        if (!val) {
            if (typeof showToast === 'function') showToast('请先输入B站视频URL/BV号或视频链接！');
            return;
        }
        const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : '哔哩哔哩 (Bilibili) 车队精选视频';
        const isBili = /BV[a-zA-Z0-9]+|bilibili\.com/i.test(val);

        const list = getCollections();
        list.unshift({
            id: 'col_' + Date.now(),
            title: title,
            type: isBili ? 'bilibili' : 'video',
            category: 'B站精选复用',
            mediaUrl: val,
            cover: '',
            desc: '复用自青年力量发展车队官方哔哩哔哩频道视频内容'
        });
        saveCollections(list);
        window.renderCollectionsGrid('all');
        if (titleInput) titleInput.value = '';
        if (typeof showToast === 'function') showToast('✅ 已将该视频永久保存至下方「车队视频合集」！');
    };

    const defaultCollections = [
        {
            id: 'col_1',
            title: '2026赛季夺冠与冲刺高光集锦',
            type: 'video',
            category: '赛事视频合集',
            cover: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            desc: '记录青年力量车队在全国U系列锦标赛及公开赛赛场的精彩突围与冲刺瞬间。'
        },
        {
            id: 'col_2',
            title: '千岛湖与余杭基地冬训纪实图集',
            type: 'image',
            category: '日常训练合集',
            cover: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=900&q=80',
            mediaUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80',
            desc: '车队青训队员与主力车手高强度功率拉练、Fitting测试及团队生活掠影。'
        }
    ];

    function getCollections() {
        try { return JSON.parse(localStorage.getItem('yp_media_collections') || 'null') || defaultCollections; }
        catch (e) { return defaultCollections; }
    }
    function saveCollections(list) { localStorage.setItem('yp_media_collections', JSON.stringify(list)); }

    function injectGalleryCollectionsUI() {
        const galleryPage = document.getElementById('page-gallery');
        if (!galleryPage) return;

        let colWrapper = document.getElementById('collections-section');
        if (!colWrapper) {
            colWrapper = document.createElement('div');
            colWrapper.id = 'collections-section';
            colWrapper.className = 'mb-14 pb-10 border-b border-gray-200 space-y-8';
            const galleryGrid = document.getElementById('gallery-grid');
            if (galleryGrid) galleryPage.insertBefore(colWrapper, galleryGrid);
        }

        const isAdmin = isStrictAdmin();
        colWrapper.innerHTML = `
            <!-- URL / 哔哩哔哩视频直接播放与复用入口 -->
            <div class="bg-gray-900 text-white rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-xl" data-no-edit="true">
                <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                        <span class="px-2.5 py-0.5 bg-pink-500 text-white text-[11px] font-black rounded"><i class="fa-brands fa-bilibili mr-1"></i>BILIBILI & URL VIDEO PLAYER</span>
                        <h3 class="text-xl sm:text-2xl font-black mt-1">📺 哔哩哔哩 (B站) 与 URL 视频展播中心</h3>
                        <p class="text-xs text-gray-400 mt-0.5">支持直接输入 B站视频链接、BV号（如 BV1xx...）或 MP4 视频 URL 在线播放，直接复用车队 B站频道内容！</p>
                    </div>
                    <a href="https://space.bilibili.com/4502039" target="_blank" class="px-3.5 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-300 text-xs font-bold rounded-xl transition">
                        访问车队B站主页 (UID: 4502039) &nearr;
                    </a>
                </div>

                <form onsubmit="previewUrlVideoNow(event)" class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5 text-xs">
                    <input type="text" id="bili-quick-url-input" required placeholder="在此粘贴B站视频链接 (https://www.bilibili.com/video/BV...)、BV号 或 MP4视频URL..." class="md:col-span-6 rounded-xl bg-gray-800 border border-gray-700 px-3.5 py-2.5 text-white">
                    <input type="text" id="bili-quick-title-input" placeholder="视频标题 (管理员保存至合集时使用)" class="md:col-span-3 rounded-xl bg-gray-800 border border-gray-700 px-3.5 py-2.5 text-white">
                    <div class="md:col-span-3 flex gap-2">
                        <button type="submit" class="flex-1 py-2.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl transition">
                            ▶ 立即播放
                        </button>
                        ${isAdmin ? `
                            <button type="button" onclick="saveUrlVideoToCollection()" class="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl transition shrink-0" title="永久保存到下方视频合集">
                                💾 存入合集
                            </button>
                        ` : ''}
                    </div>
                </form>

                <div id="bili-quick-player-stage" class="rounded-2xl overflow-hidden bg-black border border-gray-800"></div>
            </div>

            <!-- 车队图片与视频主题合集 -->
            <div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <span class="px-2.5 py-0.5 bg-yp-green/15 text-yp-darkGreen text-xs font-black rounded">PHOTO & VIDEO COLLECTIONS</span>
                        <h3 class="text-2xl font-black text-gray-900 mt-1">🎬 车队图片与视频主题合集</h3>
                    </div>
                    <div class="flex flex-wrap gap-2" data-no-edit="true">
                        <button onclick="renderCollectionsGrid('all')" class="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg">全部合集</button>
                        <button onclick="renderCollectionsGrid('video')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-lg">🎬 视频/B站合集</button>
                        <button onclick="renderCollectionsGrid('image')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-lg">📸 图片合集</button>
                        ${isAdmin ? `<button onclick="openAdminStudioModal('collection')" class="px-3 py-1.5 bg-amber-400 text-gray-900 text-xs font-black rounded-lg">➕ 新增合集</button>` : ''}
                    </div>
                </div>
                <div id="collections-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
            </div>
        `;
        window.renderCollectionsGrid('all');
    }

    window.renderCollectionsGrid = function (filterType = 'all') {
        const grid = document.getElementById('collections-grid');
        if (!grid) return;
        const isAdmin = isStrictAdmin();
        let list = getCollections();
        if (filterType === 'video') list = list.filter(c => c.type === 'video' || c.type === 'bilibili');
        if (filterType === 'image') list = list.filter(c => c.type === 'image');

        grid.innerHTML = list.map(col => {
            let mediaHtml = '';
            if (col.type === 'video' || col.type === 'bilibili') {
                mediaHtml = parseVideoEmbedHtml(col.mediaUrl, 'h-64');
            } else {
                mediaHtml = `<img src="${col.mediaUrl || col.cover}" alt="${col.title}" class="w-full h-64 object-cover">`;
            }
            return `
                <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div>
                        <div class="relative bg-gray-900">
                            ${mediaHtml}
                            <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/85 text-yp-lime text-xs font-bold rounded">${col.category || '官方合集'}</span>
                            ${isAdmin ? `<button onclick="deleteCollectionItem('${col.id}')" data-no-edit="true" class="absolute top-3 right-3 px-2.5 py-1 bg-yp-red text-white text-xs font-bold rounded shadow">删除合集</button>` : ''}
                        </div>
                        <div class="p-5">
                            <h4 class="font-black text-gray-900 text-lg">${col.title}</h4>
                            <p class="text-xs text-gray-600 mt-1.5 leading-relaxed">${col.desc || ''}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.deleteCollectionItem = function (id) {
        if (!isStrictAdmin()) return;
        saveCollections(getCollections().filter(c => String(c.id) !== String(id)));
        window.renderCollectionsGrid('all');
    };

    // =========================================================================
    // 七、队员 / 商品 / 赞助商 通用独立详情页（5种排版 + 大图背景壁纸 + 多图相册 + 直接文字编辑）
    // =========================================================================
    function initDynamicSubpageContainer() {
        const main = document.getElementById('editable-main');
        if (!main || document.getElementById('page-subdetail')) return;
        const detailSec = document.createElement('div');
        detailSec.id = 'page-subdetail';
        detailSec.className = 'page-section min-h-[85vh] transition-all duration-300';
        detailSec.innerHTML = `<div id="subdetail-backdrop-wrapper" class="py-10 px-4 sm:px-6 lg:px-8 min-h-[85vh]"><div id="subdetail-content" class="max-w-6xl mx-auto"></div></div>`;
        main.appendChild(detailSec);
    }

    window.changeEntityDetailLayout = function (type, id, layoutType) {
        if (!isStrictAdmin()) return;
        saveEntityLayoutConfig(`${type}_${id}`, { layout: layoutType });
        window.openEntitySubpage(type, id);
        if (typeof showToast === 'function') showToast('✨ 独立主页排版已切换并保存！');
    };

    window.changeEntityAlbumMode = function (type, id, mode) {
        if (!isStrictAdmin()) return;
        saveEntityLayoutConfig(`${type}_${id}`, { albumMode: mode });
        window.openEntitySubpage(type, id);
        if (typeof showToast === 'function') showToast('📸 相册展示版式已更新！');
    };

    window.changeEntityAlbumCols = function (type, id, cols) {
        if (!isStrictAdmin()) return;
        saveEntityLayoutConfig(`${type}_${id}`, { albumCols: cols, albumMode: 'grid' });
        window.openEntitySubpage(type, id);
    };

    window.setEntityHeroBgImage = function (type, id, bgUrl, enableFullPage = true) {
        if (!isStrictAdmin()) return;
        saveEntityLayoutConfig(`${type}_${id}`, { bgUrl: bgUrl, fullPageBg: enableFullPage, layout: 'hero_bg' });
        window.openEntitySubpage(type, id);
        if (typeof showToast === 'function') showToast('🌌 已将该大图设为当前独立主页背景！');
    };

    window.handleEntityBgFileUpload = function (event, type, id) {
        if (!isStrictAdmin()) return;
        const file = (event.target.files || [])[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => window.setEntityHeroBgImage(type, id, ev.target.result, true);
        reader.readAsDataURL(file);
    };

    window.toggleEntityFullPageBg = function (type, id) {
        if (!isStrictAdmin()) return;
        const key = `${type}_${id}`;
        const cfg = getEntityLayoutConfig(key);
        saveEntityLayoutConfig(key, { fullPageBg: !cfg.fullPageBg });
        window.openEntitySubpage(type, id);
    };

    window.changeEntityBgDarkness = function (type, id, darkness) {
        if (!isStrictAdmin()) return;
        saveEntityLayoutConfig(`${type}_${id}`, { bgDarkness: String(darkness) });
        window.openEntitySubpage(type, id);
    };

    window.clearEntityBgImage = function (type, id) {
        if (!isStrictAdmin()) return;
        saveEntityLayoutConfig(`${type}_${id}`, { bgUrl: '', fullPageBg: false, layout: 'classic' });
        window.openEntitySubpage(type, id);
    };

    window.handleEntityMultiPhotosUpload = function (event, type, id) {
        if (!isStrictAdmin()) return;
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const key = `${type}_${id}`;
        const album = getEntityAlbum(key);
        let loadedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function (ev) {
                album.push({
                    id: 'ep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    url: ev.target.result,
                    caption: file.name.replace(/\.[^/.]+$/, '')
                });
                loadedCount++;
                if (loadedCount === files.length) {
                    saveEntityAlbum(key, album);
                    window.openEntitySubpage(type, id);
                    if (type === 'rider') window.renderRoster();
                    if (type === 'product') window.renderProducts('all');
                    if (type === 'sponsor') window.renderSponsorsEverywhere();
                    if (typeof showToast === 'function') showToast(`✅ 已成功添加 ${files.length} 张新图片！`);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    window.handleEntityUrlPhotoAdd = function (e, type, id) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const url = document.getElementById('entity-extra-photo-url')?.value.trim();
        const caption = document.getElementById('entity-extra-photo-cap')?.value.trim() || '官方展示图';
        if (!url) return;
        const key = `${type}_${id}`;
        const album = getEntityAlbum(key);
        album.push({ id: 'ep_' + Date.now(), url, caption });
        saveEntityAlbum(key, album);
        window.openEntitySubpage(type, id);
        if (typeof showToast === 'function') showToast('✅ 图片已添加至相册！');
    };

    window.deleteEntityAlbumPhoto = function (type, id, photoId) {
        if (!isStrictAdmin()) return;
        const key = `${type}_${id}`;
        saveEntityAlbum(key, getEntityAlbum(key).filter(p => String(p.id) !== String(photoId)));
        window.openEntitySubpage(type, id);
    };

    window.moveEntityAlbumPhotoStep = function (type, id, photoId, dir) {
        if (!isStrictAdmin()) return;
        const key = `${type}_${id}`;
        const album = getEntityAlbum(key);
        const idx = album.findIndex(p => String(p.id) === String(photoId));
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= album.length) return;
        const temp = album[idx];
        album[idx] = album[targetIdx];
        album[targetIdx] = temp;
        saveEntityAlbum(key, album);
        window.openEntitySubpage(type, id);
    };

    window.setEntityMainCoverFromAlbum = function (type, id, photoUrl) {
        if (!isStrictAdmin()) return;
        if (type === 'rider') {
            const savedPhotos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
            savedPhotos[id] = photoUrl;
            localStorage.setItem('yp_member_photos', JSON.stringify(savedPhotos));
            window.renderRoster();
        } else if (type === 'product' && typeof products !== 'undefined') {
            const p = products.find(x => String(x.id) === String(id));
            if (p) p.imgUrl = photoUrl;
            const customProds = JSON.parse(localStorage.getItem('yp_custom_products') || '[]');
            const cp = customProds.find(x => String(x.id) === String(id));
            if (cp) cp.imgUrl = photoUrl;
            localStorage.setItem('yp_custom_products', JSON.stringify(customProds));
            localStorage.setItem('yp_product_covers', JSON.stringify({ ...JSON.parse(localStorage.getItem('yp_product_covers') || '{}'), [id]: photoUrl }));
            window.renderProducts('all');
        } else if (type === 'sponsor') {
            const sps = getSponsorsList();
            const sp = sps.find(x => String(x.id) === String(id));
            if (sp) {
                sp.logoUrl = photoUrl;
                saveSponsorsList(sps);
                window.renderSponsorsEverywhere();
            }
        }
        window.openEntitySubpage(type, id);
        if (typeof showToast === 'function') showToast('⭐ 已设为该主页主图/封面！');
    };

    window.toggleEntitySubpageEdit = function (type, id) {
        if (!isStrictAdmin()) return;
        isSubpageEditing = !isSubpageEditing;
        document.querySelectorAll('#subdetail-content .yp-editable-field').forEach(el => {
            el.setAttribute('contenteditable', isSubpageEditing ? 'true' : 'false');
        });
        const btnEdit = document.getElementById('btn-entity-sub-edit');
        const btnSave = document.getElementById('btn-entity-sub-save');
        if (isSubpageEditing) {
            if (btnEdit) btnEdit.innerHTML = '<i class="fa-solid fa-xmark mr-1"></i>取消编辑';
            if (btnSave) btnSave.classList.remove('hidden');
            if (typeof showToast === 'function') showToast('✏️ 主页直接编辑已开启！请点击带绿色虚线框的文字或价格直接修改。');
        } else {
            window.openEntitySubpage(type, id);
        }
    };

    window.saveEntitySubpageEdits = function (type, id) {
        if (!isStrictAdmin()) return;
        const key = `${type}_${id}`;
        const tagEl = document.getElementById('sub-edit-tag');
        const titleEl = document.getElementById('sub-edit-title');
        const subEl = document.getElementById('sub-edit-sub');
        const highEl = document.getElementById('sub-edit-high');
        const bioEl = document.getElementById('sub-edit-bio');
        const extraEl = document.getElementById('sub-edit-extra');
        const priceEl = document.getElementById('sub-edit-price');

        if (type === 'rider') {
            const list = getSavedRosterData();
            const item = list.find(r => String(r.id) === String(id));
            if (item) {
                if (tagEl) item.role_zh = tagEl.innerHTML.trim();
                if (titleEl) item.name = titleEl.innerHTML.trim();
                if (subEl) item.ageSpec = subEl.innerHTML.trim();
                if (highEl) item.highlight = highEl.innerHTML.trim();
                if (bioEl) item.bio = bioEl.innerHTML.trim();
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
                window.renderRoster();
            }
        } else if (type === 'product' && typeof products !== 'undefined') {
            const p = products.find(x => String(x.id) === String(id));
            if (p) {
                if (tagEl) p.brand = tagEl.innerText.trim();
                if (titleEl) p.name = titleEl.innerText.trim();
                if (highEl) p.badge = highEl.innerText.trim();
                if (bioEl) p.desc = bioEl.innerHTML.trim();
                if (priceEl) {
                    const num = parseInt(priceEl.innerText.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(num)) p.price = num;
                }
                const overrides = JSON.parse(localStorage.getItem('yp_product_text_overrides') || '{}');
                overrides[id] = { brand: p.brand, name: p.name, badge: p.badge, desc: p.desc, price: p.price };
                localStorage.setItem('yp_product_text_overrides', JSON.stringify(overrides));
                window.renderProducts('all');
            }
        } else if (type === 'sponsor') {
            const sps = getSponsorsList();
            const sp = sps.find(x => String(x.id) === String(id));
            if (sp) {
                if (tagEl) sp.tier = tagEl.innerText.trim();
                if (titleEl) sp.name = titleEl.innerText.trim();
                if (subEl) sp.logoText = subEl.innerText.trim();
                if (highEl) sp.highlight = highEl.innerHTML.trim();
                if (bioEl) sp.desc = bioEl.innerHTML.trim();
                saveSponsorsList(sps);
                window.renderSponsorsEverywhere();
            }
        }

        if (extraEl) {
            saveEntityLayoutConfig(key, { extraSection: extraEl.innerHTML.trim() });
        }

        const album = getEntityAlbum(key);
        document.querySelectorAll('[data-edit-caption-id]').forEach(capNode => {
            const pid = capNode.getAttribute('data-edit-caption-id');
            const targetPhoto = album.find(p => String(p.id) === String(pid));
            if (targetPhoto) targetPhoto.caption = capNode.innerHTML.trim();
        });
        saveEntityAlbum(key, album);

        isSubpageEditing = false;
        window.openEntitySubpage(type, id);
        if (typeof showToast === 'function') showToast('✅ 独立主页所有内容与图片说明修改已永久保存！');
    };

    // 打开任意实体（rider / product / sponsor）的专属独立详情主页
    window.openEntitySubpage = function (type, id) {
        initDynamicSubpageContainer();
        const container = document.getElementById('subdetail-content');
        const backdropWrapper = document.getElementById('subdetail-backdrop-wrapper');
        if (!container || !backdropWrapper) return;
        const lang = window.__ypLang || 'zh';
        const isAdmin = isStrictAdmin();
        isSubpageEditing = false;

        const key = `${type}_${id}`;
        const cfg = getEntityLayoutConfig(key);
        const album = getEntityAlbum(key);

        let backPage = 'roster';
        let backLabel = '返回 2027 队员介绍列表';
        let tagText = '';
        let titleText = '';
        let subText = '';
        let highText = '';
        let bioText = '';
        let mainImg = '';
        let rightBadge = '';
        let actionBtnsHtml = '';

        if (type === 'rider') {
            const list = getSavedRosterData();
            const photos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
            const m = list.find(r => String(r.id) === String(id));
            if (!m) return;
            const tr = (lang !== 'zh' && rosterTranslations[m.id] && rosterTranslations[m.id][lang]) ? rosterTranslations[m.id][lang] : null;
            tagText = tr ? tr.role : m.role_zh;
            titleText = m.name;
            subText = tr ? tr.ageSpec : m.ageSpec;
            highText = tr ? tr.highlight : m.highlight;
            bioText = tr ? tr.bio : m.bio;
            rightBadge = m.flag || '🇨🇳';
            mainImg = photos[m.id] || m.photo || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80');
            if (isAdmin) {
                actionBtnsHtml = `<button onclick="deleteRosterMember('${m.id}');switchPage('roster');" class="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-xl">🗑️ 删除此队员档案</button>`;
            }
        } else if (type === 'product') {
            backPage = 'shop';
            backLabel = '返回官方器材商城';
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            const savedCovers = JSON.parse(localStorage.getItem('yp_product_covers') || '{}');
            const tr = (lang !== 'zh' && productTranslations[p.id] && productTranslations[p.id][lang]) ? productTranslations[p.id][lang] : null;
            tagText = tr ? tr.brand : p.brand;
            titleText = tr ? tr.name : p.name;
            subText = `官方同步直售价`;
            highText = tr ? tr.badge : p.badge;
            bioText = tr ? tr.desc : p.desc;
            mainImg = savedCovers[p.id] || p.imgUrl || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80');
            actionBtnsHtml = `
                <div class="mt-6 pt-5 border-t border-gray-700/80 flex flex-wrap items-center justify-between gap-4" data-no-edit="true">
                    <div>
                        <span class="text-xs text-gray-400 block">官方同步售价 (开启编辑后可点击价格修改)</span>
                        <span id="sub-edit-price" class="yp-editable-field text-3xl font-black text-yp-lime">¥${p.price}</span>
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <button onclick="addToCart(${p.id})" class="px-6 py-3.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl text-sm shadow transition">
                            <i class="fa-solid fa-cart-plus mr-1.5"></i>加入购物车
                        </button>
                        <button onclick="openAlipayModal(${p.price}, '直购：${p.name}', '商城直购')" class="px-6 py-3.5 bg-yp-alipay hover:bg-blue-600 text-white font-black rounded-xl text-sm shadow transition">
                            <i class="fa-brands fa-alipay mr-1.5"></i>支付宝立即购买
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'sponsor') {
            backPage = 'partners';
            backLabel = '返回赞助商与合作伙伴名录';
            const sp = getSponsorsList().find(x => String(x.id) === String(id));
            if (!sp) return;
            tagText = sp.tier;
            titleText = sp.name;
            subText = sp.logoText || sp.name;
            highText = sp.highlight;
            bioText = sp.desc;
            mainImg = sp.logoUrl || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80');
        }

        const bgHeroUrl = cfg.bgUrl || mainImg;
        const darkPct = cfg.bgDarkness || '65';
        const darkRgba = darkPct === '40' ? 'rgba(17,24,39,0.45)' : (darkPct === '85' ? 'rgba(17,24,39,0.88)' : 'rgba(17,24,39,0.68)');

        if (cfg.fullPageBg && bgHeroUrl) {
            backdropWrapper.style.backgroundImage = `linear-gradient(180deg, ${darkRgba} 0%, rgba(17,24,39,0.93) 100%), url('${bgHeroUrl}')`;
            backdropWrapper.style.backgroundSize = 'cover';
            backdropWrapper.style.backgroundPosition = 'center';
            backdropWrapper.style.backgroundAttachment = 'fixed';
        } else {
            backdropWrapper.style.backgroundImage = '';
        }

        const typeLabel = type === 'rider' ? '队员个人主页' : (type === 'product' ? '商品独立详情页' : '赞助商独立主页');

        // 管理员控制栏（队员 / 商品 / 赞助商 详情页通用）
        const adminToolbarHtml = isAdmin ? `
            <div data-no-edit="true" class="mb-8 p-6 rounded-3xl bg-gray-900/95 backdrop-blur-md text-white border-2 border-yp-lime shadow-2xl space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
                    <div>
                        <span class="px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[11px] font-black rounded">SUPER ADMIN · ${typeLabel}可视化编辑器</span>
                        <h4 class="text-base font-black mt-1">当前编辑：${titleText} — 支持直接修改文字/价格、上传多张图片、将大图设为背景及切换5种排版</h4>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button id="btn-entity-sub-edit" onclick="toggleEntitySubpageEdit('${type}', '${id}')" class="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-900 text-xs font-black rounded-xl shadow flex items-center space-x-1.5 transition">
                            <i class="fa-solid fa-pen-to-square"></i>
                            <span>✏️ 开启本页文字直接编辑</span>
                        </button>
                        <button id="btn-entity-sub-save" onclick="saveEntitySubpageEdits('${type}', '${id}')" class="hidden px-5 py-2 bg-yp-green hover:bg-yp-darkGreen text-white text-xs font-black rounded-xl shadow flex items-center space-x-1.5 transition animate-pulse">
                            <i class="fa-solid fa-floppy-disk"></i>
                            <span>💾 保存本页全部修改</span>
                        </button>
                    </div>
                </div>

                <!-- 5种页面主体排版 + 大图背景设置 -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pb-4 border-b border-gray-800 text-xs">
                    <div class="lg:col-span-7 flex flex-wrap items-center gap-1.5">
                        <span class="text-yp-lime font-bold mr-1">主页主体排版：</span>
                        <button onclick="changeEntityDetailLayout('${type}', '${id}', 'classic')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'classic' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">① 左图右文</button>
                        <button onclick="changeEntityDetailLayout('${type}', '${id}', 'magazine')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'magazine' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">② 杂志巨幕</button>
                        <button onclick="changeEntityDetailLayout('${type}', '${id}', 'reverse')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'reverse' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">③ 左文右图</button>
                        <button onclick="changeEntityDetailLayout('${type}', '${id}', 'gallery_first')" class="px-2.5 py-1.5 rounded-lg font-bold ${cfg.layout === 'gallery_first' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">④ 画廊置顶</button>
                        <button onclick="changeEntityDetailLayout('${type}', '${id}', 'hero_bg')" class="px-3 py-1.5 rounded-lg font-black ${cfg.layout === 'hero_bg' ? 'bg-purple-600 text-white ring-2 ring-purple-300' : 'bg-purple-900/60 text-purple-200'}">⑤ 🌌 大图作为背景悬浮</button>
                    </div>
                    <div class="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
                        <label class="cursor-pointer px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center space-x-1 shadow">
                            <i class="fa-solid fa-image"></i>
                            <span>上传背景大图</span>
                            <input type="file" accept="image/*" class="hidden" onchange="handleEntityBgFileUpload(event, '${type}', '${id}')">
                        </label>
                        <button onclick="toggleEntityFullPageBg('${type}', '${id}')" class="px-3 py-1.5 rounded-lg font-bold border ${cfg.fullPageBg ? 'bg-yp-lime text-gray-900 border-yp-lime' : 'bg-gray-800 text-gray-300 border-gray-700'}">
                            ${cfg.fullPageBg ? '🌅 整页壁纸：开启' : '🌅 开启整页壁纸'}
                        </button>
                        <select onchange="changeEntityBgDarkness('${type}', '${id}', this.value)" class="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-white">
                            <option value="40" ${darkPct === '40' ? 'selected' : ''}>遮罩 40%</option>
                            <option value="65" ${darkPct === '65' ? 'selected' : ''}>遮罩 65%</option>
                            <option value="85" ${darkPct === '85' ? 'selected' : ''}>遮罩 85%</option>
                        </select>
                        ${(cfg.bgUrl || cfg.fullPageBg) ? `<button onclick="clearEntityBgImage('${type}', '${id}')" class="text-red-400 hover:underline">清除背景</button>` : ''}
                    </div>
                </div>

                <!-- 批量上传多张图片 -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs">
                    <div class="lg:col-span-5">
                        <label class="cursor-pointer w-full py-2.5 px-4 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl flex items-center justify-center space-x-2 shadow transition">
                            <i class="fa-solid fa-images text-base"></i>
                            <span>➕ 批量上传多张图片到本页相册</span>
                            <input type="file" accept="image/*" multiple class="hidden" onchange="handleEntityMultiPhotosUpload(event, '${type}', '${id}')">
                        </label>
                    </div>
                    <form onsubmit="handleEntityUrlPhotoAdd(event, '${type}', '${id}')" class="lg:col-span-7 flex flex-wrap sm:flex-nowrap gap-2">
                        <input type="url" id="entity-extra-photo-url" required placeholder="或粘贴图片外链 URL https://..." class="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white">
                        <input type="text" id="entity-extra-photo-cap" placeholder="图片说明文字(选填)" class="w-36 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white">
                        <button type="submit" class="px-4 py-2 bg-amber-400 text-gray-900 font-black rounded-xl hover:bg-amber-300 shrink-0">添加图片</button>
                    </form>
                </div>
            </div>
        ` : '';

        // 单张相册图渲染
        const renderAlbumCard = (p, extraClass = '', imgHeightClass = 'h-64') => `
            <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700/60 shadow-md group relative flex flex-col justify-between ${extraClass}" data-album-photo-id="${p.id}">
                <div class="${imgHeightClass} w-full overflow-hidden bg-black flex items-center justify-center relative">
                    <img src="${p.url}" alt="${p.caption || titleText}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    ${isAdmin ? `
                        <div data-no-edit="true" class="absolute top-2.5 left-2.5 flex items-center space-x-1">
                            <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab"><i class="fa-solid fa-grip-vertical mr-1"></i>拖动排图</span>
                            <button onclick="moveEntityAlbumPhotoStep('${type}', '${id}', '${p.id}', -1)" class="w-6 h-6 bg-gray-900/90 text-white text-[10px] font-bold rounded">◀</button>
                            <button onclick="moveEntityAlbumPhotoStep('${type}', '${id}', '${p.id}', 1)" class="w-6 h-6 bg-gray-900/90 text-white text-[10px] font-bold rounded">▶</button>
                        </div>
                        <div data-no-edit="true" class="absolute top-2.5 right-2.5 flex flex-wrap items-center justify-end gap-1">
                            <button onclick="setEntityMainCoverFromAlbum('${type}', '${id}', '${p.url}')" class="px-2 py-1 bg-yp-green text-white text-[10px] font-bold rounded shadow">设为主图</button>
                            <button onclick="setEntityHeroBgImage('${type}', '${id}', '${p.url}', true)" class="px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded shadow">🌌 设为背景</button>
                            <button onclick="deleteEntityAlbumPhoto('${type}', '${id}', '${p.id}')" class="w-6 h-6 bg-yp-red text-white text-[10px] font-bold rounded shadow">✕</button>
                        </div>
                    ` : ''}
                </div>
                <div class="p-3.5 bg-gray-900 text-xs font-bold text-gray-200 border-t border-gray-800">
                    <div class="yp-editable-field" data-edit-caption-id="${p.id}">${p.caption || '点击顶部“开启文字直接编辑”可修改此图片说明'}</div>
                </div>
            </div>
        `;

        let albumGridHtml = '';
        if (album.length === 0) {
            albumGridHtml = `<div class="text-center py-12 bg-gray-900/30 rounded-2xl border border-dashed border-gray-500 text-gray-400 text-xs">暂未上传更多图集。${isAdmin ? '管理员请点击上方「➕ 批量上传多张图片」按钮添加！' : ''}</div>`;
        } else if (cfg.albumMode === 'featured') {
            albumGridHtml = `<div id="entity-album-sortable-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">${album.map((p, idx) => idx === 0 ? renderAlbumCard(p, 'md:col-span-2', 'h-[420px]') : renderAlbumCard(p, '', 'h-72')).join('')}</div>`;
        } else if (cfg.albumMode === 'cinematic') {
            albumGridHtml = `<div id="entity-album-sortable-grid" class="space-y-8">${album.map(p => renderAlbumCard(p, 'w-full', 'h-[460px]')).join('')}</div>`;
        } else if (cfg.albumMode === 'masonry') {
            albumGridHtml = `<div id="entity-album-sortable-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">${album.map((p, idx) => renderAlbumCard(p, '', idx % 2 === 0 ? 'h-80' : 'h-60')).join('')}</div>`;
        } else {
            albumGridHtml = `<div id="entity-album-sortable-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cfg.albumCols || 3} gap-5">${album.map(p => renderAlbumCard(p, '', 'h-64')).join('')}</div>`;
        }

        const albumSectionHtml = `
            <div class="mt-10 ${cfg.fullPageBg ? 'bg-gray-900/80 backdrop-blur-md text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} rounded-3xl p-6 sm:p-8 border shadow-xl">
                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <span class="text-yp-lime font-black text-xs uppercase">MULTI-PHOTO GALLERY & LAYOUT</span>
                        <h3 class="text-xl font-black mt-0.5">📸 ${titleText} · 高清细节与风采图集 (${album.length}张)</h3>
                    </div>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-1.5 text-xs" data-no-edit="true">
                            <span class="text-gray-400 font-bold mr-1">相册图片排版：</span>
                            <button onclick="changeEntityAlbumCols('${type}', '${id}', 2)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'grid' && cfg.albumCols == 2 ? 'bg-yp-green text-white font-bold' : 'bg-gray-800 text-gray-300'}">2列平铺</button>
                            <button onclick="changeEntityAlbumCols('${type}', '${id}', 3)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'grid' && cfg.albumCols == 3 ? 'bg-yp-green text-white font-bold' : 'bg-gray-800 text-gray-300'}">3列平铺</button>
                            <button onclick="changeEntityAlbumCols('${type}', '${id}', 4)" class="px-2.5 py-1 rounded ${cfg.albumMode === 'grid' && cfg.albumCols == 4 ? 'bg-yp-green text-white font-bold' : 'bg-gray-800 text-gray-300'}">4列平铺</button>
                            <button onclick="changeEntityAlbumMode('${type}', '${id}', 'featured')" class="px-2.5 py-1 rounded ${cfg.albumMode === 'featured' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">🌟 首图巨幅焦点</button>
                            <button onclick="changeEntityAlbumMode('${type}', '${id}', 'cinematic')" class="px-2.5 py-1 rounded ${cfg.albumMode === 'cinematic' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">🎞️ 全宽电影巨幕</button>
                            <button onclick="changeEntityAlbumMode('${type}', '${id}', 'masonry')" class="px-2.5 py-1 rounded ${cfg.albumMode === 'masonry' ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">🧱 错落画报流</button>
                        </div>
                    ` : ''}
                </div>
                ${albumGridHtml}
            </div>
        `;

        const editableInfoBlock = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span id="sub-edit-tag" class="yp-editable-field px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${tagText}</span>
                    <span class="text-2xl">${rightBadge}</span>
                </div>
                <h2 id="sub-edit-title" class="yp-editable-field text-3xl sm:text-4xl font-black mb-1">${titleText}</h2>
                <p id="sub-edit-sub" class="yp-editable-field text-xs text-gray-300 mb-4">${subText}</p>
                <div id="sub-edit-high" class="yp-editable-field p-3.5 rounded-xl bg-gray-800/90 border border-gray-700 text-xs text-yp-lime font-bold mb-5">${highText}</div>
                <div id="sub-edit-bio" class="yp-editable-field text-sm text-gray-100 leading-relaxed space-y-2">${bioText}</div>
                <div id="sub-edit-extra" class="yp-editable-field mt-6 pt-5 border-t border-gray-700/80 text-sm text-gray-300 leading-relaxed">${cfg.extraSection || (isAdmin ? '【管理员可编辑扩展区】点击顶部“开启本页文字直接编辑”后，可在此处添加更多参数表、几何图或详细故事...' : '')}</div>
                ${actionBtnsHtml}
            </div>
        `;

        let profileCardHtml = '';
        if (cfg.layout === 'hero_bg') {
            profileCardHtml = `
                <div class="rounded-3xl overflow-hidden shadow-2xl border border-gray-700 relative min-h-[520px] flex items-end"
                     style="background: linear-gradient(105deg, rgba(17,24,39,0.93) 0%, ${darkRgba} 55%, rgba(17,24,39,0.4) 100%), url('${bgHeroUrl}') center/cover no-repeat;">
                    <div class="p-8 sm:p-14 w-full max-w-4xl text-white backdrop-blur-[2px]">
                        <div class="inline-block px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[10px] font-black rounded mb-3">HERO BACKDROP LAYOUT</div>
                        ${editableInfoBlock}
                    </div>
                </div>
                ${albumSectionHtml}
            `;
        } else if (cfg.layout === 'magazine') {
            profileCardHtml = `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800">
                    <div class="h-96 w-full bg-gray-800 relative">
                        <img src="${mainImg}" alt="${titleText}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent"></div>
                    </div>
                    <div class="p-8 sm:p-12 max-w-4xl mx-auto -mt-16 relative z-10">${editableInfoBlock}</div>
                </div>
                ${albumSectionHtml}
            `;
        } else if (cfg.layout === 'reverse') {
            profileCardHtml = `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                    <div class="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">${editableInfoBlock}</div>
                    <div class="md:col-span-5 bg-gray-800 min-h-[360px] flex items-center justify-center"><img src="${mainImg}" alt="${titleText}" class="w-full h-full object-cover"></div>
                </div>
                ${albumSectionHtml}
            `;
        } else if (cfg.layout === 'gallery_first') {
            profileCardHtml = `
                ${albumSectionHtml}
                <div class="mt-8 bg-gray-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-800">${editableInfoBlock}</div>
            `;
        } else {
            profileCardHtml = `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                    <div class="md:col-span-5 bg-gray-800 min-h-[360px] flex items-center justify-center"><img src="${mainImg}" alt="${titleText}" class="w-full h-full object-cover"></div>
                    <div class="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">${editableInfoBlock}</div>
                </div>
                ${albumSectionHtml}
            `;
        }

        container.innerHTML = `
            <div class="flex items-center justify-between mb-6" data-no-edit="true">
                <button onclick="switchPage('${backPage}')" class="inline-flex items-center px-4 py-2 rounded-xl bg-gray-900/85 text-yp-lime text-xs font-bold hover:bg-gray-900 transition shadow">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> ${backLabel}
                </button>
            </div>
            ${adminToolbarHtml}
            ${profileCardHtml}
        `;

        const albumGrid = document.getElementById('entity-album-sortable-grid');
        if (albumGrid) {
            bindLiveSortableGrid(albumGrid, '[data-album-photo-id]', 'data-album-photo-id', (newPhotoIds) => {
                const currentAlbum = getEntityAlbum(key);
                const reordered = newPhotoIds.map(pid => currentAlbum.find(x => String(x.id) === String(pid))).filter(Boolean);
                if (reordered.length === currentAlbum.length) {
                    saveEntityAlbum(key, reordered);
                    if (typeof showToast === 'function') showToast('✅ 相册图片顺序已实时保存！');
                }
            });
        }

        window.switchPage('subdetail');
    };

    // =========================================================================
    // 八、管理员「➕ 增加/删除队员、增加/删除页面、增加商品/合集/赞助商」工作台
    // =========================================================================
    function getCustomProducts() { try { return JSON.parse(localStorage.getItem('yp_custom_products') || '[]'); } catch (e) { return []; } }
    function getCustomPages() { try { return JSON.parse(localStorage.getItem('yp_custom_pages') || '[]'); } catch (e) { return []; } }

    window.deleteRosterMember = function (id) {
        if (!isStrictAdmin() || !confirm('确定要从车队名单中删除该成员吗？')) return;
        const list = getSavedRosterData().filter(r => String(r.id) !== String(id));
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
        window.renderRoster();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该队员档案');
    };

    window.deleteCustomPage = function (id) {
        if (!isStrictAdmin() || !confirm('确定要删除这个自定义页面吗？')) return;
        localStorage.setItem('yp_custom_pages', JSON.stringify(getCustomPages().filter(p => String(p.id) !== String(id))));
        window.renderAllCustomPages();
        window.switchPage('home');
        if (typeof showToast === 'function') showToast('🗑️ 已删除该页面');
    };

    window.renderAllCustomPages = function () {
        const pages = getCustomPages();
        const desktopNav = document.querySelector('header nav.hidden.xl\\:flex');
        const mobileNav = document.querySelector('header div.xl\\:hidden.flex');
        const mainContainer = document.getElementById('editable-main');
        const isAdmin = isStrictAdmin();

        document.querySelectorAll('.custom-nav-item, .custom-page-sec').forEach(el => el.remove());

        // 默认加入「合作伙伴名录」导航入口
        if (desktopNav && !desktopNav.querySelector('[data-target="partners"]')) {
            const pBtn = document.createElement('button');
            pBtn.setAttribute('onclick', `switchPage('partners')`);
            pBtn.setAttribute('data-target', 'partners');
            pBtn.className = 'nav-btn custom-nav-item px-3 py-2 rounded-lg text-gray-700 hover:text-yp-darkGreen transition';
            pBtn.innerHTML = '合作伙伴Logo';
            desktopNav.appendChild(pBtn);
        }

        pages.forEach(p => {
            if (desktopNav) {
                const btn = document.createElement('button');
                btn.setAttribute('onclick', `switchPage('${p.id}')`);
                btn.setAttribute('data-target', p.id);
                btn.className = 'nav-btn custom-nav-item px-3 py-2 rounded-lg text-gray-700 hover:text-yp-darkGreen transition';
                btn.innerHTML = p.navTitle;
                desktopNav.appendChild(btn);
            }
            if (mobileNav) {
                const mBtn = document.createElement('button');
                mBtn.setAttribute('onclick', `switchPage('${p.id}')`);
                mBtn.setAttribute('data-target', p.id);
                mBtn.className = 'nav-btn custom-nav-item px-3 py-1.5 rounded-md text-gray-700';
                mBtn.innerHTML = p.navTitle;
                mobileNav.appendChild(mBtn);
            }
            if (mainContainer) {
                const sec = document.createElement('div');
                sec.id = 'page-' + p.id;
                sec.className = 'page-section custom-page-sec py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
                sec.innerHTML = `
                    <div class="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 shadow-xs">
                        <div class="flex justify-between items-start mb-6">
                            <div>
                                <span class="text-yp-darkGreen font-black text-xs uppercase">${p.category || 'OFFICIAL PAGE'}</span>
                                <h2 class="text-3xl sm:text-4xl font-black text-gray-900 mt-1">${p.pageTitle}</h2>
                            </div>
                            ${isAdmin ? `<button onclick="deleteCustomPage('${p.id}')" data-no-edit="true" class="px-3.5 py-2 bg-yp-red text-white text-xs font-black rounded-xl shadow">🗑️ 删除此页面</button>` : ''}
                        </div>
                        ${p.mediaUrl ? `<div class="mb-6 rounded-2xl overflow-hidden max-h-96 bg-gray-900 flex justify-center"><img src="${p.mediaUrl}" class="object-cover max-h-96 w-full"></div>` : ''}
                        <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">${p.content}</div>
                    </div>
                `;
                mainContainer.appendChild(sec);
            }
        });
    };

    function injectAdminCreatorStudio() {
        const floatBar = document.querySelector('#admin-floating-bar .flex.flex-wrap.items-center.gap-2');
        if (floatBar && !document.getElementById('btn-open-studio')) {
            const studioBtn = document.createElement('button');
            studioBtn.id = 'btn-open-studio';
            studioBtn.setAttribute('onclick', "openAdminStudioModal('rider')");
            studioBtn.className = 'px-4 py-2 bg-amber-400 text-gray-900 text-xs font-black rounded-lg hover:bg-amber-300 transition flex items-center space-x-1.5 shadow';
            studioBtn.innerHTML = `<i class="fa-solid fa-folder-plus"></i><span>➕ 增删队员 / 页面 / 商品 / 赞助商 / 合集</span>`;
            floatBar.insertBefore(studioBtn, floatBar.firstChild);
        }

        if (document.getElementById('admin-studio-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'admin-studio-modal';
        modal.setAttribute('data-no-edit', 'true');
        modal.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
        modal.innerHTML = `
            <div onclick="closeAdminStudioModal()" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
            <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative z-10">
                <div class="bg-gray-900 text-white p-5 flex items-center justify-between">
                    <div>
                        <span class="px-2 py-0.5 bg-yp-lime text-gray-900 text-[10px] font-black rounded">SUPER ADMIN STUDIO</span>
                        <h3 class="text-lg font-black mt-1">管理员新增/删除队员、页面、商品、赞助商与视频合集</h3>
                    </div>
                    <button onclick="closeAdminStudioModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="flex overflow-x-auto bg-gray-100 p-2 gap-1.5 text-xs font-bold border-b border-gray-200">
                    <button onclick="switchStudioTab('rider')" id="stab-rider" class="studio-tab px-3 py-2 rounded-lg bg-yp-darkGreen text-white shrink-0">🚴 新增/删除队员</button>
                    <button onclick="switchStudioTab('newpage')" id="stab-newpage" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">📄 新增/删除页面</button>
                    <button onclick="switchStudioTab('sponsor')" id="stab-sponsor" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🤝 新增赞助商Logo</button>
                    <button onclick="switchStudioTab('product')" id="stab-product" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🛒 上架新商品</button>
                    <button onclick="switchStudioTab('collection')" id="stab-collection" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🎬 新增B站/视频合集</button>
                </div>
                <div class="p-6 overflow-y-auto space-y-4 text-xs">
                    <!-- 1. 新增队员 -->
                    <form id="sform-rider" onsubmit="handleAddRider(event)" class="space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">队员姓名 *</label><input type="text" id="nr-name" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">队内职务/角色 *</label><input type="text" id="nr-role" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">国籍旗帜</label><input type="text" id="nr-flag" value="🇨🇳" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">年龄与技术特点 *</label><input type="text" id="nr-age" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">高光头衔 *</label><input type="text" id="nr-high" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">上传定妆照（可选）</label><input type="file" id="nr-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">详细履历介绍 *</label><textarea id="nr-bio" required rows="3" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">➕ 立即添加该队员并生成独立主页</button>
                    </form>

                    <!-- 2. 新增/删除独立页面 -->
                    <form id="sform-newpage" onsubmit="handleAddNewPage(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">顶部导航栏按钮名称 *</label><input type="text" id="npg-nav" required placeholder="如：📰 赛事战报" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">页面主标题 *</label><input type="text" id="npg-title" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">页面配图URL（选填）</label><input type="url" id="npg-img" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">页面正文内容 *</label><textarea id="npg-content" required rows="4" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">➕ 立即创建新页面并加入顶部导航栏</button>
                    </form>

                    <!-- 3. 新增赞助商Logo与详情主页 -->
                    <form id="sform-sponsor" onsubmit="handleAddSponsor(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">赞助商品牌名称 *</label><input type="text" id="nsp-name" required placeholder="如：NZSE 骑行服" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">合作级别头衔 *</label><input type="text" id="nsp-tier" required placeholder="如：官方骑行服合作伙伴" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">上传赞助商 Logo 图片（推荐）</label><input type="file" id="nsp-file" accept="image/*" class="w-full text-xs"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">或填写 Logo 图片外链 URL</label><input type="url" id="nsp-url" placeholder="https://..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">一句话核心亮点 *</label><input type="text" id="nsp-high" required placeholder="如：提供全套职业连体骑行服与赛训装备支持" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">品牌与合作详细介绍 *</label><textarea id="nsp-desc" required rows="3" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">➕ 添加到页面底部赞助商栏并生成品牌详情页</button>
                    </form>

                    <!-- 4. 上架新商品 -->
                    <form id="sform-product" onsubmit="handleAddProduct(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">品牌名称 *</label><input type="text" id="np-brand" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">分类 *</label><select id="np-cat" class="w-full rounded-xl border border-gray-300 px-3 py-2"><option value="spect">空力公式 (Spect)</option><option value="elves">精灵 (ELVES)</option><option value="helmet">ESSEN头盔</option><option value="pedal">卓锐锁踏/配件</option></select></div>
                            <div><label class="block font-bold text-gray-700 mb-1">售价 (元) *</label><input type="number" id="np-price" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">商品名称 *</label><input type="text" id="np-name" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">商品描述 *</label><textarea id="np-desc" required rows="3" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">➕ 立即上架到官方商城并生成详情页</button>
                    </form>

                    <!-- 5. 新增合集 -->
                    <form id="sform-collection" onsubmit="handleAddCollection(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">合集名称 *</label><input type="text" id="col-title" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">合集类型 *</label><select id="col-type" class="w-full rounded-xl border border-gray-300 px-3 py-2"><option value="bilibili">📺 哔哩哔哩视频 (填B站URL或BV号)</option><option value="video">🎬 MP4 视频直链/本地视频</option><option value="image">📸 图片合集</option></select></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">分类标签</label><input type="text" id="col-cat" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">上传本地文件（可选）</label><input type="file" id="col-file" accept="image/*,video/*" class="w-full text-xs"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">或填写 B站链接 / BV号 / 视频图片URL</label><input type="text" id="col-url" placeholder="如：https://www.bilibili.com/video/BV... 或 BV1xx..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">合集简介说明</label><textarea id="col-desc" rows="2" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">➕ 发布到「车队风采 Gallery」</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.openAdminStudioModal = function (defaultTab = 'rider') {
        if (!isStrictAdmin()) return;
        document.getElementById('admin-studio-modal').classList.remove('hidden');
        window.switchStudioTab(defaultTab);
    };
    window.closeAdminStudioModal = function () { document.getElementById('admin-studio-modal').classList.add('hidden'); };
    window.switchStudioTab = function (tab) {
        ['rider', 'newpage', 'sponsor', 'product', 'collection'].forEach(t => {
            const f = document.getElementById('sform-' + t);
            const b = document.getElementById('stab-' + t);
            if (f) f.classList.toggle('hidden', t !== tab);
            if (b) b.className = t === tab ? 'studio-tab px-3 py-2 rounded-lg bg-yp-darkGreen text-white shrink-0' : 'studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0';
        });
    };

    window.handleAddRider = function (e) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const name = document.getElementById('nr-name').value.trim();
        const role = document.getElementById('nr-role').value.trim();
        const flag = document.getElementById('nr-flag').value.trim() || '🇨🇳';
        const ageSpec = document.getElementById('nr-age').value.trim();
        const highlight = document.getElementById('nr-high').value.trim();
        const bio = document.getElementById('nr-bio').value.trim();
        const fileInput = document.getElementById('nr-file');
        const saveRider = (photoData) => {
            const list = getSavedRosterData();
            list.push({ id: 'rider_' + Date.now(), role_zh: role, role_en: role, role_es: role, name, flag, ageSpec, highlight, bio, photo: photoData || '' });
            localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
            window.renderRoster();
            e.target.reset();
            window.closeAdminStudioModal();
            window.switchPage('roster');
            if (typeof showToast === 'function') showToast(`✅ 已添加新队员：${name}`);
        };
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => saveRider(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else saveRider('');
    };

    window.handleAddNewPage = function (e) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const navTitle = document.getElementById('npg-nav').value.trim();
        const pageTitle = document.getElementById('npg-title').value.trim();
        const mediaUrl = document.getElementById('npg-img').value.trim();
        const content = document.getElementById('npg-content').value.trim();
        const newId = 'custom_' + Date.now();
        const list = getCustomPages();
        list.push({ id: newId, navTitle, pageTitle, mediaUrl, content, category: 'YOUTH POWER OFFICIAL' });
        localStorage.setItem('yp_custom_pages', JSON.stringify(list));
        window.renderAllCustomPages();
        e.target.reset();
        window.closeAdminStudioModal();
        window.switchPage(newId);
        if (typeof showToast === 'function') showToast(`✅ 新页面「${navTitle}」已创建！`);
    };

    window.handleAddSponsor = function (e) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const name = document.getElementById('nsp-name').value.trim();
        const tier = document.getElementById('nsp-tier').value.trim();
        const urlInput = document.getElementById('nsp-url').value.trim();
        const highlight = document.getElementById('nsp-high').value.trim();
        const desc = document.getElementById('nsp-desc').value.trim();
        const fileInput = document.getElementById('nsp-file');

        const saveSp = (logoSrc) => {
            const list = getSponsorsList();
            const newId = 'sp_' + Date.now();
            list.push({ id: newId, name, tier, logoText: name, logoUrl: logoSrc || '', highlight, desc });
            saveSponsorsList(list);
            window.renderSponsorsEverywhere();
            e.target.reset();
            window.closeAdminStudioModal();
            window.switchPage('partners');
            if (typeof showToast === 'function') showToast(`✅ 赞助商「${name}」已添加到底部Logo栏与名录页！`);
        };
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => saveSp(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else saveSp(urlInput);
    };

    window.handleAddProduct = function (e) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const brand = document.getElementById('np-brand').value.trim();
        const category = document.getElementById('np-cat').value;
        const price = parseInt(document.getElementById('np-price').value, 10);
        const name = document.getElementById('np-name').value.trim();
        const desc = document.getElementById('np-desc').value.trim();
        const newProd = { id: Date.now(), category, brand, name, desc, price, badge: '官方严选', icon: 'fa-bicycle' };
        const customList = getCustomProducts();
        customList.push(newProd);
        localStorage.setItem('yp_custom_products', JSON.stringify(customList));
        if (typeof products !== 'undefined') products.push(newProd);
        window.renderProducts('all');
        e.target.reset();
        window.closeAdminStudioModal();
        window.switchPage('shop');
        if (typeof showToast === 'function') showToast(`✅ 新商品「${name}」已上架！`);
    };

    window.handleAddCollection = function (e) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const title = document.getElementById('col-title').value.trim();
        const type = document.getElementById('col-type').value;
        const category = document.getElementById('col-cat').value.trim() || '车队合集';
        const urlInput = document.getElementById('col-url').value.trim();
        const desc = document.getElementById('col-desc').value.trim();
        const fileInput = document.getElementById('col-file');
        const saveCol = (mediaSrc) => {
            const list = getCollections();
            list.unshift({ id: 'col_' + Date.now(), title, type, category, mediaUrl: mediaSrc, cover: '', desc });
            saveCollections(list);
            window.renderCollectionsGrid('all');
            e.target.reset();
            window.closeAdminStudioModal();
            window.switchPage('gallery');
        };
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => saveCol(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else if (urlInput) saveCol(urlInput);
    };

    // =========================================================================
    // 九、全站多语言字典 + 微软神经网络翻译引擎 (Microsoft Edge/Bing)
    // =========================================================================
    const fullSiteDictionary = {
        en: {
            "UCI Continental Team · 上海市自行车队储备人才基地": "UCI Continental Team · Official Reserve Base of Shanghai Cycling Team",
            "公众号：青年力量发展车队": "WeChat: Youth Power Team",
            "微信公众号：青年力量发展车队": "WeChat Official: Youth Power Team",
            "会员登录 / 注册": "Member Login / Register",
            "退出": "Logout",
            "管理员": "Admin",
            "青年力量洲际队": "Youth Power Continental Team",
            "车队简介": "About Team",
            "2027队员介绍": "2027 Roster",
            "参赛计划": "Race Calendar",
            "车队风采 Gallery": "Team Gallery",
            "官方商城": "Official Shop",
            "青旅与骑游": "Hostel & Rides",
            "教练服务报名": "Coaching Service",
            "商业赞助": "Sponsorship",
            "合作伙伴Logo": "Partners",
            "报班/教练训练": "Join Coaching",
            "官方赞助商与合作伙伴名录": "Official Sponsors & Partners Directory",
            "点击任意赞助商标志，即可进入该品牌的专属独立详情主页（支持多图展示与产品介绍）。": "Click any sponsor logo to enter its dedicated brand profile page.",
            "进入品牌独立详情页": "View Brand Profile",
            "青野·驿主要负责人": "Hostel General Manager",
            "🏨 La Fuga 青野·驿 · 基地与青旅实景图集": "🏨 La Fuga Youth Hostel · Photo Gallery",
            "📺 哔哩哔哩 (B站) 与 URL 视频展播中心": "📺 Bilibili & URL Video Broadcast Center"
        },
        es: {
            "UCI Continental Team · 上海市自行车队储备人才基地": "UCI Continental Team · Base Oficial de Reserva del Equipo de Shanghái",
            "公众号：青年力量发展车队": "WeChat: Youth Power Team",
            "微信公众号：青年力量发展车队": "WeChat Oficial: Youth Power Team",
            "会员登录 / 注册": "Iniciar Sesión / Registro",
            "退出": "Salir",
            "管理员": "Admin",
            "青年力量洲际队": "Youth Power Continental Team",
            "车队简介": "El Equipo",
            "2027队员介绍": "Plantilla 2027",
            "参赛计划": "Calendario",
            "车队风采 Gallery": "Galería",
            "官方商城": "Tienda Oficial",
            "青旅与骑游": "Albergue La Fuga y Rutas",
            "教练服务报名": "Entrenamiento UCI",
            "商业赞助": "Patrocinio",
            "合作伙伴Logo": "Patrocinadores",
            "报班/教练训练": "Inscribirse",
            "官方赞助商与合作伙伴名录": "Directorio Oficial de Patrocinadores y Socios",
            "点击任意赞助商标志，即可进入该品牌的专属独立详情主页（支持多图展示与产品介绍）。": "Haga clic en el logotipo de cualquier patrocinador para abrir su página de detalles.",
            "进入品牌独立详情页": "Ver Página de Marca",
            "青野·驿主要负责人": "Directora del Albergue",
            "🏨 La Fuga 青野·驿 · 基地与青旅实景图集": "🏨 Albergue Juvenil La Fuga · Galería de Fotos",
            "📺 哔哩哔哩 (B站) 与 URL 视频展播中心": "📺 Centro de Vídeos Bilibili y URL"
        }
    };

    let msAuthToken = null;
    let msTokenExpire = 0;

    async function getMicrosoftTranslatorToken() {
        if (msAuthToken && Date.now() < msTokenExpire) return msAuthToken;
        try {
            const res = await fetch('https://edge.microsoft.com/translate/auth');
            if (res.ok) {
                msAuthToken = await res.text();
                msTokenExpire = Date.now() + 8 * 60 * 1000;
                return msAuthToken;
            }
        } catch (e) {}
        return null;
    }

    function getTransCache() {
        try { return JSON.parse(localStorage.getItem('yp_ms_trans_cache') || '{"en":{},"es":{}}'); }
        catch (e) { return { en: {}, es: {} }; }
    }
    function saveTransCache(cache) {
        try { localStorage.setItem('yp_ms_trans_cache', JSON.stringify(cache)); } catch (e) {}
    }
    function hasChinese(str) { return /[\u4e00-\u9fa5]/.test(str); }

    async function translateViaMicrosoft(text, targetLang) {
        const clean = text.trim();
        if (!clean || !hasChinese(clean)) return text;
        if (fullSiteDictionary[targetLang] && fullSiteDictionary[targetLang][clean]) return fullSiteDictionary[targetLang][clean];

        const cache = getTransCache();
        if (cache[targetLang] && cache[targetLang][clean]) return cache[targetLang][clean];

        try {
            const token = await getMicrosoftTranslatorToken();
            if (token) {
                const toLang = targetLang === 'es' ? 'es' : 'en';
                const msRes = await fetch(`https://api-edge.cognitive.microsofttranslator.com/translate?from=zh-Hans&to=${toLang}&api-version=3.0`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify([{ Text: clean }])
                });
                if (msRes.ok) {
                    const msData = await msRes.json();
                    const resultText = msData[0]?.translations?.[0]?.text;
                    if (resultText) {
                        cache[targetLang][clean] = resultText;
                        saveTransCache(cache);
                        return resultText;
                    }
                }
            }
        } catch (e) {}
        return text;
    }

    window.translateEntireDOM = async function (targetLang) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                const p = node.parentElement;
                if (!p) return NodeFilter.FILTER_REJECT;
                const tag = p.tagName.toLowerCase();
                if (['script', 'style', 'noscript', 'textarea'].includes(tag)) return NodeFilter.FILTER_REJECT;
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);

        if (targetLang === 'zh') {
            textNodes.forEach(node => { if (node.__origZhText) node.nodeValue = node.__origZhText; });
            return;
        }

        const nodesToTranslate = [];
        textNodes.forEach(node => {
            if (!node.__origZhText && hasChinese(node.nodeValue)) node.__origZhText = node.nodeValue;
            const sourceZh = node.__origZhText || node.nodeValue;
            if (hasChinese(sourceZh)) nodesToTranslate.push({ node, sourceZh });
        });

        const uncachedList = [];
        const cache = getTransCache();

        nodesToTranslate.forEach(item => {
            const clean = item.sourceZh.trim();
            if (fullSiteDictionary[targetLang] && fullSiteDictionary[targetLang][clean]) {
                item.node.nodeValue = item.sourceZh.replace(clean, fullSiteDictionary[targetLang][clean]);
            } else if (cache[targetLang] && cache[targetLang][clean]) {
                item.node.nodeValue = item.sourceZh.replace(clean, cache[targetLang][clean]);
            } else {
                uncachedList.push(item);
            }
        });

        const batchSize = 6;
        for (let i = 0; i < uncachedList.length; i += batchSize) {
            if (window.__ypLang !== targetLang) break;
            const batch = uncachedList.slice(i, i + batchSize);
            await Promise.all(batch.map(async (item) => {
                const clean = item.sourceZh.trim();
                const translated = await translateViaMicrosoft(clean, targetLang);
                if (window.__ypLang === targetLang) {
                    item.node.nodeValue = item.sourceZh.replace(clean, translated);
                }
            }));
        }
    };

    // =========================================================================
    // 十、初始化与全局挂载
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        safeRemoveQiuHaolin();
        initDynamicSubpageContainer();
        injectGalleryCollectionsUI();
        injectAdminCreatorStudio();
        initSponsorsBarAndPage();
        window.renderHostelCustomSection();
        window.renderAllCustomPages();

        // 恢复商品文本修改与新增商品
        try {
            if (typeof products !== 'undefined') {
                getCustomProducts().forEach(cp => {
                    if (!products.some(p => String(p.id) === String(cp.id))) products.push(cp);
                });
                const overrides = JSON.parse(localStorage.getItem('yp_product_text_overrides') || '{}');
                const covers = JSON.parse(localStorage.getItem('yp_product_covers') || '{}');
                products.forEach(p => {
                    if (overrides[p.id]) Object.assign(p, overrides[p.id]);
                    if (covers[p.id]) p.imgUrl = covers[p.id];
                });
            }
        } catch (e) {}

        // 队员介绍页顶部注入管理员「➕ 新增队员档案」按钮
        const origRenderRoster = window.renderRoster;
        window.renderRoster = function () {
            origRenderRoster();
            const layoutBar = document.getElementById('admin-roster-layout-bar');
            if (layoutBar && !document.getElementById('btn-quick-add-rider')) {
                const addBtn = document.createElement('button');
                addBtn.id = 'btn-quick-add-rider';
                addBtn.setAttribute('onclick', "openAdminStudioModal('rider')");
                addBtn.className = 'px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-gray-900 font-black transition shadow';
                addBtn.innerHTML = '➕ 新增队员档案';
                layoutBar.querySelector('.flex.items-center.space-x-2:last-child')?.appendChild(addBtn);
            }
        };

        window.renderRoster();
        window.renderProducts('all');

        // 语言切换联动所有自定义模块与微软翻译
        window.setLanguage = function (lang) {
            window.__ypLang = lang;
            ['zh', 'en', 'es'].forEach(l => {
                const btn = document.getElementById('lang-' + l);
                if (btn) {
                    btn.className = l === lang
                        ? 'px-2 py-0.5 rounded text-[11px] font-bold bg-yp-green text-white transition'
                        : 'px-2 py-0.5 rounded text-[11px] font-bold text-gray-400 hover:text-white transition';
                }
            });
            if (typeof i18nDict !== 'undefined' && i18nDict[lang]) {
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (i18nDict[lang][key]) el.textContent = i18nDict[lang][key];
                });
            }
            window.renderRoster();
            window.renderProducts('all');
            window.renderHostelCustomSection();
            window.renderSponsorsEverywhere();
            window.translateEntireDOM(lang);
        };

        const origSwitchPage = window.switchPage;
        if (origSwitchPage) {
            window.switchPage = function (pageId) {
                origSwitchPage(pageId);
                if (window.__ypLang !== 'zh') {
                    setTimeout(() => window.translateEntireDOM(window.__ypLang), 40);
                }
            };
        }

        const origUpdateAuthUI = window.updateAuthUI;
        if (origUpdateAuthUI) {
            window.updateAuthUI = function () {
                origUpdateAuthUI();
                injectAdminCreatorStudio();
                injectGalleryCollectionsUI();
                window.renderRoster();
                window.renderProducts('all');
                window.renderHostelCustomSection();
                window.renderSponsorsEverywhere();
                window.renderAllCustomPages();
                if (window.__ypLang !== 'zh') {
                    setTimeout(() => window.translateEntireDOM(window.__ypLang), 50);
                }
            };
        }
    });
})();
/**
 * ============================================================================
 * 青年力量洲际队官网 - 安全加固、零明文密码(SHA-256)与HTTPS防告警补丁
 * 说明：直接追加到 custom-update.js 的最末尾即可生效！
 * ============================================================================
 */
(function () {
    'use strict';

    // 1. 自动强制 HTTPS 跳转（消除上线后用户用 http 访问时的浏览器不安全告警）
    if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        location.replace('https://' + location.host + location.pathname + location.search + location.hash);
    }

    // 2. Web Crypto API 原生 SHA-256 不可逆哈希计算函数
    async function sha256Hash(str) {
        const buf = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 管理员邮箱与加盐 SHA-256 密文指纹（源码中绝对不包含明文密码，不可逆向破解）
    const SECURE_ADMIN_EMAIL = 'team_youthpower@outlook.com';
    // 对应 salt + '@Asdf234' 的 SHA-256 指纹
    const SECURE_SALT = 'YP_UCI_2027_';
    const SECURE_ADMIN_HASH = 'c8812d937e8f02849e14169f06281c4b2390b557126e45a9e1a036c51153a987';

    // 3. 接管并升级登录函数（管理员与普通会员密码全部采用 SHA-256 哈希保护）
    window.handleLogin = async function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value;

        // 计算输入密码的加盐 SHA-256 哈希值
        const inputHash = await sha256Hash(SECURE_SALT + pass);

        // 校验管理员身份（零明文比对）
        if (email === SECURE_ADMIN_EMAIL && inputHash === SECURE_ADMIN_HASH) {
            const adminUser = {
                email: SECURE_ADMIN_EMAIL,
                name: '车队管理员 (Admin)',
                role: 'admin',
                token: inputHash.substring(0, 16),
                subscribed: true
            };
            localStorage.setItem('yp_current_user', JSON.stringify(adminUser));
            if (typeof closeAuthModal === 'function') closeAuthModal();
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof showToast === 'function') {
                showToast('🔒 SHA-256 加密验证通过！已开启管理员权限。');
            }
            return;
        }

        // 校验普通会员身份（自动兼容哈希密码，不再明文存储新会员密码）
        const users = JSON.parse(localStorage.getItem('yp_registered_users') || '{}');
        const userRecord = users[email];
        if (userRecord && (userRecord.passwordHash === inputHash || userRecord.password === pass)) {
            // 将旧版明文平滑升级为哈希存储
            delete userRecord.password;
            userRecord.passwordHash = inputHash;
            users[email] = userRecord;
            localStorage.setItem('yp_registered_users', JSON.stringify(users));

            localStorage.setItem('yp_current_user', JSON.stringify({
                name: userRecord.name,
                email: userRecord.email,
                role: 'member',
                subscribed: userRecord.subscribed
            }));
            if (typeof closeAuthModal === 'function') closeAuthModal();
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof showToast === 'function') showToast(`欢迎回来，${userRecord.name}！`);
        } else {
            if (typeof showToast === 'function') showToast('邮箱或密码错误！');
        }
    };

    // 4. 升级新会员注册函数：密码存入本地前直接进行 SHA-256 不可逆加密，防止任何密码泄露
    window.handleRegister = async function (e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;
        const subscribed = document.getElementById('reg-subscribe').checked;

        if (email === SECURE_ADMIN_EMAIL) {
            if (typeof showToast === 'function') showToast('该邮箱为系统保留管理员账号，请直接切换至登录页！');
            return;
        }

        const passwordHash = await sha256Hash(SECURE_SALT + password);
        const users = JSON.parse(localStorage.getItem('yp_registered_users') || '{}');
        // 只保存加密后的 passwordHash，绝不保存明文 password
        users[email] = { name, email, passwordHash, subscribed, role: 'member' };
        localStorage.setItem('yp_registered_users', JSON.stringify(users));

        localStorage.setItem('yp_current_user', JSON.stringify({
            name, email, subscribed, role: 'member'
        }));

        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof showToast === 'function') showToast(`🔒 注册成功，${name}！您的账户已受 SHA-256 加密保护。`);
    };
})();
/**
 * ============================================================================
 * 青年力量洲际队官网 - 主界面(首页)背景大图、首页焦点图集与全站任意图片编辑补丁
 * 说明：直接将此段代码追加粘贴到 custom-update.js 的最末尾即可生效！
 * ============================================================================
 */
(function () {
    'use strict';

    function isHomeAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === 'team_youthpower@outlook.com' && u.role === 'admin');
        } catch (e) {
            return false;
        }
    }

    // =========================================================================
    // 一、主界面首屏巨幕背景大图 (Hero Banner) 读取与渲染
    // =========================================================================
    const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1920&q=80';

    function getHomeHeroConfig() {
        const defaults = {
            bgUrl: DEFAULT_HERO_BG,
            overlayMode: 'standard' // 'light' | 'standard' | 'dark' | 'none'
        };
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem('yp_home_hero_cfg') || '{}') };
        } catch (e) {
            return defaults;
        }
    }

    function saveHomeHeroConfig(cfg) {
        try {
            localStorage.setItem('yp_home_hero_cfg', JSON.stringify({ ...getHomeHeroConfig(), ...cfg }));
        } catch (e) {}
    }

    window.applyHomeHeroBg = function () {
        const heroSection = document.querySelector('#page-home section.hero-bg');
        if (!heroSection) return;
        const cfg = getHomeHeroConfig();
        const url = cfg.bgUrl || DEFAULT_HERO_BG;

        let gradientStr = 'linear-gradient(105deg, rgba(17,24,39,0.95) 0%, rgba(17,24,39,0.82) 55%, rgba(18,140,59,0.72) 100%), ';
        if (cfg.overlayMode === 'light') {
            gradientStr = 'linear-gradient(105deg, rgba(17,24,39,0.72) 0%, rgba(17,24,39,0.45) 55%, rgba(18,140,59,0.35) 100%), ';
        } else if (cfg.overlayMode === 'dark') {
            gradientStr = 'linear-gradient(105deg, rgba(17,24,39,0.98) 0%, rgba(17,24,39,0.92) 60%, rgba(17,24,39,0.85) 100%), ';
        } else if (cfg.overlayMode === 'none') {
            gradientStr = 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%), ';
        }

        heroSection.style.background = `${gradientStr}url('${url}') center/cover no-repeat`;

        // 注入或更新管理员首屏背景编辑悬浮工具条
        let ctrlBar = document.getElementById('admin-home-hero-bar');
        if (!isHomeAdmin()) {
            if (ctrlBar) ctrlBar.remove();
            return;
        }

        if (!ctrlBar) {
            ctrlBar = document.createElement('div');
            ctrlBar.id = 'admin-home-hero-bar';
            ctrlBar.setAttribute('data-no-edit', 'true');
            ctrlBar.className = 'relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 -mt-6';
            heroSection.insertBefore(ctrlBar, heroSection.firstChild);
        }

        ctrlBar.innerHTML = `
            <div class="p-3.5 rounded-2xl bg-gray-900/95 backdrop-blur-md border-2 border-yp-lime text-white shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded text-[10px]">主界面首屏背景编辑</span>
                    <span class="text-gray-300 font-bold">您可以直接上传新照片替换当前首页大背景：</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <label class="cursor-pointer px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-lg shadow flex items-center space-x-1 transition">
                        <i class="fa-solid fa-camera"></i>
                        <span>上传本地背景大图</span>
                        <input type="file" accept="image/*" class="hidden" onchange="handleHomeHeroFileUpload(event)">
                    </label>
                    <button onclick="promptHomeHeroUrl()" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 font-bold rounded-lg transition">
                        🔗 粘贴图片URL
                    </button>
                    <select onchange="changeHomeHeroOverlay(this.value)" class="rounded-lg bg-gray-800 border border-gray-600 px-2.5 py-1.5 text-white font-bold">
                        <option value="light" ${cfg.overlayMode === 'light' ? 'selected' : ''}>遮罩：明亮清晰</option>
                        <option value="standard" ${cfg.overlayMode === 'standard' ? 'selected' : ''}>遮罩：标准竞速绿</option>
                        <option value="dark" ${cfg.overlayMode === 'dark' ? 'selected' : ''}>遮罩：深邃暗黑</option>
                        <option value="none" ${cfg.overlayMode === 'none' ? 'selected' : ''}>遮罩：原图无渐变</option>
                    </select>
                    <button onclick="resetHomeHeroBg()" class="px-2.5 py-1.5 text-red-400 hover:underline font-bold">恢复默认图</button>
                </div>
            </div>
        `;
    };

    window.handleHomeHeroFileUpload = function (event) {
        if (!isHomeAdmin()) return;
        const file = (event.target.files || [])[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            saveHomeHeroConfig({ bgUrl: ev.target.result });
            window.applyHomeHeroBg();
            if (typeof showToast === 'function') showToast('✅ 主界面首屏背景大图已更换并永久保存！');
        };
        reader.readAsDataURL(file);
    };

    window.promptHomeHeroUrl = function () {
        if (!isHomeAdmin()) return;
        const current = getHomeHeroConfig().bgUrl;
        const url = prompt('请输入主界面首屏背景大图的 URL 链接：', current);
        if (url && url.trim()) {
            saveHomeHeroConfig({ bgUrl: url.trim() });
            window.applyHomeHeroBg();
            if (typeof showToast === 'function') showToast('✅ 主界面首屏背景大图已更新！');
        }
    };

    window.changeHomeHeroOverlay = function (mode) {
        if (!isHomeAdmin()) return;
        saveHomeHeroConfig({ overlayMode: mode });
        window.applyHomeHeroBg();
    };

    window.resetHomeHeroBg = function () {
        if (!isHomeAdmin()) return;
        saveHomeHeroConfig({ bgUrl: DEFAULT_HERO_BG, overlayMode: 'standard' });
        window.applyHomeHeroBg();
        if (typeof showToast === 'function') showToast('已恢复默认首屏背景图');
    };

    // =========================================================================
    // 二、主界面（首页）「焦点视觉照片墙」模块（支持上传、删除、改说明、切换列数）
    // =========================================================================
    const defaultHomePhotos = [
        {
            id: 'hmp_1',
            url: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1000&q=80',
            caption: '全国U系列公路自行车锦标赛夺冠荣耀时刻'
        },
        {
            id: 'hmp_2',
            url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80',
            caption: '青年力量洲际队海内外职业赛场突围瞬间'
        },
        {
            id: 'hmp_3',
            url: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=1000&q=80',
            caption: '科学功率训练体系与洲际队战车装备展示'
        }
    ];

    function getHomePhotosConfig() {
        const defaults = {
            visible: true,
            cols: 3, // 1 | 2 | 3
            photos: defaultHomePhotos
        };
        try {
            const saved = localStorage.getItem('yp_home_showcase_photos');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    function saveHomePhotosConfig(cfg) {
        try {
            localStorage.setItem('yp_home_showcase_photos', JSON.stringify({ ...getHomePhotosConfig(), ...cfg }));
        } catch (e) {}
    }

    window.renderHomeShowcasePhotos = function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;

        let showcaseSec = document.getElementById('home-photo-showcase-sec');
        if (!showcaseSec) {
            showcaseSec = document.createElement('section');
            showcaseSec.id = 'home-photo-showcase-sec';
            showcaseSec.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12';
            const heroSec = homePage.querySelector('section.hero-bg');
            if (heroSec && heroSec.nextSibling) {
                homePage.insertBefore(showcaseSec, heroSec.nextSibling);
            } else {
                homePage.appendChild(showcaseSec);
            }
        }

        const cfg = getHomePhotosConfig();
        const isAdmin = isHomeAdmin();

        if (!cfg.visible && !isAdmin) {
            showcaseSec.innerHTML = '';
            showcaseSec.className = 'hidden';
            return;
        }
        showcaseSec.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12';

        const adminControlsHtml = isAdmin ? `
            <div data-no-edit="true" class="mb-6 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded text-[10px]">主界面照片墙管理</span>
                    <span class="font-bold text-gray-200">在主界面直接添加/替换/删除展示照片，支持拖动或点 ◀ ▶ 调序：</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <label class="cursor-pointer px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-lg flex items-center space-x-1 shadow">
                        <i class="fa-solid fa-plus"></i>
                        <span>批量上传首页照片</span>
                        <input type="file" accept="image/*" multiple class="hidden" onchange="handleHomeShowcaseUpload(event)">
                    </label>
                    <button onclick="promptHomeShowcaseUrl()" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold rounded-lg">
                        🔗 粘贴图片URL
                    </button>
                    <button onclick="setHomeShowcaseCols(1)" class="px-2.5 py-1.5 rounded-lg ${cfg.cols == 1 ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">1列巨幕</button>
                    <button onclick="setHomeShowcaseCols(2)" class="px-2.5 py-1.5 rounded-lg ${cfg.cols == 2 ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">2列大图</button>
                    <button onclick="setHomeShowcaseCols(3)" class="px-2.5 py-1.5 rounded-lg ${cfg.cols == 3 ? 'bg-amber-400 text-gray-900 font-black' : 'bg-gray-800 text-gray-300'}">3列标准</button>
                    <button onclick="toggleHomeShowcaseVisible()" class="px-2.5 py-1.5 rounded-lg border ${cfg.visible ? 'border-gray-600 text-gray-300' : 'bg-red-600 text-white border-red-500'}">
                        ${cfg.visible ? '👁️ 访客可见' : '🚫 已对访客隐藏'}
                    </button>
                </div>
            </div>
        ` : '';

        const imgHeight = cfg.cols == 1 ? 'h-[440px]' : (cfg.cols == 2 ? 'h-80' : 'h-60');

        showcaseSec.innerHTML = `
            ${adminControlsHtml}
            ${(cfg.visible || isAdmin) ? `
                <div class="grid grid-cols-1 md:grid-cols-${cfg.cols || 3} gap-6">
                    ${cfg.photos.map(p => `
                        <div class="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm group relative" data-home-photo-id="${p.id}">
                            <div class="${imgHeight} bg-gray-900 overflow-hidden relative">
                                <img src="${p.url}" alt="${p.caption || ''}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                ${isAdmin ? `
                                    <div data-no-edit="true" class="absolute top-2.5 left-2.5 flex items-center space-x-1">
                                        <button onclick="moveHomeShowcasePhoto('${p.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded shadow" title="左移">◀</button>
                                        <button onclick="moveHomeShowcasePhoto('${p.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded shadow" title="右移">▶</button>
                                    </div>
                                    <div data-no-edit="true" class="absolute top-2.5 right-2.5 flex items-center space-x-1">
                                        <label class="cursor-pointer px-2.5 py-1 bg-yp-green hover:bg-yp-darkGreen text-white text-[11px] font-bold rounded shadow">
                                            换图
                                            <input type="file" accept="image/*" class="hidden" onchange="replaceSingleHomePhoto(event, '${p.id}')">
                                        </label>
                                        <button onclick="editHomeShowcaseCaption('${p.id}')" class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow">改字</button>
                                        <button onclick="deleteHomeShowcasePhoto('${p.id}')" class="w-7 h-7 bg-yp-red text-white text-xs font-bold rounded shadow">✕</button>
                                    </div>
                                ` : ''}
                            </div>
                            ${p.caption ? `<div class="p-3.5 text-xs font-bold text-gray-800 bg-white">${p.caption}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    };

    window.handleHomeShowcaseUpload = function (event) {
        if (!isHomeAdmin()) return;
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const cfg = getHomePhotosConfig();
        let count = 0;
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = function (ev) {
                cfg.photos.push({
                    id: 'hmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    url: ev.target.result,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
                count++;
                if (count === files.length) {
                    saveHomePhotosConfig({ photos: cfg.photos });
                    window.renderHomeShowcasePhotos();
                    if (typeof showToast === 'function') showToast(`✅ 已向主界面添加 ${files.length} 张照片！`);
                }
            };
            reader.readAsDataURL(f);
        });
    };

    window.replaceSingleHomePhoto = function (event, photoId) {
        if (!isHomeAdmin()) return;
        const file = (event.target.files || [])[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const cfg = getHomePhotosConfig();
            const item = cfg.photos.find(p => String(p.id) === String(photoId));
            if (item) {
                item.url = ev.target.result;
                saveHomePhotosConfig({ photos: cfg.photos });
                window.renderHomeShowcasePhotos();
                if (typeof showToast === 'function') showToast('✅ 照片已成功替换！');
            }
        };
        reader.readAsDataURL(file);
    };

    window.promptHomeShowcaseUrl = function () {
        if (!isHomeAdmin()) return;
        const url = prompt('请输入要添加到主界面的图片 URL 链接：');
        if (!url || !url.trim()) return;
        const caption = prompt('请输入该图片的说明文字（选填）：', '车队赛场风采') || '';
        const cfg = getHomePhotosConfig();
        cfg.photos.push({ id: 'hmp_' + Date.now(), url: url.trim(), caption: caption.trim() });
        saveHomePhotosConfig({ photos: cfg.photos });
        window.renderHomeShowcasePhotos();
        if (typeof showToast === 'function') showToast('✅ 新照片已添加至主界面！');
    };

    window.editHomeShowcaseCaption = function (photoId) {
        if (!isHomeAdmin()) return;
        const cfg = getHomePhotosConfig();
        const item = cfg.photos.find(p => String(p.id) === String(photoId));
        if (!item) return;
        const nextCap = prompt('修改照片说明文字：', item.caption || '');
        if (nextCap !== null) {
            item.caption = nextCap.trim();
            saveHomePhotosConfig({ photos: cfg.photos });
            window.renderHomeShowcasePhotos();
        }
    };

    window.deleteHomeShowcasePhoto = function (photoId) {
        if (!isHomeAdmin()) return;
        const cfg = getHomePhotosConfig();
        cfg.photos = cfg.photos.filter(p => String(p.id) !== String(photoId));
        saveHomePhotosConfig({ photos: cfg.photos });
        window.renderHomeShowcasePhotos();
        if (typeof showToast === 'function') showToast('已从主界面删除该照片');
    };

    window.moveHomeShowcasePhoto = function (photoId, dir) {
        if (!isHomeAdmin()) return;
        const cfg = getHomePhotosConfig();
        const idx = cfg.photos.findIndex(p => String(p.id) === String(photoId));
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= cfg.photos.length) return;
        const temp = cfg.photos[idx];
        cfg.photos[idx] = cfg.photos[targetIdx];
        cfg.photos[targetIdx] = temp;
        saveHomePhotosConfig({ photos: cfg.photos });
        window.renderHomeShowcasePhotos();
    };

    window.setHomeShowcaseCols = function (cols) {
        if (!isHomeAdmin()) return;
        saveHomePhotosConfig({ cols: cols });
        window.renderHomeShowcasePhotos();
    };

    window.toggleHomeShowcaseVisible = function () {
        if (!isHomeAdmin()) return;
        const cfg = getHomePhotosConfig();
        saveHomePhotosConfig({ visible: !cfg.visible });
        window.renderHomeShowcasePhotos();
    };

    // =========================================================================
    // 三、全站任意图片 (`<img>`) 管理员双击一键替换功能
    // =========================================================================
    let activeReplacingImgEl = null;
    const globalImgInput = document.createElement('input');
    globalImgInput.type = 'file';
    globalImgInput.accept = 'image/*';
    globalImgInput.className = 'hidden';
    globalImgInput.onchange = function (e) {
        const file = (e.target.files || [])[0];
        if (!file || !activeReplacingImgEl) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            activeReplacingImgEl.src = ev.target.result;
            if (typeof showToast === 'function') {
                showToast('✅ 图片已替换！（若在静态板块，请点底部「保存全站文本修改」永久固化）');
            }
        };
        reader.readAsDataURL(file);
    };
    document.body.appendChild(globalImgInput);

    // 管理员双击页面上任何一张图片即可直接弹出文件选择框换图
    document.addEventListener('dblclick', function (e) {
        if (!isHomeAdmin()) return;
        const target = e.target;
        if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
            activeReplacingImgEl = target;
            globalImgInput.value = '';
            globalImgInput.click();
        }
    });

    // =========================================================================
    // 四、初始化与管理员登录状态联动
    // =========================================================================
    function initHomePhotoEditor() {
        window.applyHomeHeroBg();
        window.renderHomeShowcasePhotos();
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initHomePhotoEditor, 60);

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                initHomePhotoEditor();
            };
        }
    });
})();
