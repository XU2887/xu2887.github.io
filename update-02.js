/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 独立升级插件 02 号 (update-02.js)
 * 说明：零断点完整文件！与 custom-update.js 无缝协同，不覆盖或破坏 SHA-256 管理员密码。
 * 包含功能：
 * 1. 【本地图片上传高清压缩引擎】：彻底修复从本地上传大图至影集/详情页时超出 localStorage 容量导致无法上传的问题
 * 2. 【登录界面净化】：自动删除登录弹窗中关于管理员操作权限的文字说明
 * 3. 【赞助商介绍模块 (取代招募赞助商)】：与队员介绍完全相同的卡片网格、拖拽/按钮排序、增删及每个赞助商单独的独立详情页
 * 4. 【车队最新骑游招募与赛事动态模块】：与队员介绍完全相同的卡片网格、拖拽/按钮排序、增删及每个动态单独的独立详情页
 * 5. 【车队风采“影集 (Albums)”系统 + 主页幻灯片/滚动播放选定影集】：支持影集新建、删除、移动排序、本地批量传图，并在主页幻灯片或连续滚动播放选定影集
 */

(function () {
    'use strict';

    if (window.__YP_PLUGIN_02_LOADED__) return;
    window.__YP_PLUGIN_02_LOADED__ = true;

    const ADMIN_EMAIL = 'team_youthpower@outlook.com';

    function isAdminUser() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) { return false; }
    }

    // =========================================================================
    // 一、本地图片高清智能压缩引擎（彻底解决本地图片过大无法上传至影集/localStorage的问题）
    // =========================================================================
    window.compressLocalImage = function (file, maxWidth = 1400, quality = 0.82) {
        return new Promise((resolve) => {
            if (!file || !file.type.startsWith('image/')) {
                resolve('');
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    let w = img.width, h = img.height;
                    if (w > maxWidth) {
                        h = Math.round((h * maxWidth) / w);
                        w = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    try {
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                        resolve(compressedDataUrl);
                    } catch (err) {
                        resolve(e.target.result);
                    }
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    };

    // 同步升级原有的详情页与成员封面本地上传函数，使其全部走高清压缩通道，永不卡死
    let pendingCoverTarget = null; // { type: 'sponsor'|'ridepost'|'album'|'rider', id: '...' }
    const universalCoverInput = document.createElement('input');
    universalCoverInput.type = 'file';
    universalCoverInput.accept = 'image/*';
    universalCoverInput.className = 'hidden';
    universalCoverInput.onchange = async function (ev) {
        const f = (ev.target.files || [])[0];
        if (!f || !pendingCoverTarget) return;
        const dataUrl = await window.compressLocalImage(f, 1200, 0.82);
        if (!dataUrl) return;
        const { type, id } = pendingCoverTarget;

        if (type === 'sponsor') {
            const list = getSponsorsData();
            const item = list.find(x => String(x.id) === String(id));
            if (item) { item.photo = dataUrl; item.logoUrl = dataUrl; saveSponsorsData(list); window.renderSponsorshipModule(); if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar(); }
        } else if (type === 'ridepost') {
            const list = getRidePostsData();
            const item = list.find(x => String(x.id) === String(id));
            if (item) { item.photo = dataUrl; saveRidePostsData(list); window.renderRidePostsModule(); }
        } else if (type === 'album') {
            const list = getAlbumsData();
            const item = list.find(x => String(x.id) === String(id));
            if (item) { item.cover = dataUrl; saveAlbumsData(list); window.renderGalleryAlbumsModule(); window.renderHomeAlbumSlideshow(); }
        } else if (type === 'rider') {
            const saved = JSON.parse(localStorage.getItem('yp_member_photos') || '{}');
            saved[id] = dataUrl;
            localStorage.setItem('yp_member_photos', JSON.stringify(saved));
            if (typeof window.renderRoster === 'function') window.renderRoster();
        }
        universalCoverInput.value = '';
        if (typeof showToast === 'function') showToast('✅ 封面图片已成功上传并保存！');
    };
    document.body.appendChild(universalCoverInput);

    window.triggerUniversalCoverUpload = function (type, id) {
        if (!isAdminUser()) return;
        pendingCoverTarget = { type, id };
        universalCoverInput.click();
    };

    // 接管原生的 triggerMemberPhotoUpload 与 uploadSubPhotos，加入高清压缩防溢出
    window.triggerMemberPhotoUpload = function (memberId) {
        window.triggerUniversalCoverUpload('rider', memberId);
    };

    window.uploadSubPhotos = async function (ev, t, id) {
        const files = Array.from(ev.target.files || []);
        if (!files.length) return;
        const key = `${t}_${id}`;
        const allAlbums = JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}');
        const album = allAlbums[key] || [];

        if (typeof showToast === 'function') showToast(`⏳ 正在压缩并上传 ${files.length} 张本地照片...`);
        for (const f of files) {
            const dataUrl = await window.compressLocalImage(f, 1400, 0.82);
            if (dataUrl) {
                album.push({
                    id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    url: dataUrl,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
            }
        }
        allAlbums[key] = album;
        localStorage.setItem('yp_entity_albums_v4', JSON.stringify(allAlbums));
        window.openEntitySubpage(t, id);
        if (t === 'rider' && typeof window.renderRoster === 'function') window.renderRoster();
        if (t === 'sponsor') window.renderSponsorshipModule();
        if (t === 'ridepost') window.renderRidePostsModule();
        if (typeof showToast === 'function') showToast(`✅ 成功上传 ${files.length} 张照片！`);
    };

    // =========================================================================
    // 二、删除登录界面对管理员登录后所能取得的操作权限的说明
    // =========================================================================
    function cleanLoginModalAdminHints() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.querySelectorAll('p').forEach(p => {
                if (p.textContent.includes('管理员') || p.textContent.includes('权限')) {
                    p.remove();
                }
            });
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '立即登录';
        }
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            const h3 = authModal.querySelector('h3');
            if (h3) h3.textContent = '青年力量车队 · 会员登录';
            const subP = authModal.querySelector('.bg-gray-900 p');
            if (subP) subP.textContent = '登录后自动保存购物车商品并接收车队动态通知';
            const tabLogin = document.getElementById('tab-login');
            if (tabLogin) tabLogin.textContent = '会员登录';
        }
    }

    // 通用拖拽绑定辅助
    function bindGridDragSort(gridEl, itemSelector, idAttr, onOrderChanged) {
        if (!gridEl || !isAdminUser()) return;
        let dragEl = null;
        const items = Array.from(gridEl.querySelectorAll(itemSelector));
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
                setTimeout(() => this.classList.add('yp-dragging'), 0);
            };
            item.ondragend = function (e) {
                e.stopPropagation();
                this.classList.remove('yp-dragging');
                gridEl.querySelectorAll(itemSelector).forEach(el => el.classList.remove('yp-drag-over'));
                dragEl = null;
                const newIds = Array.from(gridEl.querySelectorAll(itemSelector)).map(el => el.getAttribute(idAttr));
                if (onOrderChanged) onOrderChanged(newIds);
            };
            item.ondragover = function (e) {
                e.preventDefault(); e.stopPropagation();
                if (!dragEl || dragEl === this || dragEl.parentNode !== this.parentNode) return;
                this.classList.add('yp-drag-over');
                const siblings = Array.from(gridEl.querySelectorAll(itemSelector));
                if (siblings.indexOf(dragEl) < siblings.indexOf(this)) {
                    gridEl.insertBefore(dragEl, this.nextSibling);
                } else {
                    gridEl.insertBefore(dragEl, this);
                }
            };
            item.ondragleave = function () { this.classList.remove('yp-drag-over'); };
            item.ondrop = function (e) { e.preventDefault(); e.stopPropagation(); this.classList.remove('yp-drag-over'); };
        });
    }

    function getEntityAlbumCount(type, id) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}');
            return (all[`${type}_${id}`] || []).length;
        } catch (e) { return 0; }
    }

    // =========================================================================
    // 三、「赞助商介绍」模块（取代原“招募赞助商”部分，操作逻辑与队员介绍完全一致）
    // =========================================================================
    const defaultSponsorsData = [
        {
            id: 'sp_spect',
            name: '空力公式 (Spect)',
            tier: '官方车架合作伙伴',
            logoText: 'SPECT 空力公式',
            ageSpec: '核心器材赞助商 · 公路 / TT / Gravel 车架支持',
            highlight: '提供 Mira 破风气动车架与 Strada 超轻综合车架，助力车队征战国内外职业赛场',
            desc: '空力公式（Spect）专注于高性能碳纤维自行车架研发与空气动力学优化。作为青年力量洲际队官方车架合作伙伴，为全队提供包含大组公路、个人计时（TT）及 Gravel 砾石越野在内的全方位职业竞赛车架支持。',
            photo: ''
        },
        {
            id: 'sp_elves',
            name: 'ELVES (精灵)',
            tier: '官方器材合作伙伴',
            logoText: 'ELVES 精灵',
            ageSpec: 'UCI认证竞赛车架品牌 · 全球化赛事伙伴',
            highlight: 'Vanyar 梵雅爬坡架 / Falath EVO 破风架 / Mori 砾石车架全系支持',
            desc: 'ELVES（精灵）拥有多项 UCI 国际自盟认证的专业竞赛级车架产品。依托青年力量洲际队在大中华区与拉丁美洲、欧洲赛场的双线作战，共同展现中国智造碳纤维战车的赛场统治力。',
            photo: ''
        },
        {
            id: 'sp_essen',
            name: 'ESSEN 头盔',
            tier: '官方安全护具合作伙伴',
            logoText: 'ESSEN',
            ageSpec: '专业骑行安全装备品牌 · 气动与轻量防护',
            highlight: '赫拉 (HELA) 公路大组气动盔、超轻爬坡盔及 ITT 气动计时盔官方赞助',
            desc: 'ESSEN 深耕专业骑行头盔研发，为青年力量洲际队全体车手提供通过严格安全认证与风洞低阻优化的赫拉（HELA）气动破风头盔及个人计时赛专用头盔。',
            photo: ''
        },
        {
            id: 'sp_zeray',
            name: '和博 / 卓锐 (ZERAY)',
            tier: '官方配件与传动合作伙伴',
            logoText: 'ZERAY 卓锐',
            ageSpec: '高性能碳纤维锁踏与骑行装备制造商',
            highlight: 'ZP-115 碳纤维公路自锁脚踏、锁片及职业车队补给水壶官方赞助商',
            desc: '和博旗下卓锐（ZERAY）品牌为车队提供高刚性、轻量化的 ZP-115 碳纤维公路自锁脚踏系统与定制赛训水壶，保障车手在冲刺与摇车爬坡中的每一瓦功率传导。',
            photo: ''
        },
        {
            id: 'sp_jingteng',
            name: '静藤轮组 (Jingteng)',
            tier: '品牌出海战略合作伙伴',
            logoText: 'JINGTENG 静藤',
            ageSpec: '高性能碳纤维轮组 · 拉美与欧洲车店出海先锋',
            highlight: '依托车队哥伦比亚与西班牙赛训网络，成功开拓海外实体车店销售渠道',
            desc: '静藤轮组与青年力量洲际队深度携手品牌出海战略。依托车队在南美洲（哥伦比亚）和西班牙的常驻赛训大本营，已成功将静藤高性能轮组引入当地多家专业实体车店网络。',
            photo: ''
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
        localStorage.setItem('yp_sponsor_cols_v5', String(cols));
        window.renderSponsorshipModule();
    };

    window.moveSponsorCard = function (id, dir) {
        if (!isAdminUser()) return;
        const list = getSponsorsData();
        const i = list.findIndex(x => String(x.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveSponsorsData(list);
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
    };

    window.deleteSponsorCard = function (id) {
        if (!isAdminUser() || !confirm('确定删除该赞助商档案吗？')) return;
        saveSponsorsData(getSponsorsData().filter(x => String(x.id) !== String(id)));
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该赞助商');
    };

    // 将原 #page-sponsorship 彻底替换为与队员介绍一致的「赞助商介绍」模块
    window.renderSponsorshipModule = function () {
        const spPage = document.getElementById('page-sponsorship');
        if (!spPage) return;

        // 移除重复的“合作伙伴Logo”导航按钮，并将原“商业赞助”按钮改名为“赞助商介绍”
        document.querySelectorAll('[data-target="partners"]').forEach(btn => btn.remove());
        document.querySelectorAll('[data-target="sponsorship"]').forEach(btn => {
            if (window.__ypLang === 'en') btn.textContent = 'Sponsors';
            else if (window.__ypLang === 'es') btn.textContent = 'Patrocinadores';
            else btn.textContent = '赞助商介绍';
        });

        spPage.className = 'page-section py-14 bg-gray-900 text-white min-h-[85vh]';
        if (document.querySelector('.nav-btn.text-yp-darkGreen')?.getAttribute('data-target') === 'sponsorship') {
            spPage.classList.add('active');
        }

        if (typeof window.renderPageBgController === 'function') {
            window.renderPageBgController('sponsorship', spPage, '赞助商介绍界面');
        }

        const isAdmin = isAdminUser();
        const cols = localStorage.getItem('yp_sponsor_cols_v5') || '3';
        const list = getSponsorsData();

        let contentBox = document.getElementById('yp-sponsorship-inner-box');
        if (!contentBox) {
            // 清空原有的招募赞助商报价内容，替换为赞助商介绍容器
            Array.from(spPage.children).forEach(ch => {
                if (!ch.id.startsWith('yp-bg-ctrl-')) ch.remove();
            });
            contentBox = document.createElement('div');
            contentBox.id = 'yp-sponsorship-inner-box';
            contentBox.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
            spPage.appendChild(contentBox);
        }

        contentBox.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-10">
                <div>
                    <span class="text-yp-lime font-black tracking-widest text-sm uppercase">OFFICIAL SPONSORS & PARTNERS</span>
                    <h2 class="text-3xl sm:text-4xl font-black mt-1">官方赞助商与合作伙伴介绍</h2>
                    <p class="text-gray-400 text-sm mt-1">感谢各合作合作品牌对青年力量洲际队的鼎力支持。点击任意赞助商卡片可进入其专属独立详情主页。</p>
                </div>
            </div>

            ${isAdmin ? `
                <div data-no-edit="true" class="mb-7 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div class="flex flex-wrap items-center gap-3">
                        <button onclick="openAddSponsorModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                            <i class="fa-solid fa-handshake"></i><span>➕ 添加赞助商介绍</span>
                        </button>
                        <span class="text-yp-lime font-bold">✥ 按住任意赞助商卡片可直接【拖动排序】；点击下方绿色按钮可进入【赞助商独立详情页】编辑多图与排版！</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-300 font-bold">每行数量：</span>
                        <button onclick="setSponsorCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">2个</button>
                        <button onclick="setSponsorCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">3个</button>
                        <button onclick="setSponsorCols(4)" class="px-3 py-1.5 rounded-lg ${cols == '4' ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">4个</button>
                    </div>
                </div>
            ` : ''}

            <div id="sponsors-roster-style-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7">
                ${list.map(sp => {
                    const albumCnt = getEntityAlbumCount('sponsor', sp.id);
                    const imgUrl = sp.photo || sp.logoUrl || '';
                    return `
                        <div class="bg-gray-800/95 backdrop-blur-xs rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-spcard-id="${sp.id}">
                            <div>
                                <div onclick="openEntitySubpage('sponsor', '${sp.id}')" class="relative h-60 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                                    ${imgUrl ? `<img src="${imgUrl}" alt="${sp.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `
                                        <div class="text-center p-6">
                                            <div class="text-2xl font-black text-white group-hover:text-yp-lime tracking-widest mb-2">${sp.logoText || sp.name}</div>
                                            <span class="text-xs text-gray-400 font-bold block">点击进入品牌详情页或上传Logo/产品封面</span>
                                        </div>
                                    `}
                                    <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${sp.tier || '官方合作伙伴'}</span>
                                    ${isAdmin ? `
                                        <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                            <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                            <button onclick="moveSponsorCard('${sp.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">◀</button>
                                            <button onclick="moveSponsorCard('${sp.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">▶</button>
                                        </div>
                                        <button onclick="event.stopPropagation();triggerUniversalCoverUpload('sponsor', '${sp.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red text-white text-[11px] font-black rounded-lg shadow">📷 换封面</button>
                                    ` : ''}
                                </div>
                                <div class="p-6">
                                    <div class="text-xs text-gray-400 mb-1">${sp.ageSpec || sp.logoText || ''}</div>
                                    <h3 onclick="openEntitySubpage('sponsor', '${sp.id}')" class="text-2xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${sp.name}</h3>
                                    <div class="p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${sp.highlight || ''}</div>
                                    <div class="text-xs text-gray-300 leading-relaxed space-y-1.5 line-clamp-4">${sp.desc || ''}</div>
                                </div>
                            </div>
                            <div data-no-edit="true" class="p-4 bg-gray-900/90 border-t border-gray-700 flex items-center justify-between gap-2">
                                <button onclick="openEntitySubpage('sponsor', '${sp.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5">
                                    <i class="fa-solid fa-building"></i><span>🏢 进入赞助商独立详情页 (${albumCnt}图)</span><i class="fa-solid fa-arrow-right"></i>
                                </button>
                                ${isAdmin ? `<button onclick="deleteSponsorCard('${sp.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        bindGridDragSort(document.getElementById('sponsors-roster-style-grid'), '[data-spcard-id]', 'data-spcard-id', (newIds) => {
            const cur = getSponsorsData();
            const ordered = newIds.map(id => cur.find(s => String(s.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                saveSponsorsData(ordered);
                if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
                if (typeof showToast === 'function') showToast('✅ 赞助商排列顺序已保存！');
            }
        });
    };

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
                        <h3 class="text-lg font-black text-yp-lime">➕ 添加赞助商介绍档案</h3>
                        <button onclick="document.getElementById('yp-add-sponsor-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitAddSponsorCard(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">品牌名称 *</label><input type="text" id="asp-name" required placeholder="如：NZSE 骑行服" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">合作头衔 *</label><input type="text" id="asp-tier" required placeholder="如：官方骑行服合作伙伴" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">副标题 / 领域特点 *</label><input type="text" id="asp-age" required placeholder="如：专业定制气动骑行服品牌" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">高光亮点一句话 *</label><input type="text" id="asp-high" required placeholder="如：提供全队连体服与训练服支持" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">上传品牌 Logo / 封面图（可选）</label><input type="file" id="asp-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold mb-1">品牌与合作详细介绍 *</label><textarea id="asp-desc" required rows="3" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 保存并生成赞助商独立详情页</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitAddSponsorCard = async function (e) {
        e.preventDefault();
        const name = document.getElementById('asp-name').value.trim();
        const tier = document.getElementById('asp-tier').value.trim();
        const ageSpec = document.getElementById('asp-age').value.trim();
        const highlight = document.getElementById('asp-high').value.trim();
        const desc = document.getElementById('asp-desc').value.trim();
        const file = document.getElementById('asp-file').files[0];
        const photo = file ? await window.compressLocalImage(file, 1200, 0.82) : '';

        const list = getSponsorsData();
        list.push({ id: 'sp_' + Date.now(), name, tier, logoText: name, ageSpec, highlight, desc, photo, logoUrl: photo });
        saveSponsorsData(list);
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
        e.target.reset();
        document.getElementById('yp-add-sponsor-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 已添加赞助商：${name}`);
    };

    // =========================================================================
    // 四、「车队最新骑游招募与赛事动态」模块（操作逻辑与队员介绍完全相同，每条均有独立详情页）
    // =========================================================================
    const defaultRidePostsCards = [
        {
            id: 'rp_1',
            name: '千岛湖亚运村「La Fuga 青野·驿」常态化骑游与集训营招募',
            role_zh: '骑游与集训招募',
            ageSpec: '2026-2027 常态化开放 · 杭州千岛湖亚运村',
            highlight: '依托千岛湖环湖经典赛道，提供青旅食宿、技师保障与洲际队跟队拉练体验',
            bio: '青年力量车队官方青年旅舍位于千岛湖亚运村（La Fuga 青野·驿），由巴塞罗那自治大学酒店管理硕士关若析主理。欢迎全国各地骑行爱好者与俱乐部前来入住打卡、参与周末环湖骑游及寒暑假封闭训练营！',
            photo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80'
        },
        {
            id: 'rp_2',
            name: '2026全国公开赛（湖北枝江）大学生组夺冠战报',
            role_zh: '赛事获奖动态',
            ageSpec: '2026赛季捷报 · 湖北枝江赛场',
            highlight: '车队主力平路车手张浩阳强势斩获大学生组冠军，并入选上海市自行车队',
            bio: '在2026全国公开赛（湖北枝江）大学生组较量中，青年力量发展车队默契配合，张浩阳凭借出色的平路巡航与冲刺表现在终点力拔头筹夺得冠军，展现出车队体教结合青训体系的坚实成果。',
            photo: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80'
        }
    ];

    function getRidePostsData() {
        try {
            const saved = localStorage.getItem('yp_rideposts_cards_v5');
            return saved ? JSON.parse(saved) : defaultRidePostsCards;
        } catch (e) { return defaultRidePostsCards; }
    }

    function saveRidePostsData(list) {
        localStorage.setItem('yp_rideposts_cards_v5', JSON.stringify(list));
    }

    window.setRidePostCols = function (cols) {
        localStorage.setItem('yp_ridepost_cols_v5', String(cols));
        window.renderRidePostsModule();
    };

    window.moveRidePostCard = function (id, dir) {
        if (!isAdminUser()) return;
        const list = getRidePostsData();
        const i = list.findIndex(x => String(x.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveRidePostsData(list);
        window.renderRidePostsModule();
    };

    window.deleteRidePostCard = function (id) {
        if (!isAdminUser() || !confirm('确定删除该条骑游招募/赛事动态吗？')) return;
        saveRidePostsData(getRidePostsData().filter(x => String(x.id) !== String(id)));
        window.renderRidePostsModule();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该条动态');
    };

    window.renderRidePostsModule = function () {
        // 隐藏旧版简单表单
        const oldPublisher = document.getElementById('admin-ride-publisher');
        if (oldPublisher) oldPublisher.classList.add('hidden');

        const container = document.getElementById('ride-posts-list');
        if (!container) return;

        const isAdmin = isAdminUser();
        const cols = localStorage.getItem('yp_ridepost_cols_v5') || '2';
        const list = getRidePostsData();

        container.innerHTML = `
            ${isAdmin ? `
                <div data-no-edit="true" class="mb-6 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div class="flex flex-wrap items-center gap-3">
                        <button onclick="openAddRidePostModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                            <i class="fa-solid fa-bullhorn"></i><span>➕ 添加骑游招募 / 赛事动态</span>
                        </button>
                        <span class="text-yp-lime font-bold">✥ 操作逻辑与队员介绍完全一致：支持拖动排序、更换封面，点击卡片进入【活动/动态独立详情页】上传多图！</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-300 font-bold">每行数量：</span>
                        <button onclick="setRidePostCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">2列</button>
                        <button onclick="setRidePostCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">3列</button>
                    </div>
                </div>
            ` : ''}

            <div id="rideposts-roster-style-grid" class="grid grid-cols-1 md:grid-cols-${cols} gap-7">
                ${list.map(rp => {
                    const albumCnt = getEntityAlbumCount('ridepost', rp.id);
                    return `
                        <div class="bg-gray-900 text-white rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-rpcard-id="${rp.id}">
                            <div>
                                <div onclick="openEntitySubpage('ridepost', '${rp.id}')" class="relative h-60 bg-gray-800 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                                    ${rp.photo ? `<img src="${rp.photo}" alt="${rp.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `
                                        <div class="text-center p-6 text-gray-400 text-xs">
                                            <i class="fa-solid fa-bicycle text-3xl text-yp-lime mb-2 block"></i>
                                            <span>点击进入活动详情页或上传封面照片</span>
                                        </div>
                                    `}
                                    <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${rp.role_zh || '官方动态'}</span>
                                    ${isAdmin ? `
                                        <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                            <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                            <button onclick="moveRidePostCard('${rp.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">◀</button>
                                            <button onclick="moveRidePostCard('${rp.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">▶</button>
                                        </div>
                                        <button onclick="event.stopPropagation();triggerUniversalCoverUpload('ridepost', '${rp.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red text-white text-[11px] font-black rounded-lg shadow">📷 换封面</button>
                                    ` : ''}
                                </div>
                                <div class="p-6">
                                    <div class="text-xs text-gray-400 mb-1">${rp.ageSpec || ''}</div>
                                    <h3 onclick="openEntitySubpage('ridepost', '${rp.id}')" class="text-xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${rp.name}</h3>
                                    <div class="p-2.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${rp.highlight || ''}</div>
                                    <div class="text-xs text-gray-300 leading-relaxed space-y-1.5 line-clamp-3">${rp.bio || ''}</div>
                                </div>
                            </div>
                            <div data-no-edit="true" class="p-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-2">
                                <button onclick="openEntitySubpage('ridepost', '${rp.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5">
                                    <i class="fa-solid fa-newspaper"></i><span>🚴 进入活动/动态独立详情页 (${albumCnt}图)</span><i class="fa-solid fa-arrow-right"></i>
                                </button>
                                ${isAdmin ? `<button onclick="deleteRidePostCard('${rp.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        bindGridDragSort(document.getElementById('rideposts-roster-style-grid'), '[data-rpcard-id]', 'data-rpcard-id', (newIds) => {
            const cur = getRidePostsData();
            const ordered = newIds.map(id => cur.find(x => String(x.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                saveRidePostsData(ordered);
                if (typeof showToast === 'function') showToast('✅ 骑游与赛事动态顺序已保存！');
            }
        });
    };

    window.openAddRidePostModal = function () {
        let m = document.getElementById('yp-add-ridepost-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-add-ridepost-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            m.innerHTML = `
                <div onclick="document.getElementById('yp-add-ridepost-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
                <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                    <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                        <h3 class="text-lg font-black text-yp-lime">➕ 添加骑游招募 / 赛事动态</h3>
                        <button onclick="document.getElementById('yp-add-ridepost-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitAddRidePostCard(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">标题 *</label><input type="text" id="arp-name" required placeholder="如：千岛湖周末138km环湖骑游招募" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">分类标签 *</label><input type="text" id="arp-role" required value="骑游活动招募" placeholder="如：骑游招募 / 赛事战报" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">日期与地点 *</label><input type="text" id="arp-age" required placeholder="如：2026-11-15 · 千岛湖亚运村" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">核心亮点摘要 *</label><input type="text" id="arp-high" required placeholder="如：洲际队队员领骑 + 后勤保障车跟随" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">上传活动/赛事封面图（可选）</label><input type="file" id="arp-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold mb-1">详细招募说明或赛事战报正文 *</label><textarea id="arp-bio" required rows="3" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 发布并生成独立详情页</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitAddRidePostCard = async function (e) {
        e.preventDefault();
        const name = document.getElementById('arp-name').value.trim();
        const role_zh = document.getElementById('arp-role').value.trim();
        const ageSpec = document.getElementById('arp-age').value.trim();
        const highlight = document.getElementById('arp-high').value.trim();
        const bio = document.getElementById('arp-bio').value.trim();
        const file = document.getElementById('arp-file').files[0];
        const photo = file ? await window.compressLocalImage(file, 1200, 0.82) : '';

        const list = getRidePostsData();
        list.unshift({ id: 'rp_' + Date.now(), name, role_zh, ageSpec, highlight, bio, photo });
        saveRidePostsData(list);
        window.renderRidePostsModule();
        e.target.reset();
        document.getElementById('yp-add-ridepost-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 已发布动态：${name}`);
    };

    // 扩展 openEntitySubpage 與 saveSubEdit，使其同时支持 ridepost（骑游招募/赛事动态）及 sponsor 的直接编辑与保存
    const origOpenEntitySubpage = window.openEntitySubpage;
    window.openEntitySubpage = function (type, id) {
        if (type === 'ridepost') {
            const rp = getRidePostsData().find(x => String(x.id) === String(id));
            if (!rp) return;
            // 临时借用 roster 数据通道渲染完全一致的详情页，然后修正返回按钮为 rides
            const rosterList = typeof getSavedRosterData === 'function' ? getSavedRosterData() : [];
            const exists = rosterList.some(r => String(r.id) === String(id));
            if (!exists) {
                rosterList.push({ ...rp, flag: '🚴' });
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(rosterList));
            }
            origOpenEntitySubpage('rider', id);
            if (!exists) {
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(rosterList.filter(r => String(r.id) !== String(id))));
            }
            // 将返回按钮与保存按钮绑定到 ridepost
            const backBtn = document.querySelector('#subdetail-content button[onclick*="switchPage"]');
            if (backBtn) {
                backBtn.setAttribute('onclick', "switchPage('rides')");
                backBtn.innerHTML = `<i class="fa-solid fa-arrow-left mr-1.5"></i>返回青旅与骑游动态页`;
            }
            document.querySelectorAll('#subdetail-content [onclick*="\'rider\'"]').forEach(el => {
                el.setAttribute('onclick', el.getAttribute('onclick').replace(/'rider'/g, "'ridepost'"));
            });
            document.querySelectorAll('#subdetail-content [onchange*="\'rider\'"]').forEach(el => {
                el.setAttribute('onchange', el.getAttribute('onchange').replace(/'rider'/g, "'ridepost'"));
            });
            return;
        }
        if (origOpenEntitySubpage) origOpenEntitySubpage(type, id);
        if (type === 'sponsor') {
            const backBtn = document.querySelector('#subdetail-content button[onclick*="switchPage"]');
            if (backBtn) {
                backBtn.setAttribute('onclick', "switchPage('sponsorship')");
                backBtn.innerHTML = `<i class="fa-solid fa-arrow-left mr-1.5"></i>返回赞助商介绍页`;
            }
        }
    };

    const origSaveSubEdit = window.saveSubEdit;
    window.saveSubEdit = function (t, id) {
        if (t === 'ridepost') {
            const list = getRidePostsData();
            const item = list.find(x => String(x.id) === String(id));
            if (item) {
                item.role_zh = document.getElementById('sub-edit-role')?.innerHTML.trim() || item.role_zh;
                item.name = document.getElementById('sub-edit-title')?.innerHTML.trim() || item.name;
                item.ageSpec = document.getElementById('sub-edit-sub')?.innerHTML.trim() || item.ageSpec;
                item.highlight = document.getElementById('sub-edit-high')?.innerHTML.trim() || item.highlight;
                item.bio = document.getElementById('sub-edit-bio')?.innerHTML.trim() || item.bio;
                saveRidePostsData(list);
                window.renderRidePostsModule();
            }
        } else if (t === 'sponsor') {
            const list = getSponsorsData();
            const sp = list.find(x => String(x.id) === String(id));
            if (sp) {
                sp.tier = document.getElementById('sub-edit-role')?.innerText.trim() || sp.tier;
                sp.name = document.getElementById('sub-edit-title')?.innerText.trim() || sp.name;
                sp.ageSpec = document.getElementById('sub-edit-sub')?.innerText.trim() || sp.ageSpec;
                sp.highlight = document.getElementById('sub-edit-high')?.innerHTML.trim() || sp.highlight;
                sp.desc = document.getElementById('sub-edit-bio')?.innerHTML.trim() || sp.desc;
                saveSponsorsData(list);
                window.renderSponsorshipModule();
                if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
            }
        }
        if (origSaveSubEdit) origSaveSubEdit(t, id);
    };

    const origSetSubMainCover = window.setSubMainCover;
    window.setSubMainCover = function (t, id, url) {
        if (t === 'sponsor') {
            const list = getSponsorsData();
            const sp = list.find(x => String(x.id) === String(id));
            if (sp) { sp.photo = url; sp.logoUrl = url; saveSponsorsData(list); window.renderSponsorshipModule(); }
        } else if (t === 'ridepost') {
            const list = getRidePostsData();
            const rp = list.find(x => String(x.id) === String(id));
            if (rp) { rp.photo = url; saveRidePostsData(list); window.renderRidePostsModule(); }
        }
        if (origSetSubMainCover) origSetSubMainCover(t, id, url);
    };

    // =========================================================================
    // 五、车队风采「主题影集 (Photo Albums)」系统 + 主页幻灯片/滚动播放选定影集
    // =========================================================================
    const defaultPhotoAlbums = [
        {
            id: 'alb_championship',
            title: '🏆 全国U系列锦标赛与公开赛夺冠影集',
            tag: '冠军荣耀影集',
            desc: '收录青年力量发展车队在2023-2026全国青少年U系列公路自行车锦标赛及全国公开赛领奖台夺冠高光照片。',
            cover: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1000&q=80',
            inHomeSlideshow: true,
            photos: [
                { id: 'ap_1', url: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80', caption: '全国U系列公路自行车锦标赛包揽冠亚军领奖台' },
                { id: 'ap_2', url: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=1200&q=80', caption: '2026全国公开赛（湖北枝江）大学生组终点冲刺夺冠' }
            ]
        },
        {
            id: 'alb_overseas',
            title: '🌍 西班牙与摩洛哥洲际赛场外赛影集',
            tag: '海外征战影集',
            desc: '记录车队自2022年起与西班牙 Team Cycling Galicia、摩洛哥 SIDI ALI Unlock 洲际队合作征战海外赛场掠影。',
            cover: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1000&q=80',
            inHomeSlideshow: true,
            photos: [
                { id: 'ap_3', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80', caption: '海外公路大组赛主集团破风突围瞬间' },
                { id: 'ap_4', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80', caption: '洲际队战车装备与赛前技师整备区' }
            ]
        }
    ];

    function getAlbumsData() {
        try {
            const saved = localStorage.getItem('yp_photo_albums_v5');
            return saved ? JSON.parse(saved) : defaultPhotoAlbums;
        } catch (e) { return defaultPhotoAlbums; }
    }

    function saveAlbumsData(list) {
        localStorage.setItem('yp_photo_albums_v5', JSON.stringify(list));
    }

    function getSlideshowSettings() {
        const def = { selectedAlbumId: 'all_checked', mode: 'slides', intervalSec: 4 };
        try { return { ...def, ...JSON.parse(localStorage.getItem('yp_home_slideshow_cfg_v5') || '{}') }; }
        catch (e) { return def; }
    }

    function saveSlideshowSettings(cfg) {
        localStorage.setItem('yp_home_slideshow_cfg_v5', JSON.stringify({ ...getSlideshowSettings(), ...cfg }));
    }

    window.moveAlbumCard = function (id, dir) {
        if (!isAdminUser()) return;
        const list = getAlbumsData();
        const i = list.findIndex(a => String(a.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveAlbumsData(list);
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
    };

    window.deleteAlbumCard = function (id) {
        if (!isAdminUser() || !confirm('确定要删除整个影集及其内部照片吗？')) return;
        saveAlbumsData(getAlbumsData().filter(a => String(a.id) !== String(id)));
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该影集');
    };

    window.toggleAlbumInHomeSlideshow = function (id) {
        if (!isAdminUser()) return;
        const list = getAlbumsData();
        const alb = list.find(a => String(a.id) === String(id));
        if (!alb) return;
        alb.inHomeSlideshow = !alb.inHomeSlideshow;
        saveAlbumsData(list);
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') {
            showToast(alb.inHomeSlideshow ? `🎞️ 已将「${alb.title}」加入主页幻灯片轮播！` : `已从主页轮播移除「${alb.title}」`);
        }
    };

    window.setAlbumGridCols = function (cols) {
        localStorage.setItem('yp_album_cols_v5', String(cols));
        window.renderGalleryAlbumsModule();
    };

    // 渲染「车队风采 Gallery」页面的影集卡片网格
    window.renderGalleryAlbumsModule = function () {
        const galleryPage = document.getElementById('page-gallery');
        if (!galleryPage) return;

        // 隐藏旧的单张图片上传器与旧标题栏
        const oldUploader = document.getElementById('admin-gallery-uploader');
        if (oldUploader) oldUploader.classList.add('hidden');
        const oldUploadBtn = galleryPage.querySelector('button[onclick*="handleStaffUploadClick"]');
        if (oldUploadBtn) {
            oldUploadBtn.setAttribute('onclick', 'openCreateAlbumModal()');
            oldUploadBtn.innerHTML = `<i class="fa-solid fa-folder-plus text-yp-lime"></i><span>➕ 新建车队风采影集</span>`;
            oldUploadBtn.classList.toggle('hidden', !isAdminUser());
        }

        const grid = document.getElementById('gallery-grid');
        if (!grid) return;

        const isAdmin = isAdminUser();
        const cols = localStorage.getItem('yp_album_cols_v5') || '3';
        const albums = getAlbumsData();

        let adminBar = document.getElementById('yp-gallery-albums-admin-bar');
        if (!isAdmin) {
            if (adminBar) adminBar.remove();
        } else {
            if (!adminBar) {
                adminBar = document.createElement('div');
                adminBar.id = 'yp-gallery-albums-admin-bar';
                adminBar.setAttribute('data-no-edit', 'true');
                adminBar.className = 'mb-7 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs';
                grid.parentNode.insertBefore(adminBar, grid);
            }
            adminBar.innerHTML = `
                <div class="flex flex-wrap items-center gap-3">
                    <button onclick="openCreateAlbumModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                        <i class="fa-solid fa-images"></i><span>➕ 新建主题影集 (支持本地批量传图)</span>
                    </button>
                    <span class="text-yp-lime font-bold">✥ 按住任意影集卡片可【拖动排序】或点【◀ ▶】移动；点「🎞️ 主页轮播」可将该影集照片推送到主页幻灯片播放！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行影集数：</span>
                    <button onclick="setAlbumGridCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">2列</button>
                    <button onclick="setAlbumGridCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">3列</button>
                    <button onclick="setAlbumGridCols(4)" class="px-3 py-1.5 rounded-lg ${cols == '4' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">4列</button>
                </div>
            `;
        }

        grid.className = `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-7`;
        grid.innerHTML = albums.map(alb => {
            const photos = alb.photos || [];
            const coverImg = alb.cover || (photos[0]?.url || 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=900&q=80');
            return `
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-albcard-id="${alb.id}">
                    <div>
                        <div onclick="openAlbumDetailView('${alb.id}')" class="relative h-64 bg-gray-800 border-b border-gray-700 overflow-hidden cursor-pointer">
                            <img src="${coverImg}" alt="${alb.title}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                            <div class="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent"></div>
                            <span class="absolute top-3 left-3 px-2.5 py-1 bg-yp-darkGreen/95 text-white text-xs font-bold rounded-lg shadow">${alb.tag || '车队影集'}</span>
                            <span class="absolute top-3 right-3 px-2.5 py-1 bg-gray-900/90 border border-gray-600 text-yp-lime text-xs font-black rounded-lg">
                                <i class="fa-regular fa-images mr-1"></i>${photos.length} 张照片
                            </span>
                            ${isAdmin ? `
                                <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                    <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                    <button onclick="moveAlbumCard('${alb.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">◀</button>
                                    <button onclick="moveAlbumCard('${alb.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">▶</button>
                                </div>
                                <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 right-3 flex items-center space-x-1">
                                    <button onclick="toggleAlbumInHomeSlideshow('${alb.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-black shadow ${alb.inHomeSlideshow ? 'bg-yp-lime text-gray-900' : 'bg-gray-800/90 text-gray-300 border border-gray-600'}">
                                        ${alb.inHomeSlideshow ? '🎞️ 已在主页轮播' : '🎞️ 设为主页轮播'}
                                    </button>
                                    <button onclick="triggerUniversalCoverUpload('album', '${alb.id}')" class="px-2 py-1 bg-yp-red text-white text-[11px] font-black rounded-lg shadow">换封面</button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="p-6">
                            <h3 onclick="openAlbumDetailView('${alb.id}')" class="text-xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${alb.title}</h3>
                            <p class="text-xs text-gray-300 leading-relaxed line-clamp-3">${alb.desc || ''}</p>
                        </div>
                    </div>
                    <div data-no-edit="true" class="p-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-2">
                        <button onclick="openAlbumDetailView('${alb.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5">
                            <i class="fa-solid fa-folder-open"></i><span>📂 打开影集浏览 / 本地上传照片 (${photos.length}张)</span><i class="fa-solid fa-arrow-right"></i>
                        </button>
                        ${isAdmin ? `<button onclick="deleteAlbumCard('${alb.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        bindGridDragSort(grid, '[data-albcard-id]', 'data-albcard-id', (newIds) => {
            const cur = getAlbumsData();
            const ordered = newIds.map(id => cur.find(a => String(a.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                saveAlbumsData(ordered);
                window.renderHomeAlbumSlideshow();
                if (typeof showToast === 'function') showToast('✅ 影集排列顺序已保存！');
            }
        });
    };

    // 新建影集弹窗（支持创建时直接从本地批量选图上传）
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
                        <h3 class="text-lg font-black text-yp-lime">➕ 新建车队风采主题影集</h3>
                        <button onclick="document.getElementById('yp-create-album-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitCreateAlbum(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">影集名称 *</label><input type="text" id="calb-title" required placeholder="如：2027环鄱阳湖赛场影集" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">分类标签 *</label><input type="text" id="calb-tag" required value="赛事风采影集" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">影集简介说明 *</label><textarea id="calb-desc" required rows="2" placeholder="输入对该影集的介绍..." class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <div>
                            <label class="block font-bold mb-1 text-yp-lime">📂 从本地批量选择照片上传至此影集（支持一次多选，自动高清压缩）</label>
                            <input type="file" id="calb-files" accept="image/*" multiple class="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-yp-green file:text-white font-bold">
                        </div>
                        <label class="flex items-center space-x-2 cursor-pointer pt-1">
                            <input type="checkbox" id="calb-home" checked class="rounded text-yp-green">
                            <span class="font-bold text-gray-200">🎞️ 同时将该影集加入主页（首页）幻灯片滚动播放</span>
                        </label>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 立即创建影集并上传照片</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitCreateAlbum = async function (e) {
        e.preventDefault();
        const title = document.getElementById('calb-title').value.trim();
        const tag = document.getElementById('calb-tag').value.trim();
        const desc = document.getElementById('calb-desc').value.trim();
        const inHomeSlideshow = document.getElementById('calb-home').checked;
        const files = Array.from(document.getElementById('calb-files').files || []);

        const photos = [];
        for (const f of files) {
            const dataUrl = await window.compressLocalImage(f, 1400, 0.82);
            if (dataUrl) {
                photos.push({
                    id: 'ap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    url: dataUrl,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
            }
        }

        const newAlb = {
            id: 'alb_' + Date.now(),
            title,
            tag,
            desc,
            cover: photos[0]?.url || '',
            inHomeSlideshow,
            photos
        };

        const list = getAlbumsData();
        list.unshift(newAlb);
        saveAlbumsData(list);
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
        e.target.reset();
        document.getElementById('yp-create-album-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 影集「${title}」已创建（含 ${photos.length} 张照片）！`);
    };

    // 打开单个影集的内部相册详情页（支持本地批量上传照片、拖动排图、移动、改图注、删除照片）
    window.openAlbumDetailView = function (albumId) {
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
        const list = getAlbumsData();
        const alb = list.find(a => String(a.id) === String(albumId));
        if (!alb) return;

        if (typeof window.renderPageBgController === 'function') {
            window.renderPageBgController(`sub_album_${albumId}`, sec, `${alb.title} · 影集详情页`);
        }

        const isAdmin = isAdminUser();
        const photos = alb.photos || [];

        box.innerHTML = `
            <div class="mb-5 flex flex-wrap items-center justify-between gap-3" data-no-edit="true">
                <button onclick="switchPage('gallery')" class="px-4 py-2 rounded-xl bg-gray-900 text-yp-lime text-xs font-black shadow">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i>返回车队风采影集列表
                </button>
                ${isAdmin ? `
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <button onclick="toggleAlbumInHomeSlideshow('${alb.id}');openAlbumDetailView('${alb.id}');" class="px-3.5 py-2 rounded-xl font-black ${alb.inHomeSlideshow ? 'bg-yp-lime text-gray-900' : 'bg-gray-800 text-gray-300'}">
                            ${alb.inHomeSlideshow ? '🎞️ 已设为首页轮播影集' : '🎞️ 设为主页轮播影集'}
                        </button>
                        <button onclick="editAlbumMetaPrompt('${alb.id}')" class="px-3.5 py-2 rounded-xl bg-amber-400 text-gray-900 font-black">✏️ 修改影集标题/简介</button>
                    </div>
                ` : ''}
            </div>

            <div class="bg-gray-900 text-white rounded-3xl p-8 border border-gray-700 shadow-xl mb-8">
                <span class="px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${alb.tag || '车队风采影集'} · 共 ${photos.length} 张照片</span>
                <h2 class="text-3xl font-black mt-3 mb-2">${alb.title}</h2>
                <p class="text-sm text-gray-300 leading-relaxed">${alb.desc || ''}</p>

                ${isAdmin ? `
                    <div data-no-edit="true" class="mt-6 pt-5 border-t border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-xs">
                        <div class="md:col-span-5">
                            <label class="cursor-pointer w-full py-3 px-4 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl flex items-center justify-center space-x-2 shadow-lg transition">
                                <i class="fa-solid fa-cloud-arrow-up text-base"></i>
                                <span>➕ 从本地批量选择图片上传至此影集</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange="uploadLocalPhotosToAlbum(event, '${alb.id}')">
                            </label>
                        </div>
                        <form onsubmit="addUrlPhotoToAlbum(event, '${alb.id}')" class="md:col-span-7 flex flex-wrap sm:flex-nowrap gap-2">
                            <input type="url" id="alb-add-url-input" required placeholder="或粘贴图片链接 URL https://..." class="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                            <input type="text" id="alb-add-cap-input" placeholder="照片说明(选填)" class="w-40 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                            <button type="submit" class="px-4 py-2.5 bg-amber-400 text-gray-900 font-black rounded-xl shrink-0">添加图片</button>
                        </form>
                    </div>
                ` : ''}
            </div>

            ${photos.length === 0 ? `
                <div class="text-center py-16 bg-gray-900/80 text-gray-400 rounded-3xl border border-dashed border-gray-700 text-sm">
                    该影集暂未上传照片。${isAdmin ? '请点击上方绿色按钮「➕ 从本地批量选择图片上传至此影集」！' : ''}
                </div>
            ` : `
                <div id="album-internal-photos-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${photos.map((p, idx) => `
                        <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-md relative flex flex-col justify-between group" data-alb-pid="${p.id}">
                            <div class="h-64 bg-black overflow-hidden relative">
                                <img src="${p.url}" alt="${p.caption || alb.title}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                ${isAdmin ? `
                                    <div data-no-edit="true" class="absolute top-2.5 left-2.5 flex items-center space-x-1">
                                        <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded cursor-grab">✥ 拖动</span>
                                        <button onclick="movePhotoInAlbum('${alb.id}', ${idx}, -1)" class="w-6 h-6 bg-gray-900/90 text-white text-xs font-bold rounded">◀</button>
                                        <button onclick="movePhotoInAlbum('${alb.id}', ${idx}, 1)" class="w-6 h-6 bg-gray-900/90 text-white text-xs font-bold rounded">▶</button>
                                    </div>
                                    <div data-no-edit="true" class="absolute top-2.5 right-2.5 flex items-center space-x-1">
                                        <button onclick="setPhotoAsAlbumCover('${alb.id}', '${p.url}')" class="px-2 py-0.5 bg-yp-green text-white text-[10px] font-bold rounded shadow">设为封面</button>
                                        <button onclick="editPhotoCaptionInAlbum('${alb.id}', '${p.id}')" class="px-2 py-0.5 bg-gray-800 text-amber-400 text-[10px] font-bold rounded shadow">改字</button>
                                        <button onclick="deletePhotoFromAlbum('${alb.id}', '${p.id}')" class="w-6 h-6 bg-yp-red text-white text-xs font-bold rounded shadow">✕</button>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="p-3.5 text-xs font-bold text-gray-200 bg-gray-900 border-t border-gray-800">
                                ${p.caption || alb.title}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;

        bindGridDragSort(document.getElementById('album-internal-photos-grid'), '[data-alb-pid]', 'data-alb-pid', (newIds) => {
            const all = getAlbumsData();
            const target = all.find(a => String(a.id) === String(albumId));
            if (target && target.photos) {
                target.photos = newIds.map(pid => target.photos.find(x => String(x.id) === String(pid))).filter(Boolean);
                saveAlbumsData(all);
                window.renderHomeAlbumSlideshow();
                if (typeof showToast === 'function') showToast('✅ 影集内部照片顺序已保存！');
            }
        });

        window.switchPage('subdetail');
    };

    window.uploadLocalPhotosToAlbum = async function (event, albumId) {
        if (!isAdminUser()) return;
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        alb.photos = alb.photos || [];

        if (typeof showToast === 'function') showToast(`⏳ 正在高清压缩并上传 ${files.length} 张本地照片...`);
        for (const f of files) {
            const dataUrl = await window.compressLocalImage(f, 1400, 0.82);
            if (dataUrl) {
                alb.photos.push({
                    id: 'ap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    url: dataUrl,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
                if (!alb.cover) alb.cover = dataUrl;
            }
        }
        saveAlbumsData(all);
        window.openAlbumDetailView(albumId);
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') showToast(`✅ 成功上传 ${files.length} 张照片至影集！`);
    };

    window.addUrlPhotoToAlbum = function (e, albumId) {
        e.preventDefault();
        if (!isAdminUser()) return;
        const url = document.getElementById('alb-add-url-input')?.value.trim();
        const caption = document.getElementById('alb-add-cap-input')?.value.trim() || '';
        if (!url) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        alb.photos = alb.photos || [];
        alb.photos.push({ id: 'ap_' + Date.now(), url, caption });
        if (!alb.cover) alb.cover = url;
        saveAlbumsData(all);
        window.openAlbumDetailView(albumId);
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') showToast('✅ 已添加照片至影集！');
    };

    window.movePhotoInAlbum = function (albumId, idx, dir) {
        if (!isAdminUser()) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb || !alb.photos) return;
        const target = idx + dir;
        if (target < 0 || target >= alb.photos.length) return;
        const tmp = alb.photos[idx]; alb.photos[idx] = alb.photos[target]; alb.photos[target] = tmp;
        saveAlbumsData(all);
        window.openAlbumDetailView(albumId);
        window.renderHomeAlbumSlideshow();
    };

    window.setPhotoAsAlbumCover = function (albumId, url) {
        if (!isAdminUser()) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (alb) {
            alb.cover = url;
            saveAlbumsData(all);
            window.renderGalleryAlbumsModule();
            if (typeof showToast === 'function') showToast('⭐ 已设为该影集封面！');
        }
    };

    window.editPhotoCaptionInAlbum = function (albumId, photoId) {
        if (!isAdminUser()) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        const p = alb?.photos?.find(x => String(x.id) === String(photoId));
        if (!p) return;
        const txt = prompt('修改照片说明文字：', p.caption || '');
        if (txt !== null) {
            p.caption = txt.trim();
            saveAlbumsData(all);
            window.openAlbumDetailView(albumId);
            window.renderHomeAlbumSlideshow();
        }
    };

    window.deletePhotoFromAlbum = function (albumId, photoId) {
        if (!isAdminUser()) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (alb && alb.photos) {
            alb.photos = alb.photos.filter(x => String(x.id) !== String(photoId));
            saveAlbumsData(all);
            window.openAlbumDetailView(albumId);
            window.renderGalleryAlbumsModule();
            window.renderHomeAlbumSlideshow();
        }
    };

    window.editAlbumMetaPrompt = function (albumId) {
        if (!isAdminUser()) return;
        const all = getAlbumsData();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        const t = prompt('修改影集名称：', alb.title);
        if (t && t.trim()) alb.title = t.trim();
        const d = prompt('修改影集简介：', alb.desc || '');
        if (d !== null) alb.desc = d.trim();
        saveAlbumsData(all);
        window.openAlbumDetailView(albumId);
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
    };

    // =========================================================================
    // 六、主页（#page-home）幻灯片播放 / 滚动播放选定影集照片
    // =========================================================================
    let currentSlideIndex = 0;
    let slideTimer = null;

    function getSlideshowPhotosList() {
        const albums = getAlbumsData();
        const cfg = getSlideshowSettings();
        let targetAlbums = [];
        if (cfg.selectedAlbumId === 'all_checked') {
            targetAlbums = albums.filter(a => a.inHomeSlideshow);
            if (targetAlbums.length === 0) targetAlbums = albums;
        } else {
            const found = albums.find(a => String(a.id) === String(cfg.selectedAlbumId));
            targetAlbums = found ? [found] : albums;
        }

        constslides = [];
        targetAlbums.forEach(alb => {
            (alb.photos || []).forEach(p => {
                constslides.push({
                    photoId: p.id,
                    url: p.url,
                    caption: p.caption || alb.title,
                    albumId: alb.id,
                    albumTitle: alb.title,
                    albumTag: alb.tag
                });
            });
        });
        return constslides;
    }

    window.renderHomeAlbumSlideshow = function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;

        // 替换原首页静态照片墙 #home-photo-showcase-sec 为动态影集幻灯片/滚动播放器
        let showcaseSec = document.getElementById('home-photo-showcase-sec');
        if (!showcaseSec) {
            showcaseSec = document.createElement('section');
            showcaseSec.id = 'home-photo-showcase-sec';
            showcaseSec.setAttribute('data-hsec-id', 'sec_showcase');
            const heroSec = homePage.querySelector('section.hero-bg');
            if (heroSec && heroSec.nextSibling) homePage.insertBefore(showcaseSec, heroSec.nextSibling);
            else homePage.appendChild(showcaseSec);
        }

        const isAdmin = isAdminUser();
        const albums = getAlbumsData();
        const cfg = getSlideshowSettings();
        const slides = getSlideshowPhotosList();
        if (currentSlideIndex >= slides.length) currentSlideIndex = 0;

        showcaseSec.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10';

        const adminControlHtml = isAdmin ? `
            <div data-no-edit="true" class="mb-4 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2.5 py-1 bg-yp-lime text-gray-900 font-black rounded">🎞️ 主页影集幻灯片/滚动播放控制</span>
                    <span class="text-gray-300 font-bold">选择要在主页播放的影集与播放模式：</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <select onchange="changeHomeSlideshowAlbum(this.value)" class="rounded-xl bg-gray-800 border border-gray-600 px-3 py-1.5 text-yp-lime font-black">
                        <option value="all_checked" ${cfg.selectedAlbumId === 'all_checked' ? 'selected' : ''}>📂 播放全部已勾选「主页轮播」的影集</option>
                        ${albums.map(a => `<option value="${a.id}" ${cfg.selectedAlbumId === a.id ? 'selected' : ''}>🎯 仅播放影集：${a.title} (${(a.photos || []).length}张)</option>`).join('')}
                    </select>
                    <button onclick="setHomeSlideshowMode('slides')" class="px-3 py-1.5 rounded-xl font-bold ${cfg.mode === 'slides' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">🎞️ 幻灯片大图轮播</button>
                    <button onclick="setHomeSlideshowMode('scroll')" class="px-3 py-1.5 rounded-xl font-bold ${cfg.mode === 'scroll' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">↔️ 连续横向滚动画廊</button>
                    <select onchange="setHomeSlideshowInterval(this.value)" class="rounded-xl bg-gray-800 border border-gray-600 px-2.5 py-1.5 text-white font-bold">
                        <option value="3" ${cfg.intervalSec == 3 ? 'selected' : ''}>3秒切换</option>
                        <option value="5" ${cfg.intervalSec == 5 ? 'selected' : ''}>5秒切换</option>
                        <option value="0" ${cfg.intervalSec == 0 ? 'selected' : ''}>暂停自动播放</option>
                    </select>
                    <button onclick="switchPage('gallery')" class="px-3 py-1.5 rounded-xl bg-amber-400 text-gray-900 font-black">📂 管理影集与传图</button>
                </div>
            </div>
        ` : '';

        if (slides.length === 0) {
            showcaseSec.innerHTML = `${adminControlHtml}`;
            return;
        }

        let bodyHtml = '';
        if (cfg.mode === 'scroll') {
            // 连续横向滚动长廊模式
            bodyHtml = `
                <div class="bg-gray-900 rounded-3xl p-6 border border-gray-800 shadow-2xl overflow-hidden" data-no-edit="true">
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-white font-black text-lg flex items-center">
                            <i class="fa-solid fa-film text-yp-lime mr-2"></i><span>车队风采精选影集 · 滚动长廊 (${slides.length}张)</span>
                        </div>
                        <button onclick="switchPage('gallery')" class="text-xs text-yp-lime font-bold hover:underline">查看全部影集 &rarr;</button>
                    </div>
                    <div class="flex space-x-5 overflow-x-auto pb-3 scroll-smooth">
                        ${slides.map(s => `
                            <div onclick="openAlbumDetailView('${s.albumId}')" class="cursor-pointer shrink-0 w-80 sm:w-96 bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-yp-lime transition group">
                                <div class="h-56 bg-black overflow-hidden relative">
                                    <img src="${s.url}" alt="${s.caption}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                    <span class="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-gray-900/85 text-yp-lime text-[11px] font-bold rounded">${s.albumTitle}</span>
                                </div>
                                <div class="p-3.5 text-xs font-bold text-white truncate">${s.caption}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // 幻灯片大图轮播模式 (Slideshow Carousel)
            const cur = slides[currentSlideIndex];
            bodyHtml = `
                <div class="relative rounded-3xl overflow-hidden bg-gray-950 border-2 border-gray-800 shadow-2xl group" data-no-edit="true"
                     onmouseenter="pauseHomeSlideTimer()" onmouseleave="startHomeSlideTimer()">
                    <div class="relative h-[380px] sm:h-[500px] w-full overflow-hidden bg-black">
                        <img id="yp-home-slide-img" src="${cur.url}" alt="${cur.caption}" class="w-full h-full object-cover transition-all duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent"></div>

                        <!-- 左/右切换箭头 -->
                        <button onclick="stepHomeSlide(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gray-900/80 hover:bg-yp-green text-white flex items-center justify-center shadow-lg transition">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button onclick="stepHomeSlide(1)" class="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gray-900/80 hover:bg-yp-green text-white flex items-center justify-center shadow-lg transition">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>

                        <!-- 底部影集标题与照片说明 -->
                        <div class="absolute bottom-6 left-6 right-6 sm:left-10 sm:right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div>
                                <button onclick="openAlbumDetailView('${cur.albumId}')" class="px-3 py-1 bg-yp-green text-white text-xs font-black rounded-lg shadow mb-2 inline-flex items-center space-x-1.5 hover:bg-yp-darkGreen transition">
                                    <i class="fa-regular fa-images"></i>
                                    <span>所属影集：${cur.albumTitle} (${currentSlideIndex + 1}/${slides.length})</span>
                                </button>
                                <h3 class="text-xl sm:text-2xl font-black text-white drop-shadow">${cur.caption}</h3>
                            </div>
                            <!-- 圆点指示器 -->
                            <div class="flex flex-wrap items-center gap-1.5">
                                ${slides.map((_, idx) => `
                                    <button onclick="goToHomeSlide(${idx})" class="h-2.5 rounded-full transition-all ${idx === currentSlideIndex ? 'w-8 bg-yp-lime' : 'w-2.5 bg-white/50 hover:bg-white'}"></button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        showcaseSec.innerHTML = `${adminControlHtml}${bodyHtml}`;
        startHomeSlideTimer();
    };

    window.stepHomeSlide = function (dir) {
        const slides = getSlideshowPhotosList();
        if (!slides.length) return;
        currentSlideIndex = (currentSlideIndex + dir + slides.length) % slides.length;
        window.renderHomeAlbumSlideshow();
    };

    window.goToHomeSlide = function (idx) {
        currentSlideIndex = idx;
        window.renderHomeAlbumSlideshow();
    };

    window.changeHomeSlideshowAlbum = function (albumId) {
        currentSlideIndex = 0;
        saveSlideshowSettings({ selectedAlbumId: albumId });
        window.renderHomeAlbumSlideshow();
    };

    window.setHomeSlideshowMode = function (mode) {
        saveSlideshowSettings({ mode });
        window.renderHomeAlbumSlideshow();
    };

    window.setHomeSlideshowInterval = function (sec) {
        saveSlideshowSettings({ intervalSec: Number(sec) });
        window.renderHomeAlbumSlideshow();
    };

    window.pauseHomeSlideTimer = function () {
        if (slideTimer) { clearInterval(slideTimer); slideTimer = null; }
    };

    window.startHomeSlideTimer = function () {
        window.pauseHomeSlideTimer();
        const cfg = getSlideshowSettings();
        if (cfg.mode !== 'slides' || !cfg.intervalSec || cfg.intervalSec <= 0) return;
        slideTimer = setInterval(() => {
            const homePage = document.getElementById('page-home');
            if (homePage && homePage.classList.contains('active')) {
                window.stepHomeSlide(1);
            }
        }, cfg.intervalSec * 1000);
    };

    // =========================================================================
    // 七、统一初始化与全局挂钩（无冲突接管）
    // =========================================================================
    function initPlugin02All() {
        cleanLoginModalAdminHints();
        window.renderSponsorshipModule();
        window.renderRidePostsModule();
        window.renderGalleryAlbumsModule();
        window.renderHomeAlbumSlideshow();
    }

    window.addEventListener('DOMContentLoaded', () => {
        // 拦截 renderHomeAll 确保主页始终渲染全新的影集幻灯片轮播
        const origRenderHomeAll = window.renderHomeAll;
        if (origRenderHomeAll) {
            window.renderHomeAll = function () {
                origRenderHomeAll();
                window.renderHomeAlbumSlideshow();
            };
        }

        // 拦截 renderGallery 确保车队风采页始终渲染主题影集
        window.renderGallery = function () {
            window.renderGalleryAlbumsModule();
        };

        // 拦截 renderRidePosts 确保骑游动态使用卡片+详情页模式
        window.renderRidePosts = function () {
            window.renderRidePostsModule();
        };

        setTimeout(initPlugin02All, 140);

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                setTimeout(initPlugin02All, 40);
            };
        }

        const prevSwitchPage = window.switchPage;
        if (prevSwitchPage) {
            window.switchPage = function (pageId) {
                if (pageId === 'partners') pageId = 'sponsorship';
                prevSwitchPage(pageId);
                if (pageId === 'sponsorship') window.renderSponsorshipModule();
                if (pageId === 'rides') window.renderRidePostsModule();
                if (pageId === 'gallery') window.renderGalleryAlbumsModule();
                if (pageId === 'home') window.renderHomeAlbumSlideshow();
            };
        }
    });
})();
