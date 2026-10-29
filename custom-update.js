/**
 * 青年力量洲际队官网 - 超级管理员内容与合集扩展插件 (custom-update.js)
 * 功能：
 * 1. 自动移除邱皓麟介绍，并支持管理员可视化增删任何队员
 * 2. 新增「图片 & 视频合集 (Collections)」系统（支持MP4直传/外链、B站BV号内嵌播放、多图合集）
 * 3. 为管理员增加可视化「内容与页面管理工作台」：随时新增队员、商品、训练项目及全新独立子页面
 * 4. 自动为队员、商品、训练课程赋予「查看专属详情页」的子页面跳转能力
 */

(function () {
    // =========================================================================
    // 一、精准删除「邱皓麟」的介绍（同时清理默认数组与已保存的本地缓存）
    // =========================================================================
    function removeQiuHaolin() {
        if (typeof defaultRoster !== 'undefined') {
            const idx = defaultRoster.findIndex(r => r.id === 'qiuhaolin' || (r.name && r.name.includes('邱皓麟')));
            if (idx !== -1) defaultRoster.splice(idx, 1);
        }
        try {
            const saved = localStorage.getItem('yp_roster_custom_data');
            if (saved) {
                let list = JSON.parse(saved);
                const filtered = list.filter(r => r.id !== 'qiuhaolin' && !(r.name && r.name.includes('邱皓麟')));
                if (filtered.length !== list.length) {
                    localStorage.setItem('yp_roster_custom_data', JSON.stringify(filtered));
                }
            }
        } catch (e) {}
    }

    // =========================================================================
    // 二、数据存储辅助函数（合集、新增商品、新增训练、自定义独立页面）
    // =========================================================================
    const defaultCollections = [
        {
            id: 'col_1',
            title: '2026赛季夺冠与冲刺高光集锦',
            type: 'video', // 'image' | 'video' | 'bilibili'
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
        try {
            const saved = localStorage.getItem('yp_media_collections');
            return saved ? JSON.parse(saved) : defaultCollections;
        } catch (e) { return defaultCollections; }
    }

    function saveCollections(list) {
        localStorage.setItem('yp_media_collections', JSON.stringify(list));
    }

    function getCustomProducts() {
        try {
            return JSON.parse(localStorage.getItem('yp_custom_products') || '[]');
        } catch (e) { return []; }
    }

    function getCustomTrainings() {
        try {
            return JSON.parse(localStorage.getItem('yp_custom_trainings') || '[]');
        } catch (e) { return []; }
    }

    function getCustomPages() {
        try {
            return JSON.parse(localStorage.getItem('yp_custom_pages') || '[]');
        } catch (e) { return []; }
    }

    // =========================================================================
    // 三、注入「动态子页面详情容器」（用于展示队员、商品、训练或新建独立页）
    // =========================================================================
    function initDynamicSubpageContainer() {
        const main = document.getElementById('editable-main');
        if (!main || document.getElementById('page-subdetail')) return;

        const detailSec = document.createElement('div');
        detailSec.id = 'page-subdetail';
        detailSec.className = 'page-section py-14 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8';
        detailSec.innerHTML = `<div id="subdetail-content"></div>`;
        main.appendChild(detailSec);
    }

    // 打开任意队员、商品或训练的专属独立子页面
    window.openEntitySubpage = function (type, id) {
        const container = document.getElementById('subdetail-content');
        if (!container) return;

        if (type === 'rider') {
            const list = getSavedRosterData();
            const photos = getSavedMemberPhotos();
            const m = list.find(r => String(r.id) === String(id));
            if (!m) return;
            const img = photos[m.id] || m.photo || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80';
            container.innerHTML = `
                <button onclick="switchPage('roster')" class="mb-6 inline-flex items-center text-xs font-bold text-yp-darkGreen hover:underline">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> 返回 2027 队员介绍列表
                </button>
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                    <div class="md:col-span-5 bg-gray-800 min-h-[320px]">
                        <img src="${img}" alt="${m.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-3">
                                <span class="px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${m.role_zh}</span>
                                <span class="text-2xl">${m.flag || '🇨🇳'}</span>
                            </div>
                            <h2 class="text-3xl font-black mb-1">${m.name}</h2>
                            <p class="text-xs text-gray-400 mb-4">${m.ageSpec}</p>
                            <div class="p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-yp-lime font-bold mb-5">
                                ${m.highlight}
                            </div>
                            <div class="text-sm text-gray-200 leading-relaxed space-y-2">
                                ${m.bio}
                            </div>
                        </div>
                        <div class="mt-8 pt-4 border-t border-gray-800 text-xs text-gray-400">
                            Youth Power Continental Team · 车手个人专属档案页
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'product') {
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            container.innerHTML = `
                <button onclick="switchPage('shop')" class="mb-6 inline-flex items-center text-xs font-bold text-yp-darkGreen hover:underline">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> 返回官方器材商城
                </button>
                <div class="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div class="md:col-span-5 h-72 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-yp-darkGreen flex items-center justify-center overflow-hidden">
                        ${p.imgUrl ? `<img src="${p.imgUrl}" class="w-full h-full object-cover">` : `<i class="fa-solid ${p.icon || 'fa-bicycle'} text-7xl text-white/90"></i>`}
                    </div>
                    <div class="md:col-span-7">
                        <span class="px-3 py-1 bg-green-100 text-yp-darkGreen text-xs font-black rounded">${p.brand} · ${p.badge}</span>
                        <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-3 mb-3">${p.name}</h2>
                        <div class="text-3xl font-black text-yp-darkGreen mb-4">¥${p.price} <span class="text-xs text-gray-400 font-normal">（官方同步售价）</span></div>
                        <p class="text-sm text-gray-600 leading-relaxed mb-6">${p.detailHtml || p.desc}</p>
                        <div class="flex flex-wrap gap-3">
                            <button onclick="addToCart(${p.id})" class="px-6 py-3.5 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl text-sm transition">
                                <i class="fa-solid fa-cart-plus mr-1.5"></i> 加入购物车
                            </button>
                            <button onclick="openAlipayModal(${p.price}, '直购：${p.name}', '直购器材')" class="px-6 py-3.5 bg-yp-alipay hover:bg-blue-600 text-white font-black rounded-xl text-sm transition">
                                <i class="fa-brands fa-alipay mr-1.5"></i> 支付宝立即购买
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        switchPage('subdetail');
    };

    // =========================================================================
    // 四、增强「车队风采 Gallery」：注入【图片与视频合集中心】
    // =========================================================================
    function injectGalleryCollectionsUI() {
        const galleryPage = document.getElementById('page-gallery');
        if (!galleryPage || document.getElementById('collections-section')) return;

        const colWrapper = document.createElement('div');
        colWrapper.id = 'collections-section';
        colWrapper.className = 'mb-14 pb-10 border-b border-gray-200';
        colWrapper.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <span class="px-2.5 py-0.5 bg-yp-green/15 text-yp-darkGreen text-xs font-black rounded">PHOTO & VIDEO COLLECTIONS</span>
                    <h3 class="text-2xl font-black text-gray-900 mt-1">🎬 车队图片与视频主题合集</h3>
                </div>
                <div class="flex flex-wrap gap-2" data-no-edit="true">
                    <button onclick="renderCollectionsGrid('all')" class="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg">全部合集</button>
                    <button onclick="renderCollectionsGrid('video')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-lg">🎬 视频合集</button>
                    <button onclick="renderCollectionsGrid('image')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-lg">📸 图片合集</button>
                </div>
            </div>
            <div id="collections-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
        `;

        const galleryGrid = document.getElementById('gallery-grid');
        if (galleryGrid) {
            galleryPage.insertBefore(colWrapper, galleryGrid);
        }
        renderCollectionsGrid('all');
    }

    window.renderCollectionsGrid = function (filterType = 'all') {
        const grid = document.getElementById('collections-grid');
        if (!grid) return;
        const isAdmin = typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin();
        let list = getCollections();
        if (filterType === 'video') list = list.filter(c => c.type === 'video' || c.type === 'bilibili');
        if (filterType === 'image') list = list.filter(c => c.type === 'image');

        grid.innerHTML = list.map(col => {
            let mediaHtml = '';
            if (col.type === 'video') {
                mediaHtml = `<video src="${col.mediaUrl}" poster="${col.cover || ''}" controls class="w-full h-64 object-cover bg-black"></video>`;
            } else if (col.type === 'bilibili') {
                const bvid = col.mediaUrl.includes('BV') ? col.mediaUrl.match(/BV[a-zA-Z0-9]+/)[0] : col.mediaUrl;
                mediaHtml = `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0" class="w-full h-64 bg-black" frameborder="0" allowfullscreen></iframe>`;
            } else {
                mediaHtml = `<img src="${col.mediaUrl || col.cover}" alt="${col.title}" class="w-full h-64 object-cover">`;
            }

            return `
                <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div>
                        <div class="relative bg-gray-900">
                            ${mediaHtml}
                            <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/85 text-yp-lime text-xs font-bold rounded backdrop-blur-xs">
                                ${col.type === 'image' ? '📸 图片合集' : '🎬 视频合集'} · ${col.category || '官方合集'}
                            </span>
                            ${isAdmin ? `
                                <button onclick="deleteCollectionItem('${col.id}')" data-no-edit="true" class="absolute top-3 right-3 px-2.5 py-1 bg-yp-red text-white text-xs font-bold rounded shadow">
                                    删除合集
                                </button>
                            ` : ''}
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
        const list = getCollections().filter(c => String(c.id) !== String(id));
        saveCollections(list);
        renderCollectionsGrid('all');
        showToast('已删除该合集');
    };

    // =========================================================================
    // 五、扩展队员列表、商城商品、教练训练卡片（支持删除与打开详情子页面）
    // =========================================================================
    window.deleteRosterMember = function (id) {
        if (!confirm('确定要从车队名单中删除该成员吗？')) return;
        const list = getSavedRosterData().filter(r => String(r.id) !== String(id));
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
        renderRoster();
        showToast('已删除该队员介绍');
    };

    // 增强原有的 renderRoster：为每张卡片注入「查看个人详情页」和管理员「删除队员」按钮
    const origRenderRoster = window.renderRoster;
    window.renderRoster = function () {
        if (origRenderRoster) origRenderRoster();
        const isAdmin = typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin();
        document.querySelectorAll('#roster-grid > [data-roster-id]').forEach(card => {
            const id = card.getAttribute('data-roster-id');
            const footerBar = document.createElement('div');
            footerBar.setAttribute('data-no-edit', 'true');
            footerBar.className = 'px-6 py-3 bg-gray-900/70 border-t border-gray-700 flex items-center justify-between text-xs';
            footerBar.innerHTML = `
                <button onclick="openEntitySubpage('rider', '${id}')" class="text-yp-lime font-bold hover:underline flex items-center">
                    <span>进入个人独立主页</span> <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
                ${isAdmin ? `
                    <button onclick="deleteRosterMember('${id}')" class="text-red-400 hover:text-red-300 font-bold">
                        <i class="fa-solid fa-trash mr-1"></i>删除队员
                    </button>
                ` : ''}
            `;
            card.appendChild(footerBar);
        });
    };

    // 加载管理员新增的商品与训练项目
    function mergeCustomProductsAndTrainings() {
        if (typeof products !== 'undefined') {
            const customProds = getCustomProducts();
            customProds.forEach(cp => {
                if (!products.some(p => String(p.id) === String(cp.id))) {
                    products.push(cp);
                }
            });
            renderProducts('all');
        }

        // 为商城卡片增加「详情页」入口
        const origRenderProducts = window.renderProducts;
        window.renderProducts = function (filter = 'all') {
            if (origRenderProducts) origRenderProducts(filter);
            const grid = document.getElementById('product-grid');
            if (!grid) return;
            const list = filter === 'all' ? products : products.filter(p => p.category === filter);
            Array.from(grid.children).forEach((card, idx) => {
                const p = list[idx];
                if (!p) return;
                const titleEl = card.querySelector('h3');
                if (titleEl) {
                    titleEl.className = 'font-black text-gray-900 hover:text-yp-darkGreen cursor-pointer text-sm leading-snug mb-1.5';
                    titleEl.setAttribute('onclick', `openEntitySubpage('product', '${p.id}')`);
                    titleEl.title = '点击进入商品独立详情页';
                }
            });
        };
        window.renderProducts('all');

        // 渲染管理员自定义的训练课程卡片
        renderCustomTrainings();
    }

    function renderCustomTrainings() {
        const coachingPage = document.getElementById('page-coaching');
        if (!coachingPage) return;
        let customGrid = document.getElementById('custom-training-grid');
        if (!customGrid) {
            customGrid = document.createElement('div');
            customGrid.id = 'custom-training-grid';
            customGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10';
            const formBox = document.getElementById('coach-form-box');
            if (formBox) coachingPage.insertBefore(customGrid, formBox);
        }

        const list = getCustomTrainings();
        const isAdmin = typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin();
        const selectEl = document.getElementById('coach-tier-select');

        customGrid.innerHTML = list.map(t => {
            // 同步加入下拉框
            if (selectEl && !selectEl.querySelector(`option[data-custom-id="${t.id}"]`)) {
                const opt = document.createElement('option');
                opt.value = t.price;
                opt.setAttribute('data-name', t.title);
                opt.setAttribute('data-custom-id', t.id);
                opt.textContent = `${t.title} — ¥${t.price} / ${t.unit || '月'}`;
                selectEl.appendChild(opt);
            }
            return `
                <div class="bg-white rounded-2xl border-2 border-yp-lime p-6 shadow-xs flex flex-col justify-between relative">
                    ${isAdmin ? `<button onclick="deleteCustomTraining('${t.id}')" class="absolute top-3 right-3 text-xs text-yp-red font-bold">删除</button>` : ''}
                    <div>
                        <span class="px-3 py-1 bg-green-100 text-yp-darkGreen text-xs font-black rounded-full">${t.tag || '新增训练专项'}</span>
                        <h3 class="text-xl font-black text-gray-900 mt-3">${t.title}</h3>
                        <div class="mt-2 mb-3"><span class="text-3xl font-black text-yp-darkGreen">¥${t.price}</span><span class="text-xs text-gray-500 font-bold"> / ${t.unit || '月'}</span></div>
                        <p class="text-xs text-gray-600 leading-relaxed">${t.desc}</p>
                    </div>
                    <button onclick="selectCoachTier('${t.title}', ${t.price})" class="mt-5 w-full py-2.5 bg-yp-darkGreen hover:bg-yp-green text-white text-xs font-black rounded-xl transition">
                        选择此项目 (¥${t.price})
                    </button>
                </div>
            `;
        }).join('');
    }

    window.deleteCustomTraining = function (id) {
        const list = getCustomTrainings().filter(t => String(t.id) !== String(id));
        localStorage.setItem('yp_custom_trainings', JSON.stringify(list));
        renderCustomTrainings();
        showToast('已删除该训练课程');
    };

    // =========================================================================
    // 六、渲染管理员创建的「自定义独立新页面」
    // =========================================================================
    function renderAllCustomPages() {
        const pages = getCustomPages();
        const desktopNav = document.querySelector('header nav.hidden.xl\\:flex');
        const mobileNav = document.querySelector('header div.xl\\:hidden.flex');
        const mainContainer = document.getElementById('editable-main');
        const isAdmin = typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin();

        // 先清理旧的自定义导航与页面
        document.querySelectorAll('.custom-nav-item, .custom-page-sec').forEach(el => el.remove());

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
                            ${isAdmin ? `<button onclick="deleteCustomPage('${p.id}')" data-no-edit="true" class="px-3 py-1.5 bg-yp-red text-white text-xs font-bold rounded-lg">删除此页面</button>` : ''}
                        </div>
                        ${p.mediaUrl ? `<div class="mb-6 rounded-2xl overflow-hidden max-h-96 bg-gray-900 flex justify-center"><img src="${p.mediaUrl}" class="object-cover max-h-96 w-full"></div>` : ''}
                        <div class="prose max-w-none text-sm text-gray-700 leading-relaxed whitespace-pre-line">${p.content}</div>
                    </div>
                `;
                mainContainer.appendChild(sec);
            }
        });
    }

    window.deleteCustomPage = function (id) {
        if (!confirm('确定要删除这个自定义页面吗？')) return;
        const list = getCustomPages().filter(p => String(p.id) !== String(id));
        localStorage.setItem('yp_custom_pages', JSON.stringify(list));
        renderAllCustomPages();
        switchPage('home');
        showToast('已删除该自定义页面');
    };

    // =========================================================================
    // 七、管理员专属「➕ 内容与页面管理中心 Modal」
    // =========================================================================
    function injectAdminCreatorStudio() {
        // 1. 往底部管理员控制栏添加入口按钮
        const floatBar = document.querySelector('#admin-floating-bar .flex.flex-wrap.items-center.gap-2');
        if (floatBar && !document.getElementById('btn-open-studio')) {
            const studioBtn = document.createElement('button');
            studioBtn.id = 'btn-open-studio';
            studioBtn.setAttribute('onclick', 'openAdminStudioModal()');
            studioBtn.className = 'px-4 py-2 bg-amber-400 text-gray-900 text-xs font-black rounded-lg hover:bg-amber-300 transition flex items-center space-x-1.5 shadow';
            studioBtn.innerHTML = `<i class="fa-solid fa-folder-plus"></i><span>➕ 创建合集 / 队员 / 商品 / 新页面</span>`;
            floatBar.insertBefore(studioBtn, floatBar.firstChild);
        }

        // 2. 创建管理弹窗
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
                        <h3 class="text-lg font-black mt-1">管理员内容创建与新页面工作台</h3>
                    </div>
                    <button onclick="closeAdminStudioModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <!-- 5大功能切换标签 -->
                <div class="flex overflow-x-auto bg-gray-100 p-2 gap-1.5 text-xs font-bold border-b border-gray-200">
                    <button onclick="switchStudioTab('collection')" id="stab-collection" class="studio-tab px-3 py-2 rounded-lg bg-yp-darkGreen text-white shrink-0">🎬 新增图片/视频合集</button>
                    <button onclick="switchStudioTab('rider')" id="stab-rider" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🚴 新增车队成员</button>
                    <button onclick="switchStudioTab('product')" id="stab-product" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🛒 上架新商城商品</button>
                    <button onclick="switchStudioTab('training')" id="stab-training" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">📋 新增教练训练课</button>
                    <button onclick="switchStudioTab('newpage')" id="stab-newpage" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">📄 创建全新独立页面</button>
                </div>

                <div class="p-6 overflow-y-auto space-y-4 text-xs">
                    <!-- 表单1：创建图片/视频合集 -->
                    <form id="sform-collection" onsubmit="handleAddCollection(event)" class="space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">合集名称 *</label>
                                <input type="text" id="col-title" required placeholder="如：2027环哥伦比亚赛段视频集锦" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">合集类型 *</label>
                                <select id="col-type" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                                    <option value="video">🎬 MP4 视频合集 (本地上传或直链)</option>
                                    <option value="bilibili">📺 B站视频合集 (填BV号或B站链接)</option>
                                    <option value="image">📸 高清图片合集</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">分类标签</label>
                                <input type="text" id="col-cat" placeholder="如：赛事集锦 / 器材评测 / 冬训纪实" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">上传本地图片/视频文件（可选）</label>
                                <input type="file" id="col-file" accept="image/*,video/*" class="w-full text-xs">
                            </div>
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">或 填写视频URL / B站BV号 / 图片外链</label>
                            <input type="text" id="col-url" placeholder="如：BV1xx411c7mD 或 https://.../video.mp4" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">合集简介说明</label>
                            <textarea id="col-desc" rows="2" placeholder="输入对该图片/视频合集的介绍..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即发布到「车队风采 Gallery」合集区</button>
                    </form>

                    <!-- 表单2：新增队员 -->
                    <form id="sform-rider" onsubmit="handleAddRider(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">队员姓名 *</label>
                                <input type="text" id="nr-name" required placeholder="如：王小明 (Wang Xiaoming)" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">队内职务/角色 *</label>
                                <input type="text" id="nr-role" required placeholder="如：中方青训冲刺手" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">国籍旗帜</label>
                                <input type="text" id="nr-flag" value="🇨🇳" placeholder="🇨🇳 / 🇨🇴 / 🇪🇸" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">年龄与技术特点 *</label>
                                <input type="text" id="nr-age" required placeholder="如：19岁 · 爬坡/计时赛手" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">高光头衔一句话 *</label>
                                <input type="text" id="nr-high" required placeholder="如：2026全国青年赛前三名" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">上传队员定妆照片（可选）</label>
                            <input type="file" id="nr-file" accept="image/*" class="w-full text-xs">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">详细个人履历介绍 *</label>
                            <textarea id="nr-bio" required rows="3" placeholder="输入队员的详细比赛经历与个人介绍..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">添加队员并生成个人主页</button>
                    </form>

                    <!-- 表单3：上架新商品 -->
                    <form id="sform-product" onsubmit="handleAddProduct(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">品牌名称 *</label>
                                <input type="text" id="np-brand" required placeholder="如：空力公式 / 静藤轮组" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">所属分类 *</label>
                                <select id="np-cat" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                                    <option value="spect">空力公式 (Spect)</option>
                                    <option value="elves">精灵 (ELVES)</option>
                                    <option value="helmet">ESSEN头盔</option>
                                    <option value="pedal">卓锐锁踏/配件</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">官方售价 (元) *</label>
                                <input type="number" id="np-price" required placeholder="如：3999" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">商品完整名称 *</label>
                            <input type="text" id="np-name" required placeholder="如：静藤 50mm 碳纤维真空胎公路轮组" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">商品简介与详情说明 *</label>
                            <textarea id="np-desc" required rows="3" placeholder="输入规格参数、尺寸说明等..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即上架到官方商城</button>
                    </form>

                    <!-- 表单4：新增训练项目 -->
                    <form id="sform-training" onsubmit="handleAddTraining(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">训练课程名称 *</label>
                                <input type="text" id="nt-title" required placeholder="如：寒暑假千岛湖封闭集训营" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">收费价格 (元) *</label>
                                <input type="number" id="nt-price" required placeholder="如：2800" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">计费单位</label>
                                <input type="text" id="nt-unit" value="期" placeholder="月 / 期 / 次" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">课程详细内容说明 *</label>
                            <textarea id="nt-desc" required rows="3" placeholder="输入适合人群、训练内容及包含服务..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即添加到教练服务页面</button>
                    </form>

                    <!-- 表单5：创建全新独立导航页面 -->
                    <form id="sform-newpage" onsubmit="handleAddNewPage(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">顶部导航栏按钮名称 *</label>
                                <input type="text" id="npg-nav" required placeholder="如：📰 赛事战报 / 🎓 青训招生" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">页面主标题 *</label>
                                <input type="text" id="npg-title" required placeholder="如：青年力量洲际队2027赛季官方战报专栏" class="w-full rounded-xl border border-gray-300 px-3 py-2">
                            </div>
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">页面配图外链URL（选填）</label>
                            <input type="url" id="npg-img" placeholder="https://..." class="w-full rounded-xl border border-gray-300 px-3 py-2">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">页面正文内容 (支持多段落文本或HTML) *</label>
                            <textarea id="npg-content" required rows="4" placeholder="输入新页面的详细正文内容..." class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即创建新页面并添加到导航栏</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.openAdminStudioModal = function () {
        document.getElementById('admin-studio-modal').classList.remove('hidden');
    };

    window.closeAdminStudioModal = function () {
        document.getElementById('admin-studio-modal').classList.add('hidden');
    };

    window.switchStudioTab = function (tab) {
        ['collection', 'rider', 'product', 'training', 'newpage'].forEach(t => {
            document.getElementById('sform-' + t).classList.toggle('hidden', t !== tab);
            const btn = document.getElementById('stab-' + t);
            btn.className = t === tab
                ? 'studio-tab px-3 py-2 rounded-lg bg-yp-darkGreen text-white shrink-0'
                : 'studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0';
        });
    };

    // 提交合集
    window.handleAddCollection = function (e) {
        e.preventDefault();
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
            renderCollectionsGrid('all');
            e.target.reset();
            closeAdminStudioModal();
            switchPage('gallery');
            showToast('新合集已成功发布至「车队风采 Gallery」！');
        };

        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => saveCol(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else if (urlInput) {
            saveCol(urlInput);
        } else {
            showToast('请上传文件或填写媒体链接/BV号！');
        }
    };

    // 提交新队员
    window.handleAddRider = function (e) {
        e.preventDefault();
        const name = document.getElementById('nr-name').value.trim();
        const role = document.getElementById('nr-role').value.trim();
        const flag = document.getElementById('nr-flag').value.trim() || '🇨🇳';
        const ageSpec = document.getElementById('nr-age').value.trim();
        const highlight = document.getElementById('nr-high').value.trim();
        const bio = document.getElementById('nr-bio').value.trim();
        const fileInput = document.getElementById('nr-file');

        const saveRider = (photoData) => {
            const list = getSavedRosterData();
            const newId = 'rider_' + Date.now();
            list.push({ id: newId, role_zh: role, role_en: role, role_es: role, name, flag, ageSpec, highlight, bio, photo: photoData || '' });
            localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
            renderRoster();
            e.target.reset();
            closeAdminStudioModal();
            switchPage('roster');
            showToast(`已成功添加队员：${name}`);
        };

        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => saveRider(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            saveRider('');
        }
    };

    // 提交新商品
    window.handleAddProduct = function (e) {
        e.preventDefault();
        const brand = document.getElementById('np-brand').value.trim();
        const category = document.getElementById('np-cat').value;
        const price = parseInt(document.getElementById('np-price').value, 10);
        const name = document.getElementById('np-name').value.trim();
        const desc = document.getElementById('np-desc').value.trim();

        const newProd = { id: Date.now(), category, brand, name, desc, price, badge: '官方严选', icon: 'fa-bicycle' };
        const customList = getCustomProducts();
        customList.push(newProd);
        localStorage.setItem('yp_custom_products', JSON.stringify(customList));
        products.push(newProd);
        renderProducts('all');
        e.target.reset();
        closeAdminStudioModal();
        switchPage('shop');
        showToast(`新商品「${name}」已上架！`);
    };

    // 提交新训练课程
    window.handleAddTraining = function (e) {
        e.preventDefault();
        const title = document.getElementById('nt-title').value.trim();
        const price = parseInt(document.getElementById('nt-price').value, 10);
        const unit = document.getElementById('nt-unit').value.trim() || '月';
        const desc = document.getElementById('nt-desc').value.trim();

        const list = getCustomTrainings();
        list.push({ id: 'tr_' + Date.now(), title, price, unit, desc, tag: '特色训练专班' });
        localStorage.setItem('yp_custom_trainings', JSON.stringify(list));
        renderCustomTrainings();
        e.target.reset();
        closeAdminStudioModal();
        switchPage('coaching');
        showToast(`新训练项目「${title}」已添加！`);
    };

    // 提交全新独立页面
    window.handleAddNewPage = function (e) {
        e.preventDefault();
        const navTitle = document.getElementById('npg-nav').value.trim();
        const pageTitle = document.getElementById('npg-title').value.trim();
        const mediaUrl = document.getElementById('npg-img').value.trim();
        const content = document.getElementById('npg-content').value.trim();

        const newId = 'custom_' + Date.now();
        const list = getCustomPages();
        list.push({ id: newId, navTitle, pageTitle, mediaUrl, content, category: 'YOUTH POWER OFFICIAL' });
        localStorage.setItem('yp_custom_pages', JSON.stringify(list));
        renderAllCustomPages();
        e.target.reset();
        closeAdminStudioModal();
        switchPage(newId);
        showToast(`全新页面「${navTitle}」已创建并加入顶部导航栏！`);
    };

    // 钩住 updateAuthUI 确保管理员登录/退出时刷新所有管理按钮
    const origUpdateAuthUI = window.updateAuthUI;
    window.updateAuthUI = function () {
        if (origUpdateAuthUI) origUpdateAuthUI();
        injectAdminCreatorStudio();
        renderCollectionsGrid('all');
        renderCustomTrainings();
        renderAllCustomPages();
    };

    // =========================================================================
    // 八、插件初始化执行
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        removeQiuHaolin();
        initDynamicSubpageContainer();
        injectGalleryCollectionsUI();
        mergeCustomProductsAndTrainings();
        renderAllCustomPages();
        injectAdminCreatorStudio();
        renderRoster();
    });
})();
/**
 * ============================================================================
 * 青年力量洲际队官网 - 全站中文 -> 英语(EN) / 西班牙语(ES) 自动翻译引擎插件
 * 说明：直接将此段代码追加到 custom-update.js 文件的最末尾即可！
 * 特性：
 * 1. 深度拦截顶部 中文 / EN / ES 按钮，实现全站所有角落（含动态新增内容）100%翻译
 * 2. 内置自行车职业赛场专业术语词典（秒速精准翻译） + 自动云端神经网络翻译兜底
 * 3. 自动记忆原始中文，随时切回中文分毫不差；翻译结果本地持久化缓存，越用越快
 * ============================================================================
 */
