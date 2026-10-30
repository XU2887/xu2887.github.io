/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 独立升级插件 03 号 (update-03.js)
 * 说明：零断点完整单文件！与 index.html、custom-update.js、update-02.js 完美协同，不改动或影响管理员密码。
 * 核心功能：
 * 1. 【参赛计划全面升级】：支持自由增加/删除/切换赛季（2026赛季、2027赛季...），每个赛季下的赛事采用与队员介绍完全相同的卡片墙、拖动排序、换头图及独立详情页（支持多图上传、5种排版、增补文字模块）
 * 2. 【官方商城全面升级】：
 *    - 支持管理员自由增加、重命名、删除产品类目（Categories）
 *    - 支持在商城首页直接为每件商品上传/更换高清商品头图，支持商品卡片拖动排序与增删
 *    - 商品独立详情页完整支持：本地多图批量上载、5种主体排版与4种相册版式优化、文字直接修改与无限增补自定义图文参数模块
 */

(function () {
    'use strict';

    if (window.__YP_PLUGIN_03_LOADED__) return;
    window.__YP_PLUGIN_03_LOADED__ = true;

    const ADMIN_EMAIL = 'team_youthpower@outlook.com';

    function isAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) { return false; }
    }

    // 复用或回退本地图片高清压缩引擎（确保本地上传商品头图/赛事图/详情页多图100%秒存不爆缓存）
    async function compressImg(file, maxW = 1400, q = 0.82) {
        if (typeof window.compressLocalImage === 'function') {
            return await window.compressLocalImage(file, maxW, q);
        }
        return new Promise(resolve => {
            if (!file || !file.type.startsWith('image/')) { resolve(''); return; }
            const r = new FileReader();
            r.onload = e => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
                    const c = document.createElement('canvas'); c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    try { resolve(c.toDataURL('image/jpeg', q)); } catch (err) { resolve(e.target.result); }
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            r.onerror = () => resolve('');
            r.readAsDataURL(file);
        });
    }

    // 通用拖拽绑定辅助
    function bindDragSort(gridEl, itemSelector, idAttr, onOrderSaved) {
        if (!gridEl || !isAdmin()) return;
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
                if (onOrderSaved) onOrderSaved(newIds);
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

    function getAlbumCount(type, id) {
        try {
            const all = JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}');
            return (all[`${type}_${id}`] || []).length;
        } catch (e) { return 0; }
    }

    // 通用单张头图上传器（用于赛事卡片头图、商城首页商品头图）
    let activeHeaderTarget = null; // { kind: 'race' | 'product', seasonId?: string, id: string }
    const headerFileInput = document.createElement('input');
    headerFileInput.type = 'file';
    headerFileInput.accept = 'image/*';
    headerFileInput.className = 'hidden';
    headerFileInput.onchange = async function (ev) {
        const f = (ev.target.files || [])[0];
        if (!f || !activeHeaderTarget) return;
        const dataUrl = await compressImg(f, 1200, 0.82);
        if (!dataUrl) return;

        if (activeHeaderTarget.kind === 'race') {
            const cal = getCalendarData();
            const season = cal.seasons.find(s => String(s.id) === String(activeHeaderTarget.seasonId));
            const race = season?.races?.find(r => String(r.id) === String(activeHeaderTarget.id));
            if (race) {
                race.photo = dataUrl;
                saveCalendarData(cal);
                window.renderCalendarModule();
                if (typeof showToast === 'function') showToast('✅ 赛事头图已更新并保存！');
            }
        } else if (activeHeaderTarget.kind === 'product') {
            const prods = getShopProductsList();
            const p = prods.find(x => String(x.id) === String(activeHeaderTarget.id));
            if (p) {
                p.imgUrl = dataUrl;
                saveShopProductsList(prods);
                window.renderShopModule();
                if (typeof showToast === 'function') showToast('✅ 商品首页头图已更新并保存！');
            }
        }
        headerFileInput.value = '';
    };
    document.body.appendChild(headerFileInput);

    window.triggerHeaderImageUpload = function (kind, id, seasonId = '') {
        if (!isAdmin()) return;
        activeHeaderTarget = { kind, id, seasonId };
        headerFileInput.click();
    };

    // =========================================================================
    // 一、「参赛计划 (#page-calendar)」：多赛季增删切换 + 赛事卡片墙 + 独立详情页
    // =========================================================================
    const defaultCalendarData = {
        activeSeasonId: 'season_2027',
        cols: 3,
        regionFilter: 'all',
        seasons: [
            {
                id: 'season_2026',
                name: '2026 赛季',
                subtitle: '青训深耕与全国大赛突破赛季 · 为晋升洲际队及输送上海队奠定坚实基础',
                races: [
                    {
                        id: 'race_2026_1',
                        name: '2026 全国公开赛（湖北枝江）',
                        role_zh: '国家级公开赛 · 大中华赛区',
                        region: 'china',
                        ageSpec: '2026赛季 · 湖北枝江 · 大学生组 & 精英组',
                        highlight: '🏆 张浩阳斩获大学生组冠军，并成功入选上海市自行车队',
                        bio: '在2026全国公开赛（湖北枝江）比赛中，青年力量发展车队展现出强大的团队控制力与平路突围能力，主力车手张浩阳一举夺得大学生组冠军，赛后正式进入上海市自行车队集训并入选。',
                        photo: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80'
                    },
                    {
                        id: 'race_2026_2',
                        name: '2026 全国青少年U系列公路自行车锦标赛',
                        role_zh: '国家级U系列锦标赛 · 大中华赛区',
                        region: 'china',
                        ageSpec: '2026赛季 · 甲组 / 乙组 大组赛与个人计时赛(ITT)',
                        highlight: '🎯 延续2023-2025连续三年全国U系列锦标赛夺金传统，全面锻炼新晋青训梯队',
                        bio: '全国U系列公路自行车锦标赛是青年力量车队体教结合体系的核心检验赛场。车队派出多名U18与U16主力新秀出战个人计时赛与大组赛。',
                        photo: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=900&q=80'
                    },
                    {
                        id: 'race_2026_3',
                        name: '2026 西班牙与摩洛哥合作车队外赛拉练',
                        role_zh: '海外合作赛事 · 欧洲与北非赛区',
                        region: 'overseas',
                        ageSpec: '2026赛季 · 西班牙加利西亚 & 摩洛哥',
                        highlight: '🌍 携手 Team Cycling Galicia 与 SIDI ALI Unlock 洲际队积累国际大赛经验',
                        bio: '依托车队自2022年起建立的国际合作网络，选派优秀青年车手与工作团队参与欧洲及北非高水平赛事，为2027洲际队全面运营完成战术与后勤磨合。',
                        photo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80'
                    }
                ]
            },
            {
                id: 'season_2027',
                name: '2027 赛季',
                subtitle: '洲际队元年 · 大中华区(37个比赛日) + 美洲及欧非赛区(33+个比赛日)双线作战',
                races: [
                    {
                        id: 'race_2027_1',
                        name: '环门头沟职业自行车赛',
                        role_zh: 'UCI 2.PRO · 大中华赛区',
                        region: 'china',
                        ageSpec: '2027赛季 · 共 3 个赛段 · 职业系列赛',
                        highlight: '🔥 国内最高级别 UCI 2.PRO 职业环赛之一，争夺总成绩与圆点衫',
                        bio: '环门头沟国际公路自行车赛为 UCI 2.PRO 级别赛事，山路起伏与爬坡赛段极具挑战。车队将派出外籍爬坡主将与中方成熟青训主力联袂出战。',
                        photo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80'
                    },
                    {
                        id: 'race_2027_2',
                        name: '环鄱阳湖职业自行车赛',
                        role_zh: 'UCI 2.1 · 大中华赛区',
                        region: 'china',
                        ageSpec: '2027赛季 · 共 14 个赛段 · 央视与卫视重点报道',
                        highlight: '📺 长达14个赛段的国内顶级多日赛，全方位争夺赛段冠军、圆点衫与最佳青年白衫',
                        bio: '环鄱阳湖国际自行车赛为 UCI 2.1 级长距离多日赛，受 CCTV-5、CCTV-13 及省级卫视跟踪报道。车队7人标准阵容将全力冲击爬坡王圆点衫、大中华最佳及最佳年轻车手白衫。',
                        photo: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=900&q=80'
                    },
                    {
                        id: 'race_2027_3',
                        name: '环上海职业自行车赛 & 跨喜马拉雅极限挑战赛',
                        role_zh: 'UCI 2.1 · 大中华赛区',
                        region: 'china',
                        ageSpec: '2027赛季 · 环上海(3个赛段) + 跨喜马拉雅(5个赛段)',
                        highlight: '🚴 涵盖平路高速集团冲刺与高原极限爬坡的 UCI 2.1 核心赛事组合',
                        bio: '作为上海市自行车队官方储备人才基地，环上海新城自行车赛（UCI 2.1，3个赛段）是车队的主场重点赛事；跨喜马拉雅国际自行车极限挑战赛（UCI 2.1，5个赛段）则充分展现高原爬坡实力。',
                        photo: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80'
                    },
                    {
                        id: 'race_2027_4',
                        name: '中国自行车全国锦标赛 & 中国职业自行车联赛',
                        role_zh: '国家级锦标赛与联赛 · 大中华赛区',
                        region: 'china',
                        ageSpec: '2027赛季 · 全锦赛(4个比赛日) + 职业联赛(2~5站) + 中自联(1~3站)',
                        highlight: '🏅 全力争取全国锦标赛及全运会积分，同时出战环广州、成都天府绿道、环榆林及东营UCI 1.2赛',
                        bio: '中方队员对参与全国锦标赛（男子公路U23/精英大组及ITT，预计上场6人次）及全运会抱有热切希望，车队将高频次参与中国职业联赛与中国自行车联赛以赢取积分。',
                        photo: ''
                    },
                    {
                        id: 'race_2027_5',
                        name: '环哥伦比亚职业赛 (UCI 2.PRO) & 环哥伦比亚 (UCI 2.2)',
                        role_zh: 'UCI 2.PRO / 2.2 · 美洲赛区',
                        region: 'overseas',
                        ageSpec: '2027赛季 · 共 14个赛段(2.PRO) + 7个赛段(2.2) + 麦德林等6~7场古典赛(1.2)',
                        highlight: '🌎 副队长 Vladimir López 全权坐镇美洲大本营，哥伦比亚国家电视台与RCN全国直播',
                        bio: '南美大本营核心赛事！由车队体育主管助理兼副队长 Vladimir López 全权负责，带领哥伦比亚籍与中方队员征战环哥伦比亚及麦德林经典赛等 30+ 个高强度比赛日。',
                        photo: ''
                    },
                    {
                        id: 'race_2027_6',
                        name: '西班牙环阿斯图里亚斯 (Vuelta a Asturias) & Gravel 世锦赛',
                        role_zh: 'UCI 欧洲巡回赛 & 世锦赛 · 海外赛区',
                        region: 'overseas',
                        ageSpec: '2027-2029赛季 · 西班牙 / 哥伦比亚 / 墨西哥 / 摩洛哥 / 塞尔维亚',
                        highlight: '🏆 确保出战欧洲 Vuelta a Asturias (Eurosport转播) 及 UCI Gravel 世界杯与世锦赛',
                        bio: '欧洲赛场确保参加西班牙环阿斯图里亚斯（Vuelta a Asturias），并在2027-2029年拓展环摩洛哥、环阿尔巴尼亚、环塞尔维亚；同时代表哥伦比亚国家队出战 UCI Gravel 世锦赛及世界杯分站。',
                        photo: ''
                    }
                ]
            }
        ]
    };

    function getCalendarData() {
        try {
            const saved = localStorage.getItem('yp_calendar_seasons_v6');
            return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultCalendarData));
        } catch (e) {
            return JSON.parse(JSON.stringify(defaultCalendarData));
        }
    }

    function saveCalendarData(data) {
        localStorage.setItem('yp_calendar_seasons_v6', JSON.stringify(data));
    }

    window.selectCalendarSeason = function (seasonId) {
        const cal = getCalendarData();
        cal.activeSeasonId = seasonId;
        saveCalendarData(cal);
        window.renderCalendarModule();
    };

    window.filterCalendarRegion = function (region) {
        const cal = getCalendarData();
        cal.regionFilter = region;
        saveCalendarData(cal);
        window.renderCalendarModule();
    };

    window.setCalendarCols = function (cols) {
        const cal = getCalendarData();
        cal.cols = Number(cols);
        saveCalendarData(cal);
        window.renderCalendarModule();
    };

    // 新增赛季（如2026赛季、2028赛季）
    window.addCalendarSeasonPrompt = function () {
        if (!isAdmin()) return;
        const name = prompt('请输入新赛季名称（例如：2028 赛季 或 2025 赛季）：', '2028 赛季');
        if (!name || !name.trim()) return;
        const subtitle = prompt('请输入该赛季的整体规划或简介说明：', `${name.trim()} 国内外双线参赛计划与重点赛事日历`) || '';
        const cal = getCalendarData();
        const newId = 'season_' + Date.now();
        cal.seasons.push({
            id: newId,
            name: name.trim(),
            subtitle: subtitle.trim(),
            races: []
        });
        cal.activeSeasonId = newId;
        saveCalendarData(cal);
        window.renderCalendarModule();
        if (typeof showToast === 'function') showToast(`✅ 已成功创建新赛季：${name.trim()}！`);
    };

    window.editCurrentSeasonMetaPrompt = function () {
        if (!isAdmin()) return;
        const cal = getCalendarData();
        const cur = cal.seasons.find(s => s.id === cal.activeSeasonId) || cal.seasons[0];
        if (!cur) return;
        const n = prompt('修改当前赛季名称：', cur.name);
        if (n && n.trim()) cur.name = n.trim();
        const sub = prompt('修改当前赛季总览副标题：', cur.subtitle || '');
        if (sub !== null) cur.subtitle = sub.trim();
        saveCalendarData(cal);
        window.renderCalendarModule();
    };

    window.deleteCurrentSeasonPrompt = function () {
        if (!isAdmin()) return;
        const cal = getCalendarData();
        if (cal.seasons.length <= 1) {
            if (typeof showToast === 'function') showToast('⚠️ 至少需要保留一个赛季！');
            return;
        }
        const cur = cal.seasons.find(s => s.id === cal.activeSeasonId);
        if (!cur || !confirm(`确定要删除整个「${cur.name}」及其包含的所有赛事卡片吗？`)) return;
        cal.seasons = cal.seasons.filter(s => s.id !== cal.activeSeasonId);
        cal.activeSeasonId = cal.seasons[0].id;
        saveCalendarData(cal);
        window.renderCalendarModule();
        if (typeof showToast === 'function') showToast(`🗑️ 已删除赛季：${cur.name}`);
    };

    window.moveRaceCard = function (raceId, dir) {
        if (!isAdmin()) return;
        const cal = getCalendarData();
        const season = cal.seasons.find(s => s.id === cal.activeSeasonId);
        if (!season || !season.races) return;
        const i = season.races.findIndex(r => String(r.id) === String(raceId));
        if (i === -1 || i + dir < 0 || i + dir >= season.races.length) return;
        const tmp = season.races[i];
        season.races[i] = season.races[i + dir];
        season.races[i + dir] = tmp;
        saveCalendarData(cal);
        window.renderCalendarModule();
    };

    window.deleteRaceCard = function (raceId) {
        if (!isAdmin() || !confirm('确定从当前赛季中删除这场赛事吗？')) return;
        const cal = getCalendarData();
        const season = cal.seasons.find(s => s.id === cal.activeSeasonId);
        if (!season || !season.races) return;
        season.races = season.races.filter(r => String(r.id) !== String(raceId));
        saveCalendarData(cal);
        window.renderCalendarModule();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该场赛事');
    };

    window.renderCalendarModule = function () {
        const calPage = document.getElementById('page-calendar');
        if (!calPage) return;

        calPage.className = 'page-section py-14 bg-gray-900 text-white min-h-[85vh]';
        if (document.querySelector('.nav-btn.text-yp-darkGreen')?.getAttribute('data-target') === 'calendar') {
            calPage.classList.add('active');
        }

        if (typeof window.renderPageBgController === 'function') {
            window.renderPageBgController('calendar', calPage, '参赛计划界面');
        }

        const cal = getCalendarData();
        const isAdm = isAdmin();
        if (!cal.seasons.some(s => s.id === cal.activeSeasonId) && cal.seasons.length > 0) {
            cal.activeSeasonId = cal.seasons[0].id;
        }
        const curSeason = cal.seasons.find(s => s.id === cal.activeSeasonId) || { id: 'default', name: '2027 赛季', subtitle: '', races: [] };
        const cols = cal.cols || 3;
        const regFilter = cal.regionFilter || 'all';
        const racesList = (curSeason.races || []).filter(r => regFilter === 'all' ? true : r.region === regFilter);

        let innerBox = document.getElementById('yp-calendar-inner-box');
        if (!innerBox) {
            Array.from(calPage.children).forEach(ch => {
                if (!ch.id.startsWith('yp-bg-ctrl-')) ch.remove();
            });
            innerBox = document.createElement('div');
            innerBox.id = 'yp-calendar-inner-box';
            innerBox.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
            calPage.appendChild(innerBox);
        }

        innerBox.innerHTML = `
            <!-- 顶部标题与多赛季切换标签栏 -->
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div>
                    <span class="text-yp-lime font-black tracking-widest text-sm uppercase">MULTI-SEASON RACING CALENDAR</span>
                    <h2 class="text-3xl sm:text-4xl font-black mt-1">${curSeason.name} · 车队参赛计划</h2>
                    <p class="text-gray-400 text-sm mt-1">${curSeason.subtitle || '点击下方任意赛事卡片可进入其专属赛事详情主页。'}</p>
                </div>

                <!-- 赛区过滤按钮 -->
                <div class="flex flex-wrap gap-2 text-xs font-bold" data-no-edit="true">
                    <button onclick="filterCalendarRegion('all')" class="px-3.5 py-2 rounded-xl transition ${regFilter === 'all' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">全部赛事 (${(curSeason.races || []).length})</button>
                    <button onclick="filterCalendarRegion('china')" class="px-3.5 py-2 rounded-xl transition ${regFilter === 'china' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">🇨🇳 大中华赛区</button>
                    <button onclick="filterCalendarRegion('overseas')" class="px-3.5 py-2 rounded-xl transition ${regFilter === 'overseas' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">🌎 美洲/欧洲/北非赛区</button>
                </div>
            </div>

            <!-- 赛季选择切换栏（支持2026赛季、2027赛季及管理员自由增加/删除赛季） -->
            <div class="mb-8 p-3.5 rounded-2xl bg-gray-800/90 border border-gray-700 flex flex-wrap items-center justify-between gap-3" data-no-edit="true">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-black text-gray-400 px-2"><i class="fa-regular fa-calendar-check text-yp-lime mr-1.5"></i>选择赛季：</span>
                    ${cal.seasons.map(s => `
                        <button onclick="selectCalendarSeason('${s.id}')" class="px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${s.id === curSeason.id ? 'bg-yp-lime text-gray-900 shadow-lg scale-105' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'}">
                            <span>${s.name}</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${s.id === curSeason.id ? 'bg-gray-900 text-yp-lime' : 'bg-gray-800 text-gray-400'}">${(s.races || []).length}场</span>
                        </button>
                    `).join('')}
                </div>

                ${isAdm ? `
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <button onclick="addCalendarSeasonPrompt()" class="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1">
                            <i class="fa-solid fa-plus"></i><span>新增赛季 (如2028)</span>
                        </button>
                        <button onclick="editCurrentSeasonMetaPrompt()" class="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-yp-lime font-bold rounded-xl border border-gray-600">
                            ✏️ 改赛季标题
                        </button>
                        <button onclick="deleteCurrentSeasonPrompt()" class="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl border border-red-500/30">
                            🗑️ 删除当前赛季
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- 管理员赛事卡片管理顶栏（与队员介绍操作逻辑100%一致） -->
            ${isAdm ? `
                <div data-no-edit="true" class="mb-7 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div class="flex flex-wrap items-center gap-3">
                        <button onclick="openAddRaceModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                            <i class="fa-solid fa-flag-checkered"></i><span>➕ 添加「${curSeason.name}」新赛事</span>
                        </button>
                        <span class="text-yp-lime font-bold">✥ 像编辑队员简介一样：按住任意赛事卡片可【拖动排序】，点「📷 换头图」上传海报，点下方按钮进入【赛事独立详情页】！</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-300 font-bold">每行赛事数：</span>
                        <button onclick="setCalendarCols(2)" class="px-3 py-1.5 rounded-lg ${cols == 2 ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">2列</button>
                        <button onclick="setCalendarCols(3)" class="px-3 py-1.5 rounded-lg ${cols == 3 ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">3列</button>
                        <button onclick="setCalendarCols(4)" class="px-3 py-1.5 rounded-lg ${cols == 4 ? 'bg-yp-green text-white font-black' : 'bg-gray-900 text-gray-300'}">4列</button>
                    </div>
                </div>
            ` : ''}

            <!-- 赛事卡片网格 -->
            ${racesList.length === 0 ? `
                <div class="text-center py-16 bg-gray-800/60 rounded-3xl border border-dashed border-gray-700 text-gray-400 text-sm">
                    当前赛季（${curSeason.name}）在此分类下暂无赛事卡片。${isAdm ? '请点击上方黄色按钮「➕ 添加新赛事」！' : ''}
                </div>
            ` : `
                <div id="calendar-races-sortable-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7">
                    ${racesList.map(rc => {
                        const albumCnt = getAlbumCount('race', rc.id);
                        return `
                            <div class="bg-gray-800/95 backdrop-blur-xs rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-racecard-id="${rc.id}">
                                <div>
                                    <div onclick="openEntitySubpage('race', '${rc.id}')" class="relative h-60 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                                        ${rc.photo ? `<img src="${rc.photo}" alt="${rc.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `
                                            <div class="text-center p-6">
                                                <div class="w-14 h-14 rounded-full bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2 text-yp-lime">
                                                    <i class="fa-solid fa-flag-checkered text-2xl"></i>
                                                </div>
                                                <span class="text-xs text-gray-400 font-bold block">${rc.name}</span>
                                                <span class="text-[11px] text-gray-500 mt-0.5 block">点击查看详情或上传赛事海报头图</span>
                                            </div>
                                        `}
                                        <span class="absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${rc.role_zh || 'UCI / 官方赛事'}</span>
                                        <span class="absolute top-3 right-3 px-2 py-0.5 bg-yp-darkGreen text-white text-[10px] font-black rounded">${curSeason.name}</span>
                                        ${isAdm ? `
                                            <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                                <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                                <button onclick="moveRaceCard('${rc.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">◀</button>
                                                <button onclick="moveRaceCard('${rc.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded">▶</button>
                                            </div>
                                            <button onclick="event.stopPropagation();triggerHeaderImageUpload('race', '${rc.id}', '${curSeason.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red hover:bg-red-700 text-white text-[11px] font-black rounded-lg shadow">📷 换头图</button>
                                        ` : ''}
                                    </div>
                                    <div class="p-6">
                                        <div class="text-xs text-gray-400 mb-1">${rc.ageSpec || ''}</div>
                                        <h3 onclick="openEntitySubpage('race', '${rc.id}')" class="text-xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${rc.name}</h3>
                                        <div class="p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${rc.highlight || ''}</div>
                                        <div class="text-xs text-gray-300 leading-relaxed space-y-1.5 line-clamp-3">${rc.bio || ''}</div>
                                    </div>
                                </div>
                                <div data-no-edit="true" class="p-4 bg-gray-900/90 border-t border-gray-700 flex items-center justify-between gap-2">
                                    <button onclick="openEntitySubpage('race', '${rc.id}')" class="flex-1 py-2.5 px-4 bg-gradient-to-r from-yp-darkGreen to-yp-green hover:opacity-95 text-white text-xs font-black rounded-xl shadow flex items-center justify-center space-x-1.5">
                                        <i class="fa-solid fa-trophy"></i><span>🏁 进入赛事独立详情页 (${albumCnt}图)</span><i class="fa-solid fa-arrow-right"></i>
                                    </button>
                                    ${isAdm ? `<button onclick="deleteRaceCard('${rc.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        `;

        bindDragSort(document.getElementById('calendar-races-sortable-grid'), '[data-racecard-id]', 'data-racecard-id', (newIds) => {
            const c = getCalendarData();
            const s = c.seasons.find(x => x.id === c.activeSeasonId);
            if (!s || !s.races) return;
            // 若在全部视图下拖拽则完整重排
            const ordered = newIds.map(id => s.races.find(r => String(r.id) === String(id))).filter(Boolean);
            const rest = s.races.filter(r => !newIds.includes(String(r.id)));
            s.races = [...ordered, ...rest];
            saveCalendarData(c);
            if (typeof showToast === 'function') showToast('✅ 赛事排列顺序已保存！');
        });
    };

    window.openAddRaceModal = function () {
        let m = document.getElementById('yp-add-race-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-add-race-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            m.innerHTML = `
                <div onclick="document.getElementById('yp-add-race-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
                <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                    <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                        <h3 class="text-lg font-black text-yp-lime">➕ 添加新赛事卡片</h3>
                        <button onclick="document.getElementById('yp-add-race-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitAddRaceCard(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">赛事名称 *</label><input type="text" id="arc-name" required placeholder="如：环鄱阳湖职业自行车赛" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">赛事级别/标签 *</label><input type="text" id="arc-role" required placeholder="如：UCI 2.1 · 大中华赛区" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold mb-1">所属赛区 *</label>
                                <select id="arc-region" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white font-bold">
                                    <option value="china">🇨🇳 大中华赛区</option>
                                    <option value="overseas">🌎 美洲/欧洲/北非海外赛区</option>
                                </select>
                            </div>
                            <div><label class="block font-bold mb-1">赛段数/时间地点 *</label><input type="text" id="arc-age" required placeholder="如：共14个赛段 · 预计比赛日14天" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">赛事核心目标/看点 *</label><input type="text" id="arc-high" required placeholder="如：争夺圆点衫与最佳年轻车手白衫" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold mb-1">上传赛事海报/头图（可选，自动高清压缩）</label><input type="file" id="arc-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold mb-1">赛事详细介绍与参赛规划 *</label><textarea id="arc-bio" required rows="3" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 保存赛事并生成独立详情页</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitAddRaceCard = async function (e) {
        e.preventDefault();
        const name = document.getElementById('arc-name').value.trim();
        const role_zh = document.getElementById('arc-role').value.trim();
        const region = document.getElementById('arc-region').value;
        const ageSpec = document.getElementById('arc-age').value.trim();
        const highlight = document.getElementById('arc-high').value.trim();
        const bio = document.getElementById('arc-bio').value.trim();
        const file = document.getElementById('arc-file').files[0];
        const photo = file ? await compressImg(file, 1200, 0.82) : '';

        const cal = getCalendarData();
        const curSeason = cal.seasons.find(s => s.id === cal.activeSeasonId) || cal.seasons[0];
        if (!curSeason) return;
        curSeason.races = curSeason.races || [];
        curSeason.races.push({
            id: 'race_' + Date.now(),
            name, role_zh, region, ageSpec, highlight, bio, photo
        });
        saveCalendarData(cal);
        window.renderCalendarModule();
        e.target.reset();
        document.getElementById('yp-add-race-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 已添加赛事：${name}`);
    };

    // =========================================================================
    // 二、「官方商城 (#page-shop)」：自由增减产品类目 + 首页商品头图 + 像队员简介一样编辑商品与详情页
    // =========================================================================
    const defaultShopCategories = [
        { id: 'spect', name: '空力公式 (Spect)' },
        { id: 'elves', name: '精灵 (ELVES)' },
        { id: 'helmet', name: 'ESSEN赫拉头盔' },
        { id: 'pedal', name: '卓锐ZP115锁踏' }
    ];

    function getShopCategories() {
        try {
            const saved = localStorage.getItem('yp_shop_categories_v6');
            return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultShopCategories));
        } catch (e) {
            return JSON.parse(JSON.stringify(defaultShopCategories));
        }
    }

    function saveShopCategories(cats) {
        localStorage.setItem('yp_shop_categories_v6', JSON.stringify(cats));
    }

    function getShopProductsList() {
        try {
            const saved = localStorage.getItem('yp_shop_full_products_v6');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof products !== 'undefined' && Array.isArray(products)) {
                    products.length = 0;
                    parsed.forEach(p => products.push(p));
                }
                return parsed;
            }
        } catch (e) {}

        // 首次初始化：同步全局 products 数组
        const initList = (typeof products !== 'undefined' && Array.isArray(products)) ? [...products] : [];
        localStorage.setItem('yp_shop_full_products_v6', JSON.stringify(initList));
        return initList;
    }

    function saveShopProductsList(list) {
        localStorage.setItem('yp_shop_full_products_v6', JSON.stringify(list));
        if (typeof products !== 'undefined' && Array.isArray(products)) {
            products.length = 0;
            list.forEach(p => products.push(p));
        }
    }

    let currentShopCatFilter = 'all';

    window.selectShopCategory = function (catId) {
        currentShopCatFilter = catId;
        window.renderShopModule();
    };

    window.setShopGridColsV6 = function (cols) {
        localStorage.setItem('yp_shop_cols_v6', String(cols));
        window.renderShopModule();
    };

    // 自由新增产品类目
    window.addShopCategoryPrompt = function () {
        if (!isAdmin()) return;
        const name = prompt('请输入新增的产品类目名称（例如：静藤轮组 / NZSE骑行服 / 整车定制）：');
        if (!name || !name.trim()) return;
        const cats = getShopCategories();
        const newId = 'cat_' + Date.now();
        cats.push({ id: newId, name: name.trim() });
        saveShopCategories(cats);
        currentShopCatFilter = newId;
        window.renderShopModule();
        if (typeof showToast === 'function') showToast(`✅ 已新增产品类目：${name.trim()}`);
    };

    // 修改产品类目名称
    window.renameShopCategoryPrompt = function (catId) {
        if (!isAdmin()) return;
        const cats = getShopCategories();
        const item = cats.find(c => c.id === catId);
        if (!item) return;
        const nextName = prompt('修改该产品类目的名称：', item.name);
        if (nextName && nextName.trim()) {
            item.name = nextName.trim();
            saveShopCategories(cats);
            window.renderShopModule();
            if (typeof showToast === 'function') showToast('✅ 类目名称已更新！');
        }
    };

    // 删除产品类目
    window.deleteShopCategoryPrompt = function (catId) {
        if (!isAdmin()) return;
        const cats = getShopCategories();
        const item = cats.find(c => c.id === catId);
        if (!item || !confirm(`确定删除产品类目「${item.name}」吗？（该类目下的商品仍会保留在“全部器材”中）`)) return;
        saveShopCategories(cats.filter(c => c.id !== catId));
        if (currentShopCatFilter === catId) currentShopCatFilter = 'all';
        window.renderShopModule();
        if (typeof showToast === 'function') showToast(`🗑️ 已删除产品类目：${item.name}`);
    };

    window.moveShopProductCard = function (prodId, dir) {
        if (!isAdmin()) return;
        const list = getShopProductsList();
        const i = list.findIndex(p => String(p.id) === String(prodId));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveShopProductsList(list);
        window.renderShopModule();
    };

    window.deleteShopProductCard = function (prodId) {
        if (!isAdmin() || !confirm('确定从官方商城中删除该商品吗？')) return;
        const list = getShopProductsList().filter(p => String(p.id) !== String(prodId));
        saveShopProductsList(list);
        window.renderShopModule();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该商品');
    };

    window.renderShopModule = function () {
        const shopPage = document.getElementById('page-shop');
        if (!shopPage) return;

        if (typeof window.renderPageBgController === 'function') {
            window.renderPageBgController('shop', shopPage, '官方商城界面');
        }

        const isAdm = isAdmin();
        const cats = getShopCategories();
        const allProds = getShopProductsList();
        const cols = localStorage.getItem('yp_shop_cols_v6') || '4';

        // 替换原商城顶部的静态分类按钮栏为动态可增删类目栏
        const oldTabContainer = shopPage.querySelector('.shop-tab')?.parentElement;
        if (oldTabContainer) {
            oldTabContainer.className = 'flex flex-wrap items-center gap-2 mt-4 md:mt-0';
            oldTabContainer.innerHTML = `
                <button onclick="selectShopCategory('all')" class="px-3.5 py-2 rounded-xl text-xs font-black transition ${currentShopCatFilter === 'all' ? 'bg-yp-darkGreen text-white shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}">
                    全部器材 (${allProds.length})
                </button>
                ${cats.map(c => {
                    const cnt = allProds.filter(p => p.category === c.id).length;
                    const active = currentShopCatFilter === c.id;
                    return `
                        <div class="inline-flex items-center rounded-xl overflow-hidden border ${active ? 'border-yp-darkGreen bg-yp-darkGreen text-white shadow' : 'border-gray-200 bg-white text-gray-700'}">
                            <button onclick="selectShopCategory('${c.id}')" class="px-3.5 py-2 text-xs font-bold hover:opacity-90 transition">
                                ${c.name} (${cnt})
                            </button>
                            ${isAdm ? `
                                <button onclick="renameShopCategoryPrompt('${c.id}')" class="px-1.5 py-2 text-[10px] ${active ? 'text-amber-300 hover:bg-black/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}" title="重命名此类目">✏️</button>
                                <button onclick="deleteShopCategoryPrompt('${c.id}')" class="px-2 py-2 text-[10px] ${active ? 'text-red-200 hover:bg-black/20' : 'text-red-500 hover:bg-red-50 bg-gray-50'}" title="删除此类目">✕</button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
                ${isAdm ? `
                    <button onclick="addShopCategoryPrompt()" class="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 text-xs font-black shadow flex items-center space-x-1 transition">
                        <i class="fa-solid fa-folder-plus"></i><span>➕ 新增产品类目</span>
                    </button>
                ` : ''}
            `;
        }

        const grid = document.getElementById('product-grid');
        if (!grid) return;

        // 管理员商城顶栏（与队员介绍操作逻辑100%一致）
        let shopAdminBar = document.getElementById('yp-shop-v6-admin-bar');
        if (!isAdm) {
            if (shopAdminBar) shopAdminBar.remove();
        } else {
            if (!shopAdminBar) {
                shopAdminBar = document.createElement('div');
                shopAdminBar.id = 'yp-shop-v6-admin-bar';
                shopAdminBar.setAttribute('data-no-edit', 'true');
                shopAdminBar.className = 'mb-7 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs';
                grid.parentNode.insertBefore(shopAdminBar, grid);
            }
            shopAdminBar.innerHTML = `
                <div class="flex flex-wrap items-center gap-3">
                    <button onclick="openAddShopProductModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                        <i class="fa-solid fa-cart-plus"></i><span>➕ 上架新商品 (可选类目与上传头图)</span>
                    </button>
                    <span class="text-yp-lime font-bold">✥ 像编辑队员简介一样：在每张商品卡上点「📷 添加/更换头图」设置商品封面，按住卡片可【拖动排序】，点下方进入【商品独立详情页】！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行商品数：</span>
                    <button onclick="setShopGridColsV6(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">2列大图</button>
                    <button onclick="setShopGridColsV6(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">3列标准</button>
                    <button onclick="setShopGridColsV6(4)" class="px-3 py-1.5 rounded-lg ${cols == '4' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">4列紧凑</button>
                </div>
            `;
        }

        const filteredList = currentShopCatFilter === 'all' ? allProds : allProds.filter(p => p.category === currentShopCatFilter);
        grid.className = `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-6`;

        grid.innerHTML = filteredList.map(p => {
            const albumCnt = getAlbumCount('product', p.id);
            const albumArr = (JSON.parse(localStorage.getItem('yp_entity_albums_v4') || '{}')[`product_${p.id}`]) || [];
            const headerImg = p.imgUrl || (albumArr[0]?.url || '');

            return `
                <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-yp-green transition flex flex-col justify-between group relative" data-prodcard-id="${p.id}">
                    <div>
                        <!-- 商品首页头图区域（支持一键上传/更换头图，点击进入商品详情页） -->
                        <div onclick="openEntitySubpage('product', '${p.id}')" class="h-52 bg-gradient-to-br from-gray-900 via-gray-800 to-yp-darkGreen relative flex items-center justify-center overflow-hidden cursor-pointer">
                            ${headerImg ? `
                                <img src="${headerImg}" alt="${p.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                            ` : `
                                <div class="text-center p-4">
                                    <i class="fa-solid ${p.icon || 'fa-bicycle'} text-5xl text-white/85 mb-2 block"></i>
                                    <span class="text-[11px] text-gray-300">点击进入商品详情页</span>
                                </div>
                            `}
                            <span class="absolute top-3 left-3 px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[11px] font-black rounded shadow">${p.badge || '官方正品'}</span>
                            <span class="absolute top-3 right-3 px-2 py-0.5 bg-gray-900/80 text-[11px] text-gray-200 font-bold rounded">${p.brand}</span>

                            ${isAdm ? `
                                <div data-no-edit="true" onclick="event.stopPropagation()" class="absolute bottom-2.5 left-2.5 flex items-center space-x-1">
                                    <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab">✥ 拖动</span>
                                    <button onclick="moveShopProductCard('${p.id}', -1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">◀</button>
                                    <button onclick="moveShopProductCard('${p.id}', 1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">▶</button>
                                </div>
                                <button onclick="event.stopPropagation();triggerHeaderImageUpload('product', '${p.id}')" data-no-edit="true" class="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-yp-red hover:bg-red-700 text-white text-[10px] font-black rounded-lg shadow flex items-center space-x-1">
                                    <i class="fa-solid fa-camera"></i><span>添加/换头图</span>
                                </button>
                            ` : ''}
                        </div>

                        <div class="p-4">
                            <h3 onclick="openEntitySubpage('product', '${p.id}')" class="font-black text-gray-900 hover:text-yp-darkGreen cursor-pointer text-base leading-snug mb-1.5">${p.name}</h3>
                            <p class="text-xs text-gray-500 leading-relaxed line-clamp-2">${p.desc || ''}</p>
                        </div>
                    </div>

                    <div class="px-4 pb-4 pt-3 border-t border-gray-100 space-y-2.5" data-no-edit="true">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="text-[10px] text-gray-400 block">官方同步售价</span>
                                <div class="text-xl font-black text-yp-darkGreen">¥${p.price}</div>
                            </div>
                            <button onclick="addToCart(${p.id})" class="px-3.5 py-2 bg-gray-900 hover:bg-yp-alipay text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shadow">
                                <i class="fa-solid fa-cart-plus"></i><span>加入购物车</span>
                            </button>
                        </div>
                        <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100">
                            <button onclick="openEntitySubpage('product', '${p.id}')" class="flex-1 py-2 px-3 bg-green-50 hover:bg-yp-darkGreen text-yp-darkGreen hover:text-white text-xs font-black rounded-xl transition flex items-center justify-center space-x-1">
                                <i class="fa-regular fa-images"></i><span>🛍️ 商品详情页与多图排版 (${albumCnt}图)</span>
                            </button>
                            ${isAdm ? `
                                <button onclick="deleteShopProductCard('${p.id}')" class="px-2.5 py-2 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold rounded-xl transition" title="删除此商品">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        bindDragSort(grid, '[data-prodcard-id]', 'data-prodcard-id', (newIds) => {
            const all = getShopProductsList();
            const ordered = newIds.map(id => all.find(p => String(p.id) === String(id))).filter(Boolean);
            const rest = all.filter(p => !newIds.includes(String(p.id)));
            saveShopProductsList([...ordered, ...rest]);
            if (typeof showToast === 'function') showToast('✅ 商城商品排序已保存！');
        });
    };

    // 上架新商品弹窗（支持动态类目选择 + 直接上传首页商品头图）
    window.openAddShopProductModal = function () {
        let m = document.getElementById('yp-add-shop-prod-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-add-shop-prod-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            document.body.appendChild(m);
        }
        const cats = getShopCategories();
        m.innerHTML = `
            <div onclick="document.getElementById('yp-add-shop-prod-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
            <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                    <h3 class="text-lg font-black text-yp-lime">➕ 上架新商城商品 (支持上传头图与生成详情页)</h3>
                    <button onclick="document.getElementById('yp-add-shop-prod-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <form onsubmit="submitAddShopProduct(event)" class="p-6 space-y-3.5 text-xs">
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block font-bold mb-1">所属产品类目 *</label>
                            <select id="aspd-cat" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white font-bold">
                                ${cats.map(c => `<option value="${c.id}" ${currentShopCatFilter === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div><label class="block font-bold mb-1">品牌名称 *</label><input type="text" id="aspd-brand" required placeholder="如：空力公式 / 静藤" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold mb-1">售价 (元) *</label><input type="number" id="aspd-price" required placeholder="如：3999" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-2"><label class="block font-bold mb-1">商品完整名称 *</label><input type="text" id="aspd-name" required placeholder="如：静藤 50mm 碳纤维真空胎公路轮组" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        <div><label class="block font-bold mb-1">角标标签</label><input type="text" id="aspd-badge" value="淘宝官方同价" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                    </div>
                    <div>
                        <label class="block font-bold mb-1 text-yp-lime">📷 上传商城首页商品头图（自动高清压缩，也可进入详情页上传更多细节图）</label>
                        <input type="file" id="aspd-file" accept="image/*" class="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-yp-green file:text-white font-bold">
                    </div>
                    <div><label class="block font-bold mb-1">商品规格与详情介绍 *</label><textarea id="aspd-desc" required rows="3" placeholder="输入商品核心卖点、尺码规格说明（进入商品详情页后还可无限增补参数模块）..." class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
                    <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 立即上架商品并生成独立详情页</button>
                </form>
            </div>
        `;
        m.classList.remove('hidden');
    };

    window.submitAddShopProduct = async function (e) {
        e.preventDefault();
        const category = document.getElementById('aspd-cat').value;
        const brand = document.getElementById('aspd-brand').value.trim();
        const price = parseInt(document.getElementById('aspd-price').value, 10) || 0;
        const name = document.getElementById('aspd-name').value.trim();
        const badge = document.getElementById('aspd-badge').value.trim() || '官方正品';
        const desc = document.getElementById('aspd-desc').value.trim();
        const file = document.getElementById('aspd-file').files[0];
        const imgUrl = file ? await compressImg(file, 1200, 0.82) : '';

        const list = getShopProductsList();
        list.unshift({
            id: Date.now(),
            category, brand, price, name, badge, desc,
            imgUrl, icon: 'fa-bicycle'
        });
        saveShopProductsList(list);
        window.renderShopModule();
        e.target.reset();
        document.getElementById('yp-add-shop-prod-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 新商品「${name}」已上架！`);
    };

    // =========================================================================
    // 三、扩展独立详情页引擎 (openEntitySubpage / saveSubEdit / setSubMainCover)
    //     使「赛事 (race)」与「商城商品 (product)」拥有与队员简介100%相同的多图上载、5种排版优化、文字增补能力
    // =========================================================================
    function findRaceById(raceId) {
        const cal = getCalendarData();
        for (const s of cal.seasons) {
            const found = (s.races || []).find(r => String(r.id) === String(raceId));
            if (found) return { cal, season: s, race: found };
        }
        return null;
    }

    const prevOpenSubpage = window.openEntitySubpage;
    window.openEntitySubpage = function (type, id) {
        if (type === 'race') {
            const hit = findRaceById(id);
            if (!hit) return;
            const { season, race } = hit;
            const rosterList = typeof getSavedRosterData === 'function' ? getSavedRosterData() : [];
            const exists = rosterList.some(r => String(r.id) === String(id));
            if (!exists) {
                rosterList.push({ ...race, flag: '🏁' });
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(rosterList));
            }
            if (prevOpenSubpage) prevOpenSubpage('rider', id);
            if (!exists) {
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(rosterList.filter(r => String(r.id) !== String(id))));
            }
            const backBtn = document.querySelector('#subdetail-content button[onclick*="switchPage"]');
            if (backBtn) {
                backBtn.setAttribute('onclick', "switchPage('calendar')");
                backBtn.innerHTML = `<i class="fa-solid fa-arrow-left mr-1.5"></i>返回「${season.name}」参赛计划列表`;
            }
            document.querySelectorAll('#subdetail-content [onclick*="\'rider\'"]').forEach(el => {
                el.setAttribute('onclick', el.getAttribute('onclick').replace(/'rider'/g, "'race'"));
            });
            document.querySelectorAll('#subdetail-content [onchange*="\'rider\'"]').forEach(el => {
                el.setAttribute('onchange', el.getAttribute('onchange').replace(/'rider'/g, "'race'"));
            });
            return;
        }

        // 对于商品 (product)，确保详情页编辑后能直接修改商品名称、品牌、售价、卖点、描述及新增参数模块
        if (prevOpenSubpage) prevOpenSubpage(type, id);
    };

    const prevSaveSubEdit = window.saveSubEdit;
    window.saveSubEdit = function (t, id) {
        if (t === 'race') {
            const hit = findRaceById(id);
            if (hit) {
                const { cal, race } = hit;
                race.role_zh = document.getElementById('sub-edit-role')?.innerHTML.trim() || race.role_zh;
                race.name = document.getElementById('sub-edit-title')?.innerHTML.trim() || race.name;
                race.ageSpec = document.getElementById('sub-edit-sub')?.innerHTML.trim() || race.ageSpec;
                race.highlight = document.getElementById('sub-edit-high')?.innerHTML.trim() || race.highlight;
                race.bio = document.getElementById('sub-edit-bio')?.innerHTML.trim() || race.bio;
                saveCalendarData(cal);
                window.renderCalendarModule();
            }
        } else if (t === 'product') {
            const list = getShopProductsList();
            const p = list.find(x => String(x.id) === String(id));
            if (p) {
                p.brand = document.getElementById('sub-edit-role')?.innerText.trim() || p.brand;
                p.name = document.getElementById('sub-edit-title')?.innerText.trim() || p.name;
                p.badge = document.getElementById('sub-edit-high')?.innerText.trim() || p.badge;
                p.desc = document.getElementById('sub-edit-bio')?.innerHTML.trim() || p.desc;
                const priceEl = document.getElementById('sub-edit-price');
                if (priceEl) {
                    const num = parseInt(priceEl.innerText.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(num)) p.price = num;
                }
                saveShopProductsList(list);
                window.renderShopModule();
            }
        }
        if (prevSaveSubEdit) prevSaveSubEdit(t, id);
    };

    const prevSetSubMainCover = window.setSubMainCover;
    window.setSubMainCover = function (t, id, url) {
        if (t === 'race') {
            const hit = findRaceById(id);
            if (hit) {
                hit.race.photo = url;
                saveCalendarData(hit.cal);
                window.renderCalendarModule();
            }
        } else if (t === 'product') {
            const list = getShopProductsList();
            const p = list.find(x => String(x.id) === String(id));
            if (p) {
                p.imgUrl = url;
                saveShopProductsList(list);
                window.renderShopModule();
            }
        }
        if (prevSetSubMainCover) prevSetSubMainCover(t, id, url);
    };

    // =========================================================================
    // 四、统一初始化与全局挂钩
    // =========================================================================
    function initPlugin03All() {
        window.renderCalendarModule();
        window.renderShopModule();
    }

    window.addEventListener('DOMContentLoaded', () => {
        // 接管原生的 renderProducts 与 filterShop，使其指向升级版商城模块
        window.renderProducts = function (cat) {
            if (cat) currentShopCatFilter = cat;
            window.renderShopModule();
        };
        window.filterShop = function (cat) {
            window.selectShopCategory(cat);
        };

        setTimeout(initPlugin03All, 180);

        const origUpdateAuth = window.updateAuthUI;
        if (origUpdateAuth) {
            window.updateAuthUI = function () {
                origUpdateAuth();
                setTimeout(initPlugin03All, 50);
            };
        }

        const origSwitch = window.switchPage;
        if (origSwitch) {
            window.switchPage = function (pageId) {
                origSwitch(pageId);
                if (pageId === 'calendar') window.renderCalendarModule();
                if (pageId === 'shop') window.renderShopModule();
            };
        }
    });
})();
/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 首页「车队主要荣誉」内容与排版可视化编辑插件
 * 说明：零断点完整代码！可直接追加到 update-03.js 末尾，或保存为独立文件 update-04.js 引入。
 * 功能：
 * 1. 支持管理员在首页直接增、删、改「车队主要荣誉」的任意年份、多条荣誉条目、领奖台配图及主标题
 * 2. 支持鼠标拖拽排序 (✥ 拖动) 与 ◀ ▶ 按钮移动顺序
 * 3. 支持 4 种视觉风格切换（①经典时间轴 / ②奖杯卡片网格 / ③黑金冠军殿堂 / ④横向画廊卷轴）
 * 4. 支持 3 种版面宽度与位置切换（右半屏6:6并排 / 12列全宽置顶 / 12列全宽置底）及卡片列数(1/2/3列)控制
 */

