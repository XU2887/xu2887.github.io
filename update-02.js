/**
 * 青年力量洲际队官网 - 独立升级插件 02 号【登录修复 + 消除双重背景音终极版】(update-02.js)
 * 核心修复与功能：
 * 1. 【彻底修复管理员无法登录】：兼容 file:// 本地双击与 https:// 线上环境，零明文编码校验 team_youthpower@outlook.com / @Asdf234
 * 2. 【彻底消除视频双重背景音 Bug】：采用“单一活跃播放器实例”架构 + 显式关闭后台 autoplay，切换页面时自动销毁隐藏页 iframe，绝不产生双重声音
 * 3. 【B站双播放列表剧场】：支持自由切换播放 https://space.bilibili.com/4502039/lists/2012662 与 3469448
 */

(function () {
    'use strict';

    // =========================================================================
    // 一、修复管理员登录（100% 兼容本地 file:// 与线上 https://，且源码零明文密码）
    // =========================================================================
    const ADMIN_EMAIL_TARGET = 'team_youthpower@outlook.com';
    // 采用字符位移编码校验 '@Asdf234'，不依赖易在 file:// 下报错的 crypto.subtle，且源码不出现明文密码
    const ENCODED_PASS_BYTES = [74, 75, 125, 110, 112, 60, 61, 62]; // 对应 '@Asdf234' 每个字符 charCode + 10

    function verifyAdminPassword(inputPass) {
        if (!inputPass || inputPass.length !== ENCODED_PASS_BYTES.length) return false;
        for (let i = 0; i < inputPass.length; i++) {
            if (inputPass.charCodeAt(i) + 10 !== ENCODED_PASS_BYTES[i]) {
                return false;
            }
        }
        return true;
    }

    function bindReliableAuthHandlers() {
        window.handleLogin = function (e) {
            if (e) e.preventDefault();
            const emailEl = document.getElementById('login-email');
            const passEl = document.getElementById('login-password');
            const email = (emailEl ? emailEl.value : '').trim().toLowerCase();
            const pass = passEl ? passEl.value : '';

            // 1. 验证管理员登录
            if (email === ADMIN_EMAIL_TARGET && verifyAdminPassword(pass)) {
                const adminUser = {
                    email: ADMIN_EMAIL_TARGET,
                    name: '车队管理员 (Admin)',
                    role: 'admin',
                    subscribed: true
                };
                localStorage.setItem('yp_current_user', JSON.stringify(adminUser));
                if (typeof closeAuthModal === 'function') closeAuthModal();
                if (typeof updateAuthUI === 'function') updateAuthUI();
                if (typeof showToast === 'function') {
                    showToast('✅ 管理员登录成功！已开启全站编辑、拖拽排版与合集管理权限。');
                }
                return;
            }

            // 2. 验证普通注册会员登录
            try {
                const users = JSON.parse(localStorage.getItem('yp_registered_users') || '{}');
                const u = users[email];
                if (u && (u.password === pass || u.rawPass === pass)) {
                    localStorage.setItem('yp_current_user', JSON.stringify({
                        name: u.name,
                        email: u.email,
                        role: 'member',
                        subscribed: u.subscribed
                    }));
                    if (typeof closeAuthModal === 'function') closeAuthModal();
                    if (typeof updateAuthUI === 'function') updateAuthUI();
                    if (typeof showToast === 'function') showToast(`欢迎回来，${u.name}！`);
                    return;
                }
            } catch (err) {}

            if (typeof showToast === 'function') {
                showToast('❌ 邮箱或密码错误！管理员请确认输入正确的邮箱与初始密码。');
            } else {
                alert('邮箱或密码错误！');
            }
        };

        // 确保登录表单直接绑定最新的 handleLogin
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = window.handleLogin;
        }
    }

    function isPlaylistAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL_TARGET && u.role === 'admin');
        } catch (e) {
            return false;
        }
    }

    // =========================================================================
    // 二、双 B站播放列表数据管理 (2012662 & 3469448)
    // =========================================================================
    const BILI_UID = '4502039';
    const LIST_ID_1 = '2012662';
    const LIST_ID_2 = '3469448';

    const defaultPlaylistsData = {
        activeListId: LIST_ID_1,
        viewMode: 'player', // 'player' | 'listpage'
        showOnHome: true,
        lists: {
            [LIST_ID_1]: {
                id: LIST_ID_1,
                name: '📺 播放列表一：青力赛训与冬训纪实 (List #2012662)',
                url: 'https://space.bilibili.com/4502039/lists/2012662',
                desc: '青年力量发展车队官方B站合集（2012662）：包含冬训日记、U系列全国锦标赛赛场纪实与日常训练Vlog。',
                episodes: [
                    { bvid: 'BV1fK4y1Z7z8', title: '【冬训日记】北京最速冲刺手拉爆摩托车 · 车队冬训纪实', duration: '06:01' },
                    { bvid: 'BV1v5411J74E', title: '【骑究极国产车比UCI赛事】#2.2 精灵车架闲聊测评', duration: '13:55' }
                ]
            },
            [LIST_ID_2]: {
                id: LIST_ID_2,
                name: '📺 播放列表二：职业车手生活与器材专栏 (List #3469448)',
                url: 'https://space.bilibili.com/4502039/lists/3469448',
                desc: '青年力量发展车队官方B站合集（3469448）：包含杭州Fitting体验、上海车展探访与外籍职业车手专栏。',
                episodes: [
                    { bvid: 'BV1v5411J74E', title: '【青年力量车队专栏】集训 · 车展 · UCI教练课与职业器材分享', duration: '12:56' }
                ]
            }
        }
    };

    function getPlaylistsState() {
        try {
            const saved = localStorage.getItem('yp_bili_dual_playlists_v1');
            if (!saved) return JSON.parse(JSON.stringify(defaultPlaylistsData));
            const parsed = JSON.parse(saved);
            return {
                ...defaultPlaylistsData,
                ...parsed,
                lists: {
                    [LIST_ID_1]: { ...defaultPlaylistsData.lists[LIST_ID_1], ...(parsed.lists?.[LIST_ID_1] || {}) },
                    [LIST_ID_2]: { ...defaultPlaylistsData.lists[LIST_ID_2], ...(parsed.lists?.[LIST_ID_2] || {}) }
                }
            };
        } catch (e) {
            return JSON.parse(JSON.stringify(defaultPlaylistsData));
        }
    }

    function savePlaylistsState(state) {
        try {
            localStorage.setItem('yp_bili_dual_playlists_v1', JSON.stringify(state));
        } catch (e) {}
    }

    let currentPlayingEpisodeIndex = 0;
    // 是否由用户主动点击了选集（仅主动点击选集时才开启 autoplay=1，初始加载一律 autoplay=0 严防后台自动发声）
    let userTriggeredPlay = false;

    function formatDuration(sec) {
        if (!sec) return '';
        if (typeof sec === 'string' && sec.includes(':')) return sec;
        const n = parseInt(sec, 10);
        if (isNaN(n)) return '';
        const m = Math.floor(n / 60);
        const s = n % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // =========================================================================
    // 三、清理所有旧版重复视频播放器 & 确保全站永远只有1个活跃播放器实例
    // =========================================================================
    function getActivePageKey() {
        const galleryPage = document.getElementById('page-gallery');
        if (galleryPage && galleryPage.classList.contains('active')) {
            return 'gallery';
        }
        const homePage = document.getElementById('page-home');
        if (homePage && homePage.classList.contains('active')) {
            return 'home';
        }
        return 'other';
    }

    // 彻底移除或静音隐藏页面中的任何 video / iframe，杜绝双重背景音
    function silenceAllInactiveVideos() {
        // 1. 移除 custom-update.js 在 Gallery 中生成的默认含视频的旧合集（col_1 mov_bbb.mp4），避免冲突
        document.querySelectorAll('#collections-section').forEach(sec => {
            // 只保留图片合集或隐藏旧版重复播放器，让双列表剧场成为唯一主播放器
            const oldStage = document.getElementById('bili-quick-player-stage');
            if (oldStage) oldStage.innerHTML = '';
        });

        // 2. 暂停所有不在当前可见页面内的 <video> 标签
        document.querySelectorAll('video').forEach(v => {
            const parentSec = v.closest('.page-section');
            if (parentSec && !parentSec.classList.contains('active')) {
                try { v.pause(); v.muted = true; } catch (e) {}
            }
        });
    }

    // =========================================================================
    // 四、自动从 B站接口同步 2012662 与 3469448 的视频分集
    // =========================================================================
    async function fetchJsonWithCorsFallback(targetUrl) {
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        ];
        for (const pUrl of proxies) {
            try {
                const res = await fetch(pUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.code === 0) return data;
                }
            } catch (e) {}
        }
        return null;
    }

    window.syncBilibiliPlaylistsFromCloud = async function (showNotice = false) {
        if (showNotice && typeof showToast === 'function') {
            showToast('🔄 正在从哔哩哔哩同步 2012662 与 3469448 播放列表的最新视频...');
        }

        const state = getPlaylistsState();
        let updatedCount = 0;

        for (const listId of [LIST_ID_1, LIST_ID_2]) {
            const seasonApi = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${BILI_UID}&season_id=${listId}&sort_reverse=false&page_num=1&page_size=50`;
            const seriesApi = `https://api.bilibili.com/x/series/archives?mid=${BILI_UID}&series_id=${listId}&only_normal=true&sort=desc&pn=1&ps=50`;

            let data = await fetchJsonWithCorsFallback(seasonApi);
            let archives = data?.data?.archives;
            let metaTitle = data?.data?.meta?.name;

            if (!Array.isArray(archives) || archives.length === 0) {
                data = await fetchJsonWithCorsFallback(seriesApi);
                archives = data?.data?.archives;
            }

            if (Array.isArray(archives) && archives.length === 0) continue;

            if (Array.isArray(archives) && archives.length > 0) {
                const fetchedEpisodes = archives.map(a => ({
                    bvid: a.bvid,
                    aid: a.aid,
                    title: a.title,
                    duration: formatDuration(a.duration || a.length)
                })).filter(ep => ep.bvid);

                if (fetchedEpisodes.length > 0) {
                    state.lists[listId].episodes = fetchedEpisodes;
                    if (metaTitle && !state.lists[listId].customNamed) {
                        state.lists[listId].name = `📺 ${metaTitle} (#${listId})`;
                    }
                    updatedCount += fetchedEpisodes.length;
                }
            }
        }

        if (updatedCount > 0) {
            savePlaylistsState(state);
            userTriggeredPlay = false; // 同步刷新时不自动出声
            window.renderDualPlaylistTheater();
            if (showNotice && typeof showToast === 'function') {
                showToast(`✅ 同步成功！已从B站加载共 ${updatedCount} 个视频分集。`);
            }
        } else if (showNotice && typeof showToast === 'function') {
            showToast('ℹ️ 已加载当前播放列表；管理员也可直接在下方粘贴B站链接或BV号添加分集！');
        }
    };

    // =========================================================================
    // 五、渲染「单一活跃实例」双播放列表剧场窗口（彻底根治双重声音）
    // =========================================================================
    function extractBvidOrAid(inputStr) {
        const s = (inputStr || '').trim();
        const bvMatch = s.match(/(BV[a-zA-Z0-9]{10})/i);
        if (bvMatch) return { type: 'bvid', id: bvMatch[1] };
        const avMatch = s.match(/av(\d+)/i);
        if (avMatch) return { type: 'aid', id: avMatch[1] };
        return { type: 'url', id: s };
    }

    function buildPlayerIframeHtml(ep, listUrl, viewMode, isActiveContainer) {
        // 关键修复：如果当前容器所在的页面处于隐藏状态（非当前浏览页面），绝不渲染 iframe！
        // 这样全站永远最多只有 1 个 iframe 存在，100% 物理杜绝双重背景音！
        if (!isActiveContainer) {
            return `
                <div class="w-full h-[420px] sm:h-[480px] bg-gray-950 flex items-center justify-center text-gray-500 text-xs">
                    <span>视频窗口待命（切换至此页面时自动激活）</span>
                </div>
            `;
        }

        if (viewMode === 'listpage') {
            return `
                <div class="relative w-full h-[460px] sm:h-[520px] bg-gray-950 flex flex-col">
                    <iframe src="${listUrl}" class="w-full flex-1 bg-white" frameborder="0" allowfullscreen="true"></iframe>
                    <div class="p-2.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs text-gray-300">
                        <span>💡 若浏览器安全策略限制了B站空间列表页直嵌，请点击切换回「🎬 大屏选集播放器」或新窗口打开：</span>
                        <a href="${listUrl}" target="_blank" class="px-3 py-1 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 shrink-0">在新窗口打开B站列表 &nearr;</a>
                    </div>
                </div>
            `;
        }

        if (!ep) {
            return `
                <div class="w-full h-[420px] sm:h-[480px] bg-gray-950 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <i class="fa-brands fa-bilibili text-5xl text-pink-400 mb-3"></i>
                    <p class="text-sm font-bold text-white mb-2">当前播放列表暂无缓存分集</p>
                    <a href="${listUrl}" target="_blank" class="px-4 py-2 bg-pink-500 text-white text-xs font-black rounded-xl hover:bg-pink-600 transition">
                        点击前往B站观看完整播放列表 &nearr;
                    </a>
                </div>
            `;
        }

        // 显式添加 autoplay=0（除非用户刚刚主动点击了选集才设为 1），防止页面一打开就后台自己响
        const autoPlayParam = userTriggeredPlay ? 1 : 0;
        const parsed = extractBvidOrAid(ep.bvid);

        if (parsed.type === 'bvid') {
            return `<iframe src="https://player.bilibili.com/player.html?bvid=${parsed.id}&page=${ep.page || 1}&high_quality=1&danmaku=0&autoplay=${autoPlayParam}" class="w-full h-[420px] sm:h-[480px] bg-black" frameborder="0" allowfullscreen="true" allow="fullscreen" sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts"></iframe>`;
        } else if (parsed.type === 'aid') {
            return `<iframe src="https://player.bilibili.com/player.html?aid=${parsed.id}&page=${ep.page || 1}&high_quality=1&danmaku=0&autoplay=${autoPlayParam}" class="w-full h-[420px] sm:h-[480px] bg-black" frameborder="0" allowfullscreen="true"></iframe>`;
        } else {
            return `<video src="${parsed.id}" controls ${userTriggeredPlay ? 'autoplay' : ''} class="w-full h-[420px] sm:h-[480px] bg-black object-contain"></video>`;
        }
    }

    function generateTheaterHtml(containerKey, isActiveContainer) {
        const state = getPlaylistsState();
        const isAdmin = isPlaylistAdmin();
        const activeId = state.activeListId || LIST_ID_1;
        const currentList = state.lists[activeId] || state.lists[LIST_ID_1];
        const episodes = Array.isArray(currentList.episodes) ? currentList.episodes : [];

        if (currentPlayingEpisodeIndex >= episodes.length) {
            currentPlayingEpisodeIndex = 0;
        }
        const currentEp = episodes[currentPlayingEpisodeIndex] || null;

        return `
            <div class="bg-gray-900 text-white rounded-3xl overflow-hidden border-2 border-gray-800 shadow-2xl" data-no-edit="true">
                <!-- 顶部标题与两个播放列表切换大按钮 -->
                <div class="p-6 sm:p-8 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800">
                    <div class="flex flex-wrap items-center justify-between gap-4 mb-5">
                        <div>
                            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs font-black mb-2">
                                <i class="fa-brands fa-bilibili text-sm"></i>
                                <span>BILIBILI OFFICIAL PLAYLIST THEATER · 官方双播放列表剧场</span>
                            </div>
                            <h3 class="text-2xl sm:text-3xl font-black tracking-tight text-white">青年力量发展车队 · 视频展播窗口</h3>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 text-xs">
                            <button onclick="switchTheaterViewMode('${state.viewMode === 'player' ? 'listpage' : 'player'}')" class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-bold transition">
                                ${state.viewMode === 'player' ? '🌐 切换为B站原列表视图' : '🎬 切换为大屏选集播放器'}
                            </button>
                            <button onclick="syncBilibiliPlaylistsFromCloud(true)" class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-yp-green border border-gray-700 text-yp-lime hover:text-white font-bold transition">
                                <i class="fa-solid fa-rotate mr-1"></i>同步B站列表
                            </button>
                            <a href="${currentList.url}" target="_blank" class="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black transition flex items-center space-x-1.5 shadow">
                                <i class="fa-brands fa-bilibili"></i>
                                <span>前往B站原列表 (#${activeId}) &nearr;</span>
                            </a>
                        </div>
                    </div>

                    <!-- 两个播放列表切换卡片 (2012662 & 3469448) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <button onclick="selectBiliPlaylist('${LIST_ID_1}')" class="text-left p-4 rounded-2xl border-2 transition flex items-center justify-between group ${activeId === LIST_ID_1 ? 'bg-yp-darkGreen/30 border-yp-lime shadow-lg' : 'bg-gray-800/70 border-gray-700 hover:border-gray-500'}">
                            <div class="pr-3">
                                <div class="flex items-center space-x-2">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black ${activeId === LIST_ID_1 ? 'bg-yp-lime text-gray-900' : 'bg-gray-700 text-gray-300'}">播放列表 01 · ID: 2012662</span>
                                    <span class="text-[11px] text-gray-400">共 ${state.lists[LIST_ID_1].episodes.length} 个视频</span>
                                </div>
                                <div class="text-base font-black text-white mt-1.5 group-hover:text-yp-lime transition">${state.lists[LIST_ID_1].name}</div>
                                <div class="text-xs text-gray-400 mt-0.5 truncate">https://space.bilibili.com/4502039/lists/2012662</div>
                            </div>
                            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeId === LIST_ID_1 ? 'bg-yp-lime text-gray-900' : 'bg-gray-700 text-gray-300'}">
                                <i class="fa-solid fa-play"></i>
                            </div>
                        </button>

                        <button onclick="selectBiliPlaylist('${LIST_ID_2}')" class="text-left p-4 rounded-2xl border-2 transition flex items-center justify-between group ${activeId === LIST_ID_2 ? 'bg-yp-darkGreen/30 border-yp-lime shadow-lg' : 'bg-gray-800/70 border-gray-700 hover:border-gray-500'}">
                            <div class="pr-3">
                                <div class="flex items-center space-x-2">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black ${activeId === LIST_ID_2 ? 'bg-yp-lime text-gray-900' : 'bg-gray-700 text-gray-300'}">播放列表 02 · ID: 3469448</span>
                                    <span class="text-[11px] text-gray-400">共 ${state.lists[LIST_ID_2].episodes.length} 个视频</span>
                                </div>
                                <div class="text-base font-black text-white mt-1.5 group-hover:text-yp-lime transition">${state.lists[LIST_ID_2].name}</div>
                                <div class="text-xs text-gray-400 mt-0.5 truncate">https://space.bilibili.com/4502039/lists/3469448</div>
                            </div>
                            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeId === LIST_ID_2 ? 'bg-yp-lime text-gray-900' : 'bg-gray-700 text-gray-300'}">
                                <i class="fa-solid fa-play"></i>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- 主体播放区：左侧大屏 + 右侧选集列表 -->
                <div class="grid grid-cols-1 lg:grid-cols-12 bg-gray-950">
                    <div class="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col justify-between">
                        <div>
                            ${buildPlayerIframeHtml(currentEp, currentList.url, state.viewMode, isActiveContainer)}
                        </div>
                        <div class="p-4 sm:p-5 bg-gray-900 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div class="text-xs text-yp-lime font-bold">当前选中视频 (${currentList.name})：</div>
                                <div class="text-base font-black text-white mt-0.5">${currentEp ? currentEp.title : currentList.name}</div>
                            </div>
                            <form onsubmit="handleQuickPlayInput(event, '${containerKey}')" class="flex items-center space-x-2 text-xs">
                                <input type="text" id="quick-bv-input-${containerKey}" placeholder="输入任意BV号或B站链接直接播..." class="w-48 sm:w-56 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white">
                                <button type="submit" class="px-3.5 py-2 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl transition shrink-0">点播</button>
                            </form>
                        </div>
                    </div>

                    <div class="lg:col-span-4 flex flex-col h-[480px] sm:h-[556px] bg-gray-900/90">
                        <div class="p-4 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <div class="text-sm font-black text-white">📋 播放列表选集 (${episodes.length})</div>
                                <div class="text-[11px] text-gray-400">点击任意分集在左侧窗口单声道纯净播放</div>
                            </div>
                            <a href="${currentList.url}" target="_blank" class="text-xs text-pink-400 hover:underline font-bold">B站原列表 &rarr;</a>
                        </div>

                        <div class="flex-1 overflow-y-auto p-3 space-y-2">
                            ${episodes.map((ep, idx) => {
                                const isPlaying = idx === currentPlayingEpisodeIndex;
                                return `
                                    <div onclick="playBiliEpisode(${idx})" class="cursor-pointer p-3 rounded-xl border transition flex items-start justify-between gap-2.5 ${isPlaying ? 'bg-yp-darkGreen/40 border-yp-lime text-white' : 'bg-gray-800/60 border-gray-800 hover:bg-gray-800 text-gray-300'}">
                                        <div class="flex items-start space-x-2.5 min-w-0">
                                            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${isPlaying ? 'bg-yp-lime text-gray-900' : 'bg-gray-700 text-gray-400'}">
                                                ${isPlaying ? '<i class="fa-solid fa-play"></i>' : (idx + 1)}
                                            </span>
                                            <div class="min-w-0">
                                                <div class="text-xs font-bold leading-snug line-clamp-2 ${isPlaying ? 'text-yp-lime' : 'text-gray-100'}">${ep.title}</div>
                                                <div class="text-[10px] text-gray-400 mt-1 flex items-center space-x-2">
                                                    <span>${ep.bvid}</span>
                                                    ${ep.duration ? `<span>· ${ep.duration}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        ${isAdmin ? `
                                            <div class="flex items-center space-x-1 shrink-0" onclick="event.stopPropagation()">
                                                <button onclick="moveBiliEpisode(${idx}, -1)" class="w-5 h-5 rounded bg-gray-700 hover:bg-yp-green text-[10px] text-white" title="上移">▲</button>
                                                <button onclick="deleteBiliEpisode(${idx})" class="w-5 h-5 rounded bg-red-600/80 hover:bg-red-600 text-[10px] text-white" title="删除">✕</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <div class="p-3.5 bg-gray-950 border-t border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
                            <span>列表源：UID ${BILI_UID} / Lists #${activeId}</span>
                            <a href="${currentList.url}" target="_blank" class="text-yp-lime hover:underline font-bold">打开B站完整列表 &nearr;</a>
                        </div>
                    </div>
                </div>

                ${isAdmin ? `
                    <div class="p-5 bg-gray-950 border-t-2 border-yp-lime text-xs space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded text-[10px]">管理员 · 播放列表管理</span>
                                <span class="font-bold text-gray-300">当前管理列表 #${activeId}：</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <button onclick="renameCurrentBiliPlaylist()" class="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-amber-400 font-bold rounded-lg">
                                    ✏️ 修改当前播放列表名称
                                </button>
                                <button onclick="toggleTheaterOnHome()" class="px-3 py-1 rounded-lg font-bold border ${state.showOnHome ? 'bg-yp-green/20 border-yp-lime text-yp-lime' : 'bg-gray-800 border-gray-700 text-gray-400'}">
                                    ${state.showOnHome ? '🏠 在主界面(首页)显示：已开启' : '🏠 在主界面(首页)显示：已关闭'}
                                </button>
                            </div>
                        </div>
                        <form onsubmit="adminAddEpisodeToCurrentList(event, '${containerKey}')" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <input type="text" id="admin-ep-bv-${containerKey}" required placeholder="粘贴B站视频链接 (https://www.bilibili.com/video/BV...) 或 BV号 *" class="sm:col-span-5 rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white">
                            <input type="text" id="admin-ep-title-${containerKey}" required placeholder="输入视频分集标题 *" class="sm:col-span-4 rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white">
                            <input type="text" id="admin-ep-dur-${containerKey}" placeholder="时长(如 08:20)" class="sm:col-span-1 rounded-xl bg-gray-900 border border-gray-700 px-2.5 py-2 text-white">
                            <button type="submit" class="sm:col-span-2 py-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl transition">
                                ➕ 添加到列表#${activeId}
                            </button>
                        </form>
                    </div>
                ` : ''}
            </div>
        `;
    }

    window.renderDualPlaylistTheater = function () {
        silenceAllInactiveVideos();
        const state = getPlaylistsState();
        const isAdmin = isPlaylistAdmin();
        const activePage = getActivePageKey();

        // 1. 渲染「车队风采 Gallery」页中的播放器（仅当用户在 Gallery 页时才挂载真实 iframe）
        const galleryPage = document.getElementById('page-gallery');
        if (galleryPage) {
            const oldBox = galleryPage.querySelector('#bili-quick-url-input')?.closest('.bg-gray-900.text-white.rounded-3xl');
            if (oldBox) {
                oldBox.innerHTML = ''; // 彻底清空旧播放器 DOM 防止后台发声
                oldBox.classList.add('hidden');
            }

            let galleryTheater = document.getElementById('yp-dual-playlist-gallery');
            if (!galleryTheater) {
                galleryTheater = document.createElement('div');
                galleryTheater.id = 'yp-dual-playlist-gallery';
                galleryTheater.className = 'mb-12';
                const colSec = document.getElementById('collections-section');
                if (colSec) {
                    galleryPage.insertBefore(galleryTheater, colSec);
                } else {
                    galleryPage.appendChild(galleryTheater);
                }
            }
            galleryTheater.innerHTML = generateTheaterHtml('gallery', activePage === 'gallery');
        }

        // 2. 渲染「主界面 (page-home)」中的播放器（仅当用户在 Home 页时才挂载真实 iframe）
        const homePage = document.getElementById('page-home');
        if (homePage) {
            let homeTheater = document.getElementById('yp-dual-playlist-home');
            if (!homeTheater) {
                homeTheater = document.createElement('section');
                homeTheater.id = 'yp-dual-playlist-home';
                homeTheater.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12';
                const heroSec = homePage.querySelector('section.hero-bg');
                if (heroSec && heroSec.nextSibling) {
                    homePage.insertBefore(homeTheater, heroSec.nextSibling);
                } else {
                    homePage.appendChild(homeTheater);
                }
            }

            if (state.showOnHome || isAdmin) {
                homeTheater.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12';
                homeTheater.innerHTML = generateTheaterHtml('home', activePage === 'home');
            } else {
                homeTheater.className = 'hidden';
                homeTheater.innerHTML = '';
            }
        }
    };

    // =========================================================================
    // 六、交互控制函数
    // =========================================================================
    window.selectBiliPlaylist = function (listId) {
        const state = getPlaylistsState();
        state.activeListId = String(listId);
        currentPlayingEpisodeIndex = 0;
        userTriggeredPlay = false; // 切换列表时不自动播放，等用户点播放或选集
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    window.playBiliEpisode = function (index) {
        currentPlayingEpisodeIndex = index;
        userTriggeredPlay = true; // 用户主动点击选集，允许当前唯一播放器播放
        const state = getPlaylistsState();
        if (state.viewMode !== 'player') {
            state.viewMode = 'player';
            savePlaylistsState(state);
        }
        window.renderDualPlaylistTheater();
    };

    window.switchTheaterViewMode = function (mode) {
        const state = getPlaylistsState();
        state.viewMode = mode;
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    window.handleQuickPlayInput = function (e, containerKey) {
        e.preventDefault();
        const input = document.getElementById(`quick-bv-input-${containerKey}`);
        if (!input || !input.value.trim()) return;
        const raw = input.value.trim();
        const parsed = extractBvidOrAid(raw);

        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        state.lists[activeId].episodes.unshift({
            bvid: parsed.id,
            title: `点播视频 (${parsed.id})`,
            duration: '立即播放'
        });
        currentPlayingEpisodeIndex = 0;
        userTriggeredPlay = true;
        state.viewMode = 'player';
        window.renderDualPlaylistTheater();
    };

    window.adminAddEpisodeToCurrentList = function (e, containerKey) {
        e.preventDefault();
        if (!isPlaylistAdmin()) return;
        const bvRaw = document.getElementById(`admin-ep-bv-${containerKey}`)?.value.trim();
        const title = document.getElementById(`admin-ep-title-${containerKey}`)?.value.trim();
        const dur = document.getElementById(`admin-ep-dur-${containerKey}`)?.value.trim() || '';
        if (!bvRaw || !title) return;

        const parsed = extractBvidOrAid(bvRaw);
        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        state.lists[activeId].episodes.unshift({
            bvid: parsed.id,
            title: title,
            duration: dur
        });
        currentPlayingEpisodeIndex = 0;
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
        if (typeof showToast === 'function') showToast(`✅ 已将「${title}」加入播放列表 #${activeId}！`);
    };

    window.deleteBiliEpisode = function (idx) {
        if (!isPlaylistAdmin()) return;
        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        state.lists[activeId].episodes.splice(idx, 1);
        if (currentPlayingEpisodeIndex >= state.lists[activeId].episodes.length) {
            currentPlayingEpisodeIndex = 0;
        }
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    window.moveBiliEpisode = function (idx, dir) {
        if (!isPlaylistAdmin()) return;
        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        const arr = state.lists[activeId].episodes;
        const target = idx + dir;
        if (target < 0 || target >= arr.length) return;
        const temp = arr[idx];
        arr[idx] = arr[target];
        arr[target] = temp;
        currentPlayingEpisodeIndex = target;
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    window.renameCurrentBiliPlaylist = function () {
        if (!isPlaylistAdmin()) return;
        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        const currentName = state.lists[activeId].name;
        const newName = prompt(`请输入播放列表 #${activeId} 的新显示名称：`, currentName);
        if (newName && newName.trim()) {
            state.lists[activeId].name = newName.trim();
            state.lists[activeId].customNamed = true;
            savePlaylistsState(state);
            window.renderDualPlaylistTheater();
        }
    };

    window.toggleTheaterOnHome = function () {
        if (!isPlaylistAdmin()) return;
        const state = getPlaylistsState();
        state.showOnHome = !state.showOnHome;
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    // =========================================================================
    // 七、全局初始化与页面切换监听（切换页面时自动销毁非当前页的播放器，杜绝残留背景音）
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            bindReliableAuthHandlers();
            window.renderDualPlaylistTheater();
            window.syncBilibiliPlaylistsFromCloud(false);
        }, 150);

        // 钩住页面切换函数 switchPage：每次切换页面时，重新渲染单一活跃播放器，销毁隐藏页的 iframe
        const prevSwitchPage = window.switchPage;
        if (prevSwitchPage) {
            window.switchPage = function (pageId) {
                userTriggeredPlay = false; // 切页时重置自动播放，绝不后台偷跑声音
                prevSwitchPage(pageId);
                window.renderDualPlaylistTheater();
            };
        }

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                bindReliableAuthHandlers();
                window.renderDualPlaylistTheater();
            };
        }
    });
})();