(function () {
    // 1. 自行车职业车队核心词库（确保专有名词地道精准，0延迟响应）
    const builtInTranslations = {
        en: {
            "公众号：青年力量发展车队": "WeChat: Youth Power Team",
            "微信公众号：青年力量发展车队": "WeChat Official: Youth Power Team",
            "会员登录 / 注册": "Member Login / Register",
            "退出": "Logout",
            "管理员": "Admin",
            "报班/教练训练": "Join Coaching",
            "全部器材": "All Gear",
            "空力公式 (Spect)": "Spect Frames",
            "精灵 (ELVES)": "ELVES Frames",
            "ESSEN赫拉头盔": "ESSEN Helmets",
            "卓锐ZP115锁踏": "ZERAY Pedals",
            "官方同步售价": "Official Price",
            "选购": "Add to Cart",
            "淘宝官方同价": "Official Store Price",
            "超轻综合架": "Ultralight All-Rounder",
            "UCI认证爬坡架": "UCI Approved Climber",
            "破风主力款": "Aero Pro Frame",
            "旗舰EXP款": "Flagship Aero EXP",
            "Gravel瓜车": "Gravel Frame",
            "赫拉HELA正品": "Genuine HELA Aero",
            "进入个人独立主页": "View Rider Profile",
            "删除队员": "Delete Rider",
            "上传/更换照片": "Upload Photo",
            "2027赛季官方定妆照预留位": "2027 Official Portrait Slot",
            "工作人员上传车队图片": "Staff Upload Photo",
            "全部合集": "All Collections",
            "🎬 视频合集": "🎬 Video Collections",
            "📸 图片合集": "📸 Photo Collections",
            "🎬 车队图片与视频主题合集": "🎬 Team Photo & Video Collections",
            "提交入住 / 骑游咨询": "Submit Hostel / Ride Inquiry",
            "选择 U16 (¥800/月)": "Select U16 (¥800/mo)",
            "选择 U18 (¥1000/月)": "Select U18 (¥1000/mo)",
            "选择 U23 (¥1200/月)": "Select U23 (¥1200/mo)",
            "选择 成人组 (¥1800/月)": "Select Adult (¥1800/mo)",
            "提交报名并打开支付宝付款": "Submit & Pay via Alipay",
            "提交订单并前往支付宝付款": "Checkout with Alipay",
            "开启全站文本编辑": "Enable Full-Site Text Edit",
            "保存全站文本修改": "Save All Text Changes",
            "恢复默认文本": "Reset Default Text",
            "➕ 创建合集 / 队员 / 商品 / 新页面": "➕ Create Collection / Rider / Item / Page"
        },
        es: {
            "公众号：青年力量发展车队": "WeChat: Youth Power Team",
            "微信公众号：青年力量发展车队": "Cuenta Oficial WeChat: Youth Power",
            "会员登录 / 注册": "Iniciar Sesión / Registro",
            "退出": "Salir",
            "管理员": "Admin",
            "报班/教练训练": "Inscribirse al Entrenamiento",
            "全部器材": "Todo el Material",
            "空力公式 (Spect)": "Cuadros Spect",
            "精灵 (ELVES)": "Cuadros ELVES",
            "ESSEN赫拉头盔": "Cascos ESSEN",
            "卓锐ZP115锁踏": "Pedales ZERAY",
            "官方同步售价": "Precio Oficial",
            "选购": "Añadir",
            "淘宝官方同价": "Precio Tienda Oficial",
            "超轻综合架": "Ultraligero Todoterreno",
            "UCI认证爬坡架": "Escalador Aprobado UCI",
            "破风主力款": "Cuadro Aero Pro",
            "旗舰EXP款": "Aero EXP Insignia",
            "Gravel瓜车": "Cuadro Gravel",
            "赫拉HELA正品": "Casco Aero HELA",
            "进入个人独立主页": "Ver Perfil del Ciclista",
            "删除队员": "Eliminar Ciclista",
            "上传/更换照片": "Subir Foto",
            "2027赛季官方定妆照预留位": "Espacio para Foto Oficial 2027",
            "工作人员上传车队图片": "Subir Foto (Personal)",
            "全部合集": "Todas las Colecciones",
            "🎬 视频合集": "🎬 Colección de Vídeos",
            "📸 图片合集": "📸 Colección de Fotos",
            "🎬 车队图片与视频主题合集": "🎬 Colecciones de Fotos y Vídeos del Equipo",
            "提交入住 / 骑游咨询": "Enviar Consulta de Albergue / Ruta",
            "选择 U16 (¥800/月)": "Elegir Sub-16 (¥800/mes)",
            "选择 U18 (¥1000/月)": "Elegir Sub-18 (¥1000/mes)",
            "选择 U23 (¥1200/月)": "Elegir Sub-23 (¥1200/mes)",
            "选择 成人组 (¥1800/月)": "Elegir Adultos (¥1800/mes)",
            "提交报名并打开支付宝付款": "Inscribirse y Pagar con Alipay",
            "提交订单并前往支付宝付款": "Pagar Pedido con Alipay",
            "开启全站文本编辑": "Editar Todo el Texto",
            "保存全站文本修改": "Guardar Cambios de Texto",
            "恢复默认文本": "Restaurar Texto Original",
            "➕ 创建合集 / 队员 / 商品 / 新页面": "➕ Crear Colección / Ciclista / Producto / Página"
        }
    };

    // 2. 读取与保存本地翻译缓存（避免重复请求网络，第二次切换0延迟）
    function getTransCache() {
        try {
            return JSON.parse(localStorage.getItem('yp_auto_trans_cache') || '{"en":{},"es":{}}');
        } catch (e) {
            return { en: {}, es: {} };
        }
    }

    function saveTransCache(cache) {
        try {
            localStorage.setItem('yp_auto_trans_cache', JSON.stringify(cache));
        } catch (e) {}
    }

    // 判断文本是否包含中文字符
    function hasChinese(str) {
        return /[\u4e00-\u9fa5]/.test(str);
    }

    // 3. 调用免费神经网络翻译接口（将任意中文段落自动译为 en 或 es）
    async function fetchCloudTranslation(text, targetLang) {
        const clean = text.trim();
        if (!clean || !hasChinese(clean)) return text;

        // 优先匹配内置专业词典
        if (builtInTranslations[targetLang] && builtInTranslations[targetLang][clean]) {
            return builtInTranslations[targetLang][clean];
        }

        // 其次匹配本地持久化缓存
        const cache = getTransCache();
        if (cache[targetLang] && cache[targetLang][clean]) {
            return cache[targetLang][clean];
        }

        // 调用 Google 免费 GTX 神经网络翻译端点（无需API Key，支持长句和专业自行车词汇）
        try {
            const tl = targetLang === 'es' ? 'es' : 'en';
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data[0]) {
                const translated = data[0].map(item => item[0]).join('');
                // 存入本地缓存
                cache[targetLang][clean] = translated;
                saveTransCache(cache);
                return translated;
            }
        } catch (err) {
            // 备用 MyMemory 免费翻译接口兜底
            try {
                const langPair = targetLang === 'es' ? 'zh-CN|es' : 'zh-CN|en';
                const res2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${langPair}`);
                const data2 = await res2.json();
                if (data2 && data2.responseData && data2.responseData.translatedText) {
                    const translated2 = data2.responseData.translatedText;
                    cache[targetLang][clean] = translated2;
                    saveTransCache(cache);
                    return translated2;
                }
            } catch (e2) {}
        }
        return text;
    }

    // 4. 扫描并自动翻译全站所有文本节点与输入框 Placeholder
    let isTranslating = false;

    async function translateEntireDOM(targetLang) {
        // 搜集全站所有文本节点
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.tagName.toLowerCase();
                    if (['script', 'style', 'noscript', 'textarea'].includes(tag)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (!node.nodeValue || !node.nodeValue.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const textNodes = [];
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            textNodes.push(currentNode);
        }

        // 如果切回中文 ('zh')，直接瞬间还原保存的原始中文
        if (targetLang === 'zh') {
            textNodes.forEach(node => {
                if (node.__origZhText) {
                    node.nodeValue = node.__origZhText;
                }
            });
            document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
                const origPh = el.getAttribute('data-orig-zh-ph');
                if (origPh) el.setAttribute('placeholder', origPh);
            });
            return;
        }

        // 如果切换到英语 ('en') 或西班牙语 ('es')
        // 先记录每个节点的原始中文
        const nodesToTranslate = [];
        textNodes.forEach(node => {
            if (!node.__origZhText && hasChinese(node.nodeValue)) {
                node.__origZhText = node.nodeValue;
            }
            const sourceZh = node.__origZhText || node.nodeValue;
            if (hasChinese(sourceZh)) {
                nodesToTranslate.push({ node, sourceZh });
            }
        });

        // 翻译所有表单的 placeholder 提示词
        document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(async (el) => {
            if (!el.getAttribute('data-orig-zh-ph') && hasChinese(el.getAttribute('placeholder'))) {
                el.setAttribute('data-orig-zh-ph', el.getAttribute('placeholder'));
            }
            const origPh = el.getAttribute('data-orig-zh-ph');
            if (origPh && hasChinese(origPh)) {
                const transPh = await fetchCloudTranslation(origPh, targetLang);
                if (currentLang === targetLang) {
                    el.setAttribute('placeholder', transPh);
                }
            }
        });

        // 先瞬间应用所有已命中缓存/内置词典的节点
        const uncachedList = [];
        const cache = getTransCache();

        nodesToTranslate.forEach(item => {
            const clean = item.sourceZh.trim();
            if (builtInTranslations[targetLang] && builtInTranslations[targetLang][clean]) {
                item.node.nodeValue = item.sourceZh.replace(clean, builtInTranslations[targetLang][clean]);
            } else if (cache[targetLang] && cache[targetLang][clean]) {
                item.node.nodeValue = item.sourceZh.replace(clean, cache[targetLang][clean]);
            } else {
                uncachedList.push(item);
            }
        });

        if (uncachedList.length === 0) return;

        // 对未缓存的新中文内容进行高并发批量翻译（每批8个并发，体验极快）
        if (!isTranslating && typeof showToast === 'function') {
            showToast(targetLang === 'es' ? '🌐 Traduciendo toda la página al español...' : '🌐 Translating entire page to English...');
        }
        isTranslating = true;

        const batchSize = 8;
        for (let i = 0; i < uncachedList.length; i += batchSize) {
            if (currentLang !== targetLang) break; // 若用户中途又切换了语言则中止
            const batch = uncachedList.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async (item) => {
                    const clean = item.sourceZh.trim();
                    const translated = await fetchCloudTranslation(clean, targetLang);
                    if (currentLang === targetLang) {
                        item.node.nodeValue = item.sourceZh.replace(clean, translated);
                    }
                })
            );
        }
        isTranslating = false;
    }

    // 5. 升级并接管全局 setLanguage、switchPage 以及动态渲染函数
    const origSetLanguage = window.setLanguage;
    window.setLanguage = function (lang) {
        if (origSetLanguage) origSetLanguage(lang);
        translateEntireDOM(lang);
    };

    // 当切换子页面、打开详情页或新加商品/队员后，如果在 EN 或 ES 模式下，自动补齐新节点的翻译
    const origSwitchPage = window.switchPage;
    window.switchPage = function (pageId) {
        if (origSwitchPage) origSwitchPage(pageId);
        if (currentLang !== 'zh') {
            setTimeout(() => translateEntireDOM(currentLang), 60);
        }
    };

    const origOpenEntitySubpage = window.openEntitySubpage;
    if (origOpenEntitySubpage) {
        window.openEntitySubpage = function (type, id) {
            origOpenEntitySubpage(type, id);
            if (currentLang !== 'zh') {
                setTimeout(() => translateEntireDOM(currentLang), 60);
            }
        };
    }

    // 使用 MutationObserver 监听页面任何动态变化（比如管理员新增了合集、打开了购物车等），自动实时翻译新增的中文
    window.addEventListener('DOMContentLoaded', () => {
        let debounceTimer = null;
        const observer = new MutationObserver(() => {
            if (currentLang !== 'zh' && !isGlobalTextEditing) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    translateEntireDOM(currentLang);
                }, 180);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