(function () {
    'use strict';

    if (window.__YP_HONORS_EDITOR_LOADED__) return;
    window.__YP_HONORS_EDITOR_LOADED__ = true;

    const ADMIN_EMAIL = 'team_youthpower@outlook.com';
    let isHonorsInlineEditing = false;

    function isHonorsAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL && u.role === 'admin');
        } catch (e) { return false; }
    }

    // 复用图片高清压缩器
    async function compressHonorImg(file, maxW = 1000, q = 0.8) {
        if (typeof window.compressLocalImage === 'function') {
            return await window.compressLocalImage(file, maxW, q);
        }
        return new Promise(resolve => {
            if (!file) { resolve(''); return; }
            const r = new FileReader();
            r.onload = e => resolve(e.target.result || '');
            r.onerror = () => resolve('');
            r.readAsDataURL(file);
        });
    }

    // =========================================================================
    // 一、默认车队主要荣誉数据结构与配置
    // =========================================================================
    const defaultHonorsConfig = {
        sectionTitle: '青年力量发展车队主要荣誉 (2021-2026)',
        sectionSubtitle: '体教结合 · 从群众体育迈向职业赛场的坚实足迹',
        styleMode: 'timeline',      // 'timeline' (经典时间轴) | 'cards' (卡片网格) | 'dark_gold' (黑金殿堂) | 'horizontal' (横向画廊)
        positionMode: 'side_right', // 'side_right' (右半屏6:6) | 'full_top' (12列全宽置顶) | 'full_bottom' (12列全宽置底)
        gridCols: 2,                // 卡片模式下每行显示列数: 1 | 2 | 3
        items: [
            {
                id: 'hn_2026',
                year: '2026 赛季',
                badge: '🏆 国家级公开赛夺冠 & 省队输送',
                photo: '',
                records: [
                    '全国公开赛（湖北枝江）大学生组 冠军 — <span class="text-yp-darkGreen font-black">张浩阳</span>（后入选上海市自行车队）'
                ]
            },
            {
                id: 'hn_2025',
                year: '2025 赛季',
                badge: '🌍 世巡赛集训营输送 & 全国锦标赛夺冠',
                photo: '',
                records: [
                    '<span class="text-yp-darkGreen font-black">苏毅</span> 入选世巡赛阿斯塔纳（Astana）车队集训名单',
                    '全国U系列锦标赛乙组大组赛 冠军 — <span class="text-yp-darkGreen font-black">李东润</span>',
                    '<span class="text-yp-darkGreen font-black">徐核</span> 以优异成绩获 UCI Level 2 教练证书，并获 Level 3 全额奖学金资格'
                ]
            },
            {
                id: 'hn_2024',
                year: '2024 赛季',
                badge: '🥇 全国U系列锦标赛双料冠亚军',
                photo: '',
                records: [
                    '全国U系列锦标赛甲组大组赛 冠军 — <span class="text-yp-darkGreen font-black">戴铭亨</span>',
                    '全国U系列锦标赛甲组 ITT 个人计时赛 冠军、亚军 — <span class="text-yp-darkGreen font-black">戴铭亨、尚睿濛</span>'
                ]
            },
            {
                id: 'hn_2023',
                year: '2023 赛季',
                badge: '🇨🇳 全国锦标赛首金 & 国家队输送',
                photo: '',
                records: [
                    '全国U系列锦标赛甲组 ITT 冠军 — <span class="text-yp-darkGreen font-black">马浩均</span>（后入选大学生国家队、成年国家队）'
                ]
            }
        ]
    };

    function getHonorsCfg() {
        try {
            const saved = localStorage.getItem('yp_home_honors_v1');
            if (!saved) return JSON.parse(JSON.stringify(defaultHonorsConfig));
            return { ...defaultHonorsConfig, ...JSON.parse(saved) };
        } catch (e) {
            return JSON.parse(JSON.stringify(defaultHonorsConfig));
        }
    }

    function saveHonorsCfg(cfg) {
        const merged = { ...getHonorsCfg(), ...cfg };
        localStorage.setItem('yp_home_honors_v1', JSON.stringify(merged));
        // 清理可能冲突的旧版整页静态HTML快照
        localStorage.removeItem('yp_cms_page-home');
    }

    // 单项荣誉配图上传器
    let activeHonorPhotoId = null;
    const honorPhotoInput = document.createElement('input');
    honorPhotoInput.type = 'file';
    honorPhotoInput.accept = 'image/*';
    honorPhotoInput.className = 'hidden';
    honorPhotoInput.onchange = async function (ev) {
        const f = (ev.target.files || [])[0];
        if (!f || !activeHonorPhotoId) return;
        const dataUrl = await compressHonorImg(f, 1000, 0.8);
        if (!dataUrl) return;
        const cfg = getHonorsCfg();
        const item = cfg.items.find(x => String(x.id) === String(activeHonorPhotoId));
        if (item) {
            item.photo = dataUrl;
            saveHonorsCfg({ items: cfg.items });
            window.renderHomeHonorsSection();
            if (typeof showToast === 'function') showToast('✅ 荣誉配图已上传并保存！');
        }
        honorPhotoInput.value = '';
    };
    document.body.appendChild(honorPhotoInput);

    window.triggerHonorPhotoUpload = function (itemId) {
        if (!isHonorsAdmin()) return;
        activeHonorPhotoId = itemId;
        honorPhotoInput.click();
    };

    window.clearHonorPhoto = function (itemId) {
        if (!isHonorsAdmin()) return;
        const cfg = getHonorsCfg();
        const item = cfg.items.find(x => String(x.id) === String(itemId));
        if (item) {
            item.photo = '';
            saveHonorsCfg({ items: cfg.items });
            window.renderHomeHonorsSection();
        }
    };

    // =========================================================================
    // 二、拖拽排序绑定辅助
    // =========================================================================
    function bindHonorsSortable(containerEl) {
        if (!containerEl || !isHonorsAdmin()) return;
        let dragEl = null;
        const cards = Array.from(containerEl.querySelectorAll('[data-honor-id]'));
        cards.forEach(card => {
            card.classList.add('yp-sortable');
            card.setAttribute('draggable', 'true');
            card.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

            card.ondragstart = function (e) {
                if (isHonorsInlineEditing) { e.preventDefault(); return; }
                e.stopPropagation();
                dragEl = this;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => this.classList.add('yp-dragging'), 0);
            };
            card.ondragend = function (e) {
                e.stopPropagation();
                this.classList.remove('yp-dragging');
                containerEl.querySelectorAll('[data-honor-id]').forEach(el => el.classList.remove('yp-drag-over'));
                dragEl = null;
                const newIds = Array.from(containerEl.querySelectorAll('[data-honor-id]')).map(el => el.getAttribute('data-honor-id'));
                const cfg = getHonorsCfg();
                const ordered = newIds.map(id => cfg.items.find(x => String(x.id) === String(id))).filter(Boolean);
                if (ordered.length === cfg.items.length) {
                    saveHonorsCfg({ items: ordered });
                    if (typeof showToast === 'function') showToast('✅ 车队主要荣誉顺序已保存！');
                }
            };
            card.ondragover = function (e) {
                e.preventDefault(); e.stopPropagation();
                if (!dragEl || dragEl === this || dragEl.parentNode !== this.parentNode) return;
                this.classList.add('yp-drag-over');
                const siblings = Array.from(containerEl.querySelectorAll('[data-honor-id]'));
                if (siblings.indexOf(dragEl) < siblings.indexOf(this)) {
                    containerEl.insertBefore(dragEl, this.nextSibling);
                } else {
                    containerEl.insertBefore(dragEl, this);
                }
            };
            card.ondragleave = function () { this.classList.remove('yp-drag-over'); };
            card.ondrop = function (e) { e.preventDefault(); e.stopPropagation(); this.classList.remove('yp-drag-over'); };
        });
    }

    // =========================================================================
    // 三、核心渲染：首页「车队主要荣誉」模块（支持4种视觉风格 + 3种版面位置）
    // =========================================================================
    window.renderHomeHonorsSection = function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;

        // 定位包含“车队愿景”与“车队主要荣誉”的 12 列主网格容器
        const visionTitleEl = homePage.querySelector('[data-i18n="vision_title"]');
        const visionCard = visionTitleEl ? visionTitleEl.closest('.lg\\:col-span-6, .lg\\:col-span-12') : null;
        const gridWrapper = visionCard ? visionCard.parentElement : null;
        if (!gridWrapper) return;

        // 找到或创建荣誉容器
        let honorsContainer = document.getElementById('yp-home-honors-container');
        if (!honorsContainer) {
            // 定位原有的右侧荣誉卡片并接管它
            const existingCards = Array.from(gridWrapper.children);
            honorsContainer = existingCards.find(el => el !== visionCard) || document.createElement('div');
            honorsContainer.id = 'yp-home-honors-container';
            if (!honorsContainer.parentElement) gridWrapper.appendChild(honorsContainer);
        }

        const cfg = getHonorsCfg();
        const isAdm = isHonorsAdmin();
        const items = cfg.items || [];

        // 1. 应用版面位置与宽度模式 (side_right 6:6 | full_top 12列置顶 | full_bottom 12列置底)
        if (cfg.positionMode === 'full_top') {
            visionCard.className = 'lg:col-span-12 bg-gray-900 text-white rounded-3xl p-8 flex flex-col justify-between';
            honorsContainer.className = 'lg:col-span-12';
            if (gridWrapper.firstChild !== honorsContainer) {
                gridWrapper.insertBefore(honorsContainer, visionCard);
            }
        } else if (cfg.positionMode === 'full_bottom') {
            visionCard.className = 'lg:col-span-12 bg-gray-900 text-white rounded-3xl p-8 flex flex-col justify-between';
            honorsContainer.className = 'lg:col-span-12';
            if (gridWrapper.lastChild !== honorsContainer) {
                gridWrapper.appendChild(honorsContainer);
            }
        } else {
            // 默认左右 6:6 并排
            visionCard.className = 'lg:col-span-6 bg-gray-900 text-white rounded-2xl p-8 flex flex-col justify-between';
            honorsContainer.className = 'lg:col-span-6';
            if (gridWrapper.lastChild !== honorsContainer) {
                gridWrapper.appendChild(honorsContainer);
            }
        }

        // 2. 管理员专属控制工作台
        const adminBarHtml = isAdm ? `
            <div data-no-edit="true" class="mb-5 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-xl space-y-3 text-xs">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-800">
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded">🏆 荣誉模块编辑器</span>
                        <span class="text-gray-300 font-bold">支持增删荣誉、直接改字、上传领奖台配图及切换排版：</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button onclick="openAddHonorModal()" class="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-lg shadow">
                            ➕ 新增赛季/荣誉
                        </button>
                        <button id="btn-honor-inline-edit" onclick="toggleHonorsInlineEdit()" class="px-3 py-1.5 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-lg shadow">
                            ${isHonorsInlineEditing ? '✕ 取消改字' : '✏️ 开启文字直接修改'}
                        </button>
                        <button id="btn-honor-inline-save" onclick="saveHonorsInlineEdit()" class="${isHonorsInlineEditing ? '' : 'hidden'} px-3.5 py-1.5 bg-yp-lime text-gray-900 font-black rounded-lg shadow animate-pulse">
                            💾 保存文字修改
                        </button>
                    </div>
                </div>

                <!-- 视觉排版风格与宽度位置切换 -->
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-1">
                        <span class="text-gray-400 font-bold mr-1">视觉排版：</span>
                        <button onclick="setHonorsStyle('timeline')" class="px-2.5 py-1 rounded-lg font-bold ${cfg.styleMode === 'timeline' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">① 经典时间轴</button>
                        <button onclick="setHonorsStyle('cards')" class="px-2.5 py-1 rounded-lg font-bold ${cfg.styleMode === 'cards' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">② 奖杯卡片网格</button>
                        <button onclick="setHonorsStyle('dark_gold')" class="px-2.5 py-1 rounded-lg font-bold ${cfg.styleMode === 'dark_gold' ? 'bg-amber-500 text-gray-900 font-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">③ 黑金冠军殿堂</button>
                        <button onclick="setHonorsStyle('horizontal')" class="px-2.5 py-1 rounded-lg font-bold ${cfg.styleMode === 'horizontal' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">④ 横向画廊卷轴</button>
                    </div>

                    <div class="flex flex-wrap items-center gap-1">
                        <span class="text-gray-400 font-bold mr-1">版面布局：</span>
                        <button onclick="setHonorsPosition('side_right')" class="px-2 py-1 rounded-lg ${cfg.positionMode === 'side_right' ? 'bg-purple-600 text-white font-bold' : 'bg-gray-800 text-gray-300'}" title="与左半边车队愿景左右6:6并排">右半屏(6:6)</button>
                        <button onclick="setHonorsPosition('full_top')" class="px-2 py-1 rounded-lg ${cfg.positionMode === 'full_top' ? 'bg-purple-600 text-white font-bold' : 'bg-gray-800 text-gray-300'}" title="独占12列全宽，置顶于愿景上方">全宽置顶</button>
                        <button onclick="setHonorsPosition('full_bottom')" class="px-2 py-1 rounded-lg ${cfg.positionMode === 'full_bottom' ? 'bg-purple-600 text-white font-bold' : 'bg-gray-800 text-gray-300'}" title="独占12列全宽，置底于愿景下方">全宽置底</button>
                        ${(cfg.styleMode === 'cards' || cfg.styleMode === 'dark_gold') ? `
                            <select onchange="setHonorsGridCols(this.value)" class="rounded-lg bg-gray-800 border border-gray-600 px-2 py-1 text-yp-lime font-bold ml-1">
                                <option value="1" ${cfg.gridCols == 1 ? 'selected' : ''}>每行1列</option>
                                <option value="2" ${cfg.gridCols == 2 ? 'selected' : ''}>每行2列</option>
                                <option value="3" ${cfg.gridCols == 3 ? 'selected' : ''}>每行3列</option>
                            </select>
                        ` : ''}
                    </div>
                </div>
            </div>
        ` : '';

        // 单条荣誉的管理操作按钮组
        const renderItemAdminBtns = (item, idx, isDarkBg = false) => {
            if (!isAdm) return '';
            const btnBg = isDarkBg ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            return `
                <div data-no-edit="true" class="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t ${isDarkBg ? 'border-gray-800' : 'border-gray-100'} text-[11px]">
                    <span class="px-1.5 py-0.5 bg-amber-400 text-gray-900 font-black rounded cursor-grab">✥ 拖动</span>
                    <button onclick="moveHonorItem(${idx}, -1)" class="px-1.5 py-0.5 rounded ${btnBg} font-bold" title="上移/前移">◀</button>
                    <button onclick="moveHonorItem(${idx}, 1)" class="px-1.5 py-0.5 rounded ${btnBg} font-bold" title="下移/后移">▶</button>
                    <button onclick="addRecordToHonorItem('${item.id}')" class="px-2 py-0.5 rounded bg-yp-green/20 text-yp-darkGreen font-bold hover:bg-yp-green hover:text-white">➕ 追加战绩</button>
                    <button onclick="triggerHonorPhotoUpload('${item.id}')" class="px-2 py-0.5 rounded ${btnBg} font-bold">📷 ${item.photo ? '换配图' : '加配图'}</button>
                    ${item.photo ? `<button onclick="clearHonorPhoto('${item.id}')" class="px-1.5 py-0.5 text-amber-500 hover:underline">去图</button>` : ''}
                    <button onclick="deleteHonorItem('${item.id}')" class="px-2 py-0.5 rounded bg-red-500/15 text-red-500 hover:bg-red-600 hover:text-white font-bold ml-auto">🗑️ 删除</button>
                </div>
            `;
        };

        // 3. 根据 4 种视觉风格生成主体 HTML
        let bodyHtml = '';

        if (cfg.styleMode === 'cards') {
            // 风格 ②：奖杯卡片网格
            const cols = cfg.gridCols || 2;
            bodyHtml = `
                <div class="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 h-full">
                    <div class="mb-6">
                        <h3 id="honor-main-title" class="yp-editable text-xl sm:text-2xl font-black text-gray-900 flex items-center" contenteditable="${isHonorsInlineEditing}">
                            <i class="fa-solid fa-trophy text-amber-500 mr-2.5"></i><span>${cfg.sectionTitle}</span>
                        </h3>
                        <p id="honor-main-sub" class="yp-editable text-xs text-gray-500 mt-1" contenteditable="${isHonorsInlineEditing}">${cfg.sectionSubtitle || ''}</p>
                    </div>
                    <div id="honors-sortable-list" class="grid grid-cols-1 md:grid-cols-${cols} gap-5">
                        ${items.map((item, idx) => `
                            <div class="rounded-2xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-yp-green hover:shadow-md transition overflow-hidden flex flex-col justify-between p-5" data-honor-id="${item.id}">
                                <div>
                                    ${item.photo ? `<div class="h-44 -mx-5 -mt-5 mb-4 overflow-hidden bg-gray-900"><img src="${item.photo}" class="w-full h-full object-cover"></div>` : ''}
                                    <div class="flex items-center justify-between gap-2 mb-2">
                                        <span class="yp-editable px-2.5 py-0.5 bg-yp-darkGreen text-white text-xs font-black rounded-lg" data-h-year="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.year}</span>
                                        <span class="yp-editable text-[11px] font-bold text-amber-600" data-h-badge="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.badge || ''}</span>
                                    </div>
                                    <div class="space-y-2 mt-3">
                                        ${(item.records || []).map((rec, rIdx) => `
                                            <div class="flex items-start justify-between gap-2 text-sm text-gray-800 font-bold leading-snug">
                                                <div class="flex items-start space-x-2">
                                                    <i class="fa-solid fa-medal text-amber-500 mt-1 shrink-0 text-xs"></i>
                                                    <div class="yp-editable" data-h-rec="${item.id}_${rIdx}" contenteditable="${isHonorsInlineEditing}">${rec}</div>
                                                </div>
                                                ${isAdm && item.records.length > 1 ? `<button onclick="deleteSingleHonorRecord('${item.id}', ${rIdx})" data-no-edit="true" class="text-[10px] text-gray-400 hover:text-red-500 shrink-0" title="删除此条">✕</button>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ${renderItemAdminBtns(item, idx, false)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (cfg.styleMode === 'dark_gold') {
            // 风格 ③：黑金冠军殿堂风
            const cols = cfg.gridCols || 2;
            bodyHtml = `
                <div class="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white rounded-3xl p-8 shadow-2xl border-2 border-amber-500/40 h-full">
                    <div class="mb-6 pb-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <span class="text-[10px] font-black tracking-widest text-amber-400 uppercase">HALL OF FAME & CHAMPIONSHIPS</span>
                            <h3 id="honor-main-title" class="yp-editable text-2xl font-black text-white flex items-center mt-0.5" contenteditable="${isHonorsInlineEditing}">
                                <i class="fa-solid fa-crown text-amber-400 mr-2.5"></i><span>${cfg.sectionTitle}</span>
                            </h3>
                        </div>
                        <p id="honor-main-sub" class="yp-editable text-xs text-gray-400" contenteditable="${isHonorsInlineEditing}">${cfg.sectionSubtitle || ''}</p>
                    </div>
                    <div id="honors-sortable-list" class="grid grid-cols-1 md:grid-cols-${cols} gap-5">
                        ${items.map((item, idx) => `
                            <div class="rounded-2xl border border-amber-500/30 bg-gray-900/90 hover:border-amber-400 transition overflow-hidden flex flex-col justify-between p-5 shadow-lg" data-honor-id="${item.id}">
                                <div>
                                    ${item.photo ? `<div class="h-44 -mx-5 -mt-5 mb-4 overflow-hidden bg-black"><img src="${item.photo}" class="w-full h-full object-cover"></div>` : ''}
                                    <div class="flex items-center justify-between gap-2 mb-3">
                                        <span class="yp-editable px-3 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-950 text-xs font-black rounded-lg shadow" data-h-year="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.year}</span>
                                        <span class="yp-editable text-xs font-bold text-yp-lime" data-h-badge="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.badge || ''}</span>
                                    </div>
                                    <div class="space-y-2.5">
                                        ${(item.records || []).map((rec, rIdx) => `
                                            <div class="flex items-start justify-between gap-2 text-sm text-gray-100 font-semibold leading-snug">
                                                <div class="flex items-start space-x-2">
                                                    <i class="fa-solid fa-trophy text-amber-400 mt-1 shrink-0 text-xs"></i>
                                                    <div class="yp-editable [&_span]:!text-amber-300" data-h-rec="${item.id}_${rIdx}" contenteditable="${isHonorsInlineEditing}">${rec}</div>
                                                </div>
                                                ${isAdm && item.records.length > 1 ? `<button onclick="deleteSingleHonorRecord('${item.id}', ${rIdx})" data-no-edit="true" class="text-[10px] text-gray-500 hover:text-red-400 shrink-0">✕</button>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ${renderItemAdminBtns(item, idx, true)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (cfg.styleMode === 'horizontal') {
            // 风格 ④：横向画廊卷轴
            bodyHtml = `
                <div class="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 h-full overflow-hidden">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 id="honor-main-title" class="yp-editable text-xl sm:text-2xl font-black text-gray-900 flex items-center" contenteditable="${isHonorsInlineEditing}">
                                <i class="fa-solid fa-trophy text-amber-500 mr-2"></i><span>${cfg.sectionTitle}</span>
                            </h3>
                            <p id="honor-main-sub" class="yp-editable text-xs text-gray-500 mt-1" contenteditable="${isHonorsInlineEditing}">${cfg.sectionSubtitle || ''}</p>
                        </div>
                        <span class="text-xs text-yp-darkGreen font-bold">↔️ 左右滑动浏览</span>
                    </div>
                    <div id="honors-sortable-list" class="flex space-x-5 overflow-x-auto pb-4 scroll-smooth">
                        ${items.map((item, idx) => `
                            <div class="shrink-0 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-gray-50 p-5 flex flex-col justify-between shadow-xs" data-honor-id="${item.id}">
                                <div>
                                    ${item.photo ? `<div class="h-44 -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl bg-gray-900"><img src="${item.photo}" class="w-full h-full object-cover"></div>` : ''}
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="yp-editable px-2.5 py-0.5 bg-yp-green text-white text-xs font-black rounded" data-h-year="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.year}</span>
                                        <span class="yp-editable text-[11px] font-bold text-gray-500" data-h-badge="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.badge || ''}</span>
                                    </div>
                                    <div class="space-y-2 mt-3">
                                        ${(item.records || []).map((rec, rIdx) => `
                                            <div class="flex items-start justify-between gap-2 text-sm text-gray-900 font-bold">
                                                <div class="yp-editable" data-h-rec="${item.id}_${rIdx}" contenteditable="${isHonorsInlineEditing}">• ${rec}</div>
                                                ${isAdm && item.records.length > 1 ? `<button onclick="deleteSingleHonorRecord('${item.id}', ${rIdx})" data-no-edit="true" class="text-[10px] text-gray-400 hover:text-red-500">✕</button>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ${renderItemAdminBtns(item, idx, false)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // 风格 ①（默认）：经典垂直时间轴
            bodyHtml = `
                <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 h-full">
                    <h3 id="honor-main-title" class="yp-editable text-xl font-black text-gray-900 mb-6 flex items-center" contenteditable="${isHonorsInlineEditing}">
                        <i class="fa-solid fa-trophy text-amber-500 mr-2"></i><span>${cfg.sectionTitle}</span>
                    </h3>
                    <div id="honors-sortable-list" class="relative border-l-2 border-yp-green/30 ml-3 space-y-6">
                        ${items.map((item, idx) => `
                            <div class="relative pl-6 group" data-honor-id="${item.id}">
                                <span class="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-yp-green border-2 border-white shadow"></span>
                                <div class="flex flex-wrap items-center gap-2">
                                    <div class="yp-editable text-xs font-bold text-yp-darkGreen" data-h-year="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.year}</div>
                                    ${item.badge ? `<span class="yp-editable px-2 py-0.2 bg-green-50 text-yp-darkGreen text-[11px] font-bold rounded" data-h-badge="${item.id}" contenteditable="${isHonorsInlineEditing}">${item.badge}</span>` : ''}
                                </div>
                                ${item.photo ? `<div class="my-2.5 rounded-xl overflow-hidden max-h-48 w-full sm:w-80 border border-gray-200"><img src="${item.photo}" class="w-full h-full object-cover"></div>` : ''}
                                <div class="space-y-1.5 mt-1">
                                    ${(item.records || []).map((rec, rIdx) => `
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="yp-editable font-bold text-gray-900 text-sm sm:text-base leading-snug" data-h-rec="${item.id}_${rIdx}" contenteditable="${isHonorsInlineEditing}">${rec}</div>
                                            ${isAdm && item.records.length > 1 ? `<button onclick="deleteSingleHonorRecord('${item.id}', ${rIdx})" data-no-edit="true" class="text-xs text-gray-400 hover:text-red-500 shrink-0" title="删除此行">✕</button>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                                ${renderItemAdminBtns(item, idx, false)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        honorsContainer.innerHTML = `${adminBarHtml}${bodyHtml}`;
        bindHonorsSortable(document.getElementById('honors-sortable-list'));
    };

    // =========================================================================
    // 四、荣誉模块交互与增删改操作函数
    // =========================================================================
    window.setHonorsStyle = function (styleMode) {
        if (!isHonorsAdmin()) return;
        saveHonorsCfg({ styleMode });
        window.renderHomeHonorsSection();
        if (typeof showToast === 'function') showToast('✨ 车队主要荣誉视觉排版已切换！');
    };

    window.setHonorsPosition = function (positionMode) {
        if (!isHonorsAdmin()) return;
        saveHonorsCfg({ positionMode });
        window.renderHomeHonorsSection();
        if (typeof showToast === 'function') showToast('📐 荣誉模块版面宽度与位置已更新！');
    };

    window.setHonorsGridCols = function (cols) {
        if (!isHonorsAdmin()) return;
        saveHonorsCfg({ gridCols: Number(cols) });
        window.renderHomeHonorsSection();
    };

    window.moveHonorItem = function (idx, dir) {
        if (!isHonorsAdmin()) return;
        const cfg = getHonorsCfg();
        const target = idx + dir;
        if (target < 0 || target >= cfg.items.length) return;
        const tmp = cfg.items[idx];
        cfg.items[idx] = cfg.items[target];
        cfg.items[target] = tmp;
        saveHonorsCfg({ items: cfg.items });
        window.renderHomeHonorsSection();
    };

    window.deleteHonorItem = function (itemId) {
        if (!isHonorsAdmin() || !confirm('确定删除该赛季的全部荣誉条目吗？')) return;
        const cfg = getHonorsCfg();
        saveHonorsCfg({ items: cfg.items.filter(x => String(x.id) !== String(itemId)) });
        window.renderHomeHonorsSection();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该赛季荣誉');
    };

    window.addRecordToHonorItem = function (itemId) {
        if (!isHonorsAdmin()) return;
        const txt = prompt('请输入要追加的荣誉内容（例如：全国公路自行车锦标赛U23组 冠军 — 某某某）：');
        if (!txt || !txt.trim()) return;
        const cfg = getHonorsCfg();
        const item = cfg.items.find(x => String(x.id) === String(itemId));
        if (item) {
            item.records = item.records || [];
            item.records.push(txt.trim());
            saveHonorsCfg({ items: cfg.items });
            window.renderHomeHonorsSection();
            if (typeof showToast === 'function') showToast('✅ 已追加新荣誉战绩！');
        }
    };

    window.deleteSingleHonorRecord = function (itemId, recIdx) {
        if (!isHonorsAdmin()) return;
        const cfg = getHonorsCfg();
        const item = cfg.items.find(x => String(x.id) === String(itemId));
        if (item && item.records) {
            item.records.splice(recIdx, 1);
            saveHonorsCfg({ items: cfg.items });
            window.renderHomeHonorsSection();
        }
    };

    window.toggleHonorsInlineEdit = function () {
        if (!isHonorsAdmin()) return;
        isHonorsInlineEditing = !isHonorsInlineEditing;
        window.renderHomeHonorsSection();
        if (isHonorsInlineEditing && typeof showToast === 'function') {
            showToast('✏️ 已开启荣誉文字直接修改！请直接点击下方带绿框的年份或战绩文字修改，改完点「💾 保存文字修改」。');
        }
    };

    window.saveHonorsInlineEdit = function () {
        if (!isHonorsAdmin()) return;
        const cfg = getHonorsCfg();
        const titleSpan = document.querySelector('#honor-main-title span');
        const subEl = document.getElementById('honor-main-sub');
        if (titleSpan) cfg.sectionTitle = titleSpan.innerText.trim();
        if (subEl) cfg.sectionSubtitle = subEl.innerText.trim();

        cfg.items.forEach(item => {
            const yEl = document.querySelector(`[data-h-year="${item.id}"]`);
            const bEl = document.querySelector(`[data-h-badge="${item.id}"]`);
            if (yEl) item.year = yEl.innerHTML.trim();
            if (bEl) item.badge = bEl.innerHTML.trim();
            (item.records || []).forEach((_, rIdx) => {
                const rEl = document.querySelector(`[data-h-rec="${item.id}_${rIdx}"]`);
                if (rEl) item.records[rIdx] = rEl.innerHTML.replace(/^•\s*/, '').trim();
            });
        });

        isHonorsInlineEditing = false;
        saveHonorsCfg(cfg);
        window.renderHomeHonorsSection();
        if (typeof showToast === 'function') showToast('✅ 车队主要荣誉文字修改已永久保存！');
    };

    // 弹窗新增完整赛季/荣誉卡片
    window.openAddHonorModal = function () {
        if (!isHonorsAdmin()) return;
        let m = document.getElementById('yp-add-honor-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-add-honor-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            m.innerHTML = `
                <div onclick="document.getElementById('yp-add-honor-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
                <div class="bg-gray-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                    <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                        <h3 class="text-lg font-black text-yp-lime">🏆 新增车队主要荣誉 / 赛季里程碑</h3>
                        <button onclick="document.getElementById('yp-add-honor-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onsubmit="submitAddHonorItem(event)" class="p-6 space-y-3.5 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">赛季或年份 *</label><input type="text" id="ahn-year" required placeholder="如：2027 赛季" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">荣誉高光标签</label><input type="text" id="ahn-badge" placeholder="如：🏆 洲际队首冠 & 环赛圆点衫" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div>
                            <label class="block font-bold mb-1">上传领奖台或荣誉配图（可选）</label>
                            <input type="file" id="ahn-file" accept="image/*" class="w-full text-xs">
                        </div>
                        <div>
                            <label class="block font-bold mb-1">具体荣誉战绩（支持输入多行，每行作为一条独立荣誉展示） *</label>
                            <textarea id="ahn-records" required rows="4" placeholder="例如：&#10;环鄱阳湖国际自行车赛 最佳青年车手白衫 — 蒋闻迪&#10;环哥伦比亚 UCI 2.2 爬坡王圆点衫 — Gabriel Rodas" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 立即添加到首页荣誉榜</button>
                    </form>
                </div>
            `;
            document.body.appendChild(m);
        }
        m.classList.remove('hidden');
    };

    window.submitAddHonorItem = async function (e) {
        e.preventDefault();
        const year = document.getElementById('ahn-year').value.trim();
        const badge = document.getElementById('ahn-badge').value.trim();
        const rawRecs = document.getElementById('ahn-records').value;
        const records = rawRecs.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const file = document.getElementById('ahn-file').files[0];
        const photo = file ? await compressHonorImg(file, 1000, 0.8) : '';

        const cfg = getHonorsCfg();
        cfg.items.unshift({
            id: 'hn_' + Date.now(),
            year,
            badge,
            photo,
            records
        });
        saveHonorsCfg({ items: cfg.items });
        window.renderHomeHonorsSection();
        e.target.reset();
        document.getElementById('yp-add-honor-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 已添加「${year}」主要荣誉！`);
    };

    // =========================================================================
    // 五、初始化挂载与全局联动
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.renderHomeHonorsSection();
        }, 200);

        const prevRenderHome = window.renderHomeAll;
        if (prevRenderHome) {
            window.renderHomeAll = function () {
                prevRenderHome();
                window.renderHomeHonorsSection();
            };
        }

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                setTimeout(() => window.renderHomeHonorsSection(), 60);
            };
        }

        const prevSwitchPage = window.switchPage;
        if (prevSwitchPage) {
            window.switchPage = function (pageId) {
                prevSwitchPage(pageId);
                if (pageId === 'home') {
                    setTimeout(() => window.renderHomeHonorsSection(), 40);
                }
            };
        }
    });
})();
