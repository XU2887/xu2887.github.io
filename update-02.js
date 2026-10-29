/**
 * 青年力量洲际队官网 - 独立升级插件 02 号【真实视频精准播放 + 批量导入终极版】(update-02.js)
 * 核心修复：
 * 1. 自动清除之前导致“播放内容有误”的测试占位BV号 (BV1fK4y1Z7z8 / BV1v5411J74E)
 * 2. 针对B站跨域风控限制，内置「多线路API同步」+「⚡ 3秒一键提取/批量粘贴导入真实列表视频」功能
 * 3. 单一活跃播放器实例 + autoplay=0 静音待命，彻底杜绝双重背景音
 */

(function () {
    'use strict';

    const ADMIN_EMAIL_TARGET = 'team_youthpower@outlook.com';
    const BILI_UID = '4502039';
    const LIST_ID_1 = '2012662';
    const LIST_ID_2 = '3469448';

    // 校验当前是否为管理员
    function isPlaylistAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === ADMIN_EMAIL_TARGET && u.role === 'admin');
        } catch (e) {
            return false;
        }
    }

    // 初始双播放列表结构（不再预填任何错误的测试BV号！）
    const defaultPlaylistsData = {
        activeListId: LIST_ID_1,
        showOnHome: true,
        lists: {
            [LIST_ID_1]: {
                id: LIST_ID_1,
                name: '📺 播放列表一 (List #2012662)',
                url: 'https://space.bilibili.com/4502039/lists/2012662',
                episodes: []
            },
            [LIST_ID_2]: {
                id: LIST_ID_2,
                name: '📺 播放列表二 (List #3469448)',
                url: 'https://space.bilibili.com/4502039/lists/3469448',
                episodes: []
            }
        }
    };

    // 读取状态并自动清理旧版残留的错误测试BV号
    function getPlaylistsState() {
        try {
            const saved = localStorage.getItem('yp_bili_dual_playlists_v2');
            if (!saved) {
                // 尝试迁移 v1 中管理员自己添加的真实视频，但剔除错误的示例 BV1fK4y1Z7z8 和 BV1v5411J74E
                const oldV1 = localStorage.getItem('yp_bili_dual_playlists_v1');
                if (oldV1) {
                    const parsedOld = JSON.parse(oldV1);
                    const badBvs = ['BV1fK4y1Z7z8', 'BV1v5411J74E'];
                    [LIST_ID_1, LIST_ID_2].forEach(id => {
                        if (parsedOld.lists?.[id]?.episodes) {
                            defaultPlaylistsData.lists[id].episodes = parsedOld.lists[id].episodes.filter(ep => !badBvs.includes(ep.bvid));
                        }
                        if (parsedOld.lists?.[id]?.customNamed) {
                            defaultPlaylistsData.lists[id].name = parsedOld.lists[id].name;
                        }
                    });
                }
                localStorage.setItem('yp_bili_dual_playlists_v2', JSON.stringify(defaultPlaylistsData));
                return JSON.parse(JSON.stringify(defaultPlaylistsData));
            }
            return JSON.parse(saved);
        } catch (e) {
            return JSON.parse(JSON.stringify(defaultPlaylistsData));
        }
    }

    function savePlaylistsState(state) {
        try {
            localStorage.setItem('yp_bili_dual_playlists_v2', JSON.stringify(state));
        } catch (e) {}
    }

    let currentPlayingEpisodeIndex = 0;
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

    // 判断当前处于哪个可见页面（确保全站只有1个活跃播放器，杜绝双重背景音）
    function getActivePageKey() {
        const galleryPage = document.getElementById('page-gallery');
        if (galleryPage && galleryPage.classList.contains('active')) return 'gallery';
        const homePage = document.getElementById('page-home');
        if (homePage && homePage.classList.contains('active')) return 'home';
        return 'other';
    }

    function silenceAllInactiveVideos() {
        const oldStage = document.getElementById('bili-quick-player-stage');
        if (oldStage) oldStage.innerHTML = '';
        document.querySelectorAll('video').forEach(v => {
            const parentSec = v.closest('.page-section');
            if (parentSec && !parentSec.classList.contains('active')) {
                try { v.pause(); v.muted = true; } catch (e) {}
            }
        });
    }

    // =========================================================================
    // 一、多线路代理尝试自动同步 + 根据单个BV号自动获取B站真实标题
    // =========================================================================
    async function fetchBiliJsonMultiProxy(targetUrl) {
        const proxyBuilders = [
            url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            url => `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];
        for (const buildUrl of proxyBuilders) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 5500);
                const res = await fetch(buildUrl(targetUrl), { signal: controller.signal });
                clearTimeout(timer);
                if (res.ok) {
                    const raw = await res.json();
                    const data = raw.contents ? JSON.parse(raw.contents) : raw;
                    if (data && data.code === 0) return data;
                }
            } catch (e) {}
        }
        return null;
    }

    // 根据单个 BV 号自动查询该视频在 B 站上的真实标题与时长
    async function fetchSingleVideoMeta(bvid) {
        const api = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        const data = await fetchBiliJsonMultiProxy(api);
        if (data && data.data && data.data.title) {
            return {
                bvid: data.data.bvid || bvid,
                title: data.data.title,
                duration: formatDuration(data.data.duration)
            };
        }
        return null;
    }

    window.syncBilibiliPlaylistsFromCloud = async function (showNotice = false) {
        if (showNotice && typeof showToast === 'function') {
            showToast('🔄 正在尝试通过多线路连接B站获取 2012662 与 3469448 列表...');
        }

        const state = getPlaylistsState();
        let updatedCount = 0;

        for (const listId of [LIST_ID_1, LIST_ID_2]) {
            const seriesApi = `https://api.bilibili.com/x/series/archives?mid=${BILI_UID}&series_id=${listId}&only_normal=true&sort=desc&pn=1&ps=50`;
            const seasonApi = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${BILI_UID}&season_id=${listId}&sort_reverse=false&page_num=1&page_size=50`;

            let data = await fetchBiliJsonMultiProxy(seriesApi);
            let archives = data?.data?.archives;
            let metaTitle = null;

            if (!Array.isArray(archives) || archives.length === 0) {
                data = await fetchBiliJsonMultiProxy(seasonApi);
                archives = data?.data?.archives;
                metaTitle = data?.data?.meta?.name;
            }

            if (Array.isArray(archives) && archives.length > 0) {
                const fetchedEpisodes = archives.map(a => ({
                    bvid: a.bvid,
                    aid: a.aid,
                    title: a.title || `B站视频 (${a.bvid})`,
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
            userTriggeredPlay = false;
            window.renderDualPlaylistTheater();
            if (showNotice && typeof showToast === 'function') {
                showToast(`✅ 同步成功！已获取 ${updatedCount} 个真实视频。`);
            }
        } else if (showNotice) {
            // 如果B站风控拦截了自动抓取，直接弹出管理员“3秒批量导入器”引导
            if (isPlaylistAdmin()) {
                openBatchImportModal();
            } else if (typeof showToast === 'function') {
                showToast('⚠️ B站接口开启了跨域保护，请管理员登录后使用「⚡ 批量导入真实列表」功能一键录入。');
            }
        }
    };

    // =========================================================================
    // 二、100% 不受B站风控限制的「⚡ 3秒批量导入列表真实视频」弹窗工具
    // =========================================================================
    function injectBatchImporterModal() {
        if (document.getElementById('bili-batch-import-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'bili-batch-import-modal';
        modal.setAttribute('data-no-edit', 'true');
        modal.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
        modal.innerHTML = `
            <div onclick="closeBatchImportModal()" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
            <div class="bg-gray-900 text-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <span class="px-2 py-0.5 bg-yp-lime text-gray-900 text-[10px] font-black rounded">100% 绕过B站风控拦截</span>
                        <h3 class="text-lg font-black mt-1">⚡ 3秒批量导入 B站播放列表真实视频</h3>
                    </div>
                    <button onclick="closeBatchImportModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div class="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
                    <div class="p-4 rounded-2xl bg-gray-800/90 border border-gray-700 space-y-2">
                        <div class="font-black text-yp-lime text-sm">💡 为什么需要一键导入？如何3秒搞定？</div>
                        <p class="text-gray-300 leading-relaxed">
                            由于B站官方服务器禁止外部网站跨域自动抓取空间列表，您只需按以下<strong>任一方法</strong>操作一次，即可将列表里的真实视频永久保存到官网中：
                        </p>
                        <div class="p-3 rounded-xl bg-gray-950 border border-gray-700 space-y-1.5">
                            <div class="font-bold text-amber-400">🚀 方法 A（最推荐 · 3秒全自动提取整列标题+BV号）：</div>
                            <p class="text-gray-300">1. 在电脑浏览器打开您的B站列表页（<a href="https://space.bilibili.com/4502039/lists/2012662" target="_blank" class="text-pink-400 underline">点此打开列表 2012662</a> 或 <a href="https://space.bilibili.com/4502039/lists/3469448" target="_blank" class="text-pink-400 underline">点此打开列表 3469448</a>）。</p>
                            <p class="text-gray-300">2. 在B站页面按下键盘 <strong>F12</strong> 打开控制台 (Console)，点击下方按钮复制提取指令，粘贴到B站控制台按回车，然后将输出的内容粘贴到下方输入框即可！</p>
                            <button type="button" onclick="copyBiliExtractorScript()" class="mt-1 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-lg transition">
                                📋 点击复制「B站列表一键提取指令」
                            </button>
                        </div>
                        <div class="p-3 rounded-xl bg-gray-950 border border-gray-700">
                            <div class="font-bold text-yp-lime">✨ 方法 B（直接粘贴视频链接或网页文字）：</div>
                            <p class="text-gray-300 mt-0.5">您也可以直接把B站视频的网址（如 <code>https://www.bilibili.com/video/BV1xx...</code>，支持一次粘贴多条）或带BV号的文字粘贴到下方框内，系统会自动识别所有BV号并自动匹配标题！</p>
                        </div>
                    </div>

                    <form onsubmit="handleBatchImportSubmit(event)" class="space-y-3">
                        <div class="flex items-center justify-between">
                            <label class="font-bold text-gray-200">选择要导入的目标播放列表：</label>
                            <select id="batch-target-list" class="rounded-xl bg-gray-800 border border-gray-700 px-3 py-1.5 text-white font-bold">
                                <option value="${LIST_ID_1}">导入到：播放列表 01 (#2012662)</option>
                                <option value="${LIST_ID_2}">导入到：播放列表 02 (#3469448)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-gray-200 mb-1">在此粘贴提取出的 JSON、或多条B站视频链接 / BV号 / 网页源码：</label>
                            <textarea id="batch-import-textarea" required rows="5" placeholder="支持格式1：直接粘贴多条B站视频链接，例如：\nhttps://www.bilibili.com/video/BV1xxxxxx 后跟标题\n\n支持格式2：粘贴 方法A 提取出的 JSON 数据..." class="w-full rounded-xl bg-gray-950 border border-gray-700 p-3 text-white font-mono text-xs"></textarea>
                        </div>

                        <div class="flex items-center justify-between pt-2">
                            <label class="flex items-center space-x-2 text-gray-300 cursor-pointer">
                                <input type="checkbox" id="batch-replace-mode" checked class="rounded text-yp-green">
                                <span>覆盖当前列表旧视频（勾选则清空旧列表，不勾选则追加在最前面）</span>
                            </label>
                            <button type="submit" class="px-6 py-3 bg-yp-lime hover:bg-white text-gray-900 font-black rounded-xl shadow transition">
                                ⚡ 立即解析并导入视频
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.openBatchImportModal = function (defaultListId) {
        injectBatchImporterModal();
        if (defaultListId) {
            const sel = document.getElementById('batch-target-list');
            if (sel) sel.value = String(defaultListId);
        } else {
            const state = getPlaylistsState();
            const sel = document.getElementById('batch-target-list');
            if (sel) sel.value = state.activeListId || LIST_ID_1;
        }
        document.getElementById('bili-batch-import-modal').classList.remove('hidden');
    };

    window.closeBatchImportModal = function () {
        const m = document.getElementById('bili-batch-import-modal');
        if (m) m.classList.add('hidden');
    };

    // 复制在B站列表页 F12 控制台运行的1行提取指令
    window.copyBiliExtractorScript = function () {
        const scriptCode = `copy(JSON.stringify(Array.from(document.querySelectorAll('a[href*="/video/BV"]')).reduce((acc,a)=>{const m=a.href.match(/BV[a-zA-Z0-9]{10}/);if(m&&!acc.some(x=>x.bvid===m[0])){const t=(a.title||a.innerText||'').trim();if(t&&! /^\\d+:\\d+$/.test(t))acc.push({bvid:m[0],title:t.split('\\n')[0]});}return acc;},[])));alert('已成功提取当前列表所有视频并复制到剪贴板！请回到车队官网粘贴导入！');`;
        navigator.clipboard.writeText(scriptCode);
        if (typeof showToast === 'function') {
            showToast('📋 提取指令已复制！请去B站列表页按 F12 打开 Console 粘贴并按回车！');
        }
    };

    // 智能解析管理员粘贴的 JSON / 多行链接 / 网页源码
    window.handleBatchImportSubmit = async function (e) {
        e.preventDefault();
        if (!isPlaylistAdmin()) return;
        const targetId = document.getElementById('batch-target-list').value;
        const rawText = document.getElementById('batch-import-textarea').value.trim();
        const replaceMode = document.getElementById('batch-replace-mode').checked;
        if (!rawText) return;

        let extracted = [];

        // 1. 尝试直接作为 JSON 数组解析
        if (rawText.startsWith('[')) {
            try {
                const arr = JSON.parse(rawText);
                if (Array.isArray(arr)) {
                    extracted = arr.filter(x => x && x.bvid).map(x => ({
                        bvid: x.bvid,
                        title: x.title || `车队视频 (${x.bvid})`,
                        duration: x.duration || ''
                    }));
                }
            } catch (err) {}
        }

        // 2. 如果不是 JSON，则按行或全局正则智能提取所有 BV 号及同行标题
        if (extracted.length === 0) {
            const lines = rawText.split(/\r?\n/);
            const seen = new Set();
            for (const line of lines) {
                const bvMatch = line.match(/(BV[a-zA-Z0-9]{10})/i);
                if (bvMatch) {
                    const bvid = bvMatch[1];
                    if (seen.has(bvid)) continue;
                    seen.add(bvid);
                    // 把URL和BV号剥离后剩下的文字作为标题
                    let cleanTitle = line
                        .replace(/https?:\/\/[^\s]+/gi, '')
                        .replace(new RegExp(bvid, 'gi'), '')
                        .replace(/【bilibili】|_哔哩哔哩_bilibili/gi, '')
                        .trim();
                    extracted.push({
                        bvid: bvid,
                        title: cleanTitle || '',
                        duration: ''
                    });
                }
            }
        }

        if (extracted.length === 0) {
            if (typeof showToast === 'function') showToast('❌ 未在粘贴内容中识别到有效的 BV 号（如 BV1xx...），请检查后重试！');
            return;
        }

        // 如果有未填标题的 BV 号，自动尝试联网补齐该 BV 号在 B 站上的真实标题
        for (const item of extracted) {
            if (!item.title) {
                const meta = await fetchSingleVideoMeta(item.bvid);
                if (meta && meta.title) {
                    item.title = meta.title;
                    item.duration = meta.duration || '';
                } else {
                    item.title = `青年力量发展车队视频 (${item.bvid})`;
                }
            }
        }

        const state = getPlaylistsState();
        state.activeListId = targetId;
        if (replaceMode) {
            state.lists[targetId].episodes = extracted;
        } else {
            state.lists[targetId].episodes = [...extracted, ...state.lists[targetId].episodes];
        }
        currentPlayingEpisodeIndex = 0;
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.closeBatchImportModal();
        window.renderDualPlaylistTheater();
        if (typeof showToast === 'function') {
            showToast(`✅ 成功导入 ${extracted.length} 个真实B站视频到列表 #${targetId}！`);
        }
    };

    // =========================================================================
    // 三、渲染「单一活跃实例」双播放列表剧场窗口（100% 真实视频内嵌播放）
    // =========================================================================
    function extractBvidOrAid(inputStr) {
        const s = (inputStr || '').trim();
        const bvMatch = s.match(/(BV[a-zA-Z0-9]{10})/i);
        if (bvMatch) return { type: 'bvid', id: bvMatch[1] };
        const avMatch = s.match(/av(\d+)/i);
        if (avMatch) return { type: 'aid', id: avMatch[1] };
        return { type: 'url', id: s };
    }

    function buildPlayerIframeHtml(ep, currentList, isActiveContainer) {
        if (!isActiveContainer) {
            return `
                <div class="w-full h-[420px] sm:h-[480px] bg-gray-950 flex items-center justify-center text-gray-500 text-xs">
                    <span>视频窗口待命</span>
                </div>
            `;
        }

        const isAdmin = isPlaylistAdmin();

        // 当列表中还没有录入具体分集时，绝不乱播无关视频，而是清晰提示并提供一键导入/观看入口
        if (!ep) {
            return `
                <div class="w-full h-[420px] sm:h-[480px] bg-gray-950 flex flex-col items-center justify-center text-gray-300 p-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-pink-500/20 border border-pink-400/40 flex items-center justify-center mb-4">
                        <i class="fa-brands fa-bilibili text-3xl text-pink-400"></i>
                    </div>
                    <h4 class="text-lg font-black text-white mb-2">${currentList.name}</h4>
                    <p class="text-xs text-gray-400 max-w-md leading-relaxed mb-6">
                        当前列表（<code>${currentList.url}</code>）暂未在本地录入分集BV号。您可点击下方按钮直接前往B站观看该列表，或由管理员一键导入全部视频在此窗口内直接播放！
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        <a href="${currentList.url}" target="_blank" class="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-black rounded-xl transition shadow flex items-center space-x-1.5">
                            <i class="fa-brands fa-bilibili"></i>
                            <span>打开B站观看此播放列表 (#${currentList.id}) &nearr;</span>
                        </a>
                        ${isAdmin ? `
                            <button onclick="openBatchImportModal('${currentList.id}')" class="px-5 py-2.5 bg-yp-lime hover:bg-white text-gray-900 text-xs font-black rounded-xl transition shadow">
                                ⚡ 管理员：3秒批量导入此列表视频
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

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
                            ${isAdmin ? `
                                <button onclick="openBatchImportModal('${activeId}')" class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-black transition shadow flex items-center space-x-1">
                                    <i class="fa-solid fa-bolt"></i>
                                    <span>⚡ 批量导入真实列表视频</span>
                                </button>
                            ` : ''}
                            <button onclick="syncBilibiliPlaylistsFromCloud(true)" class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-yp-green border border-gray-700 text-yp-lime hover:text-white font-bold transition">
                                <i class="fa-solid fa-rotate mr-1"></i>尝试同步列表
                            </button>
                            <a href="${currentList.url}" target="_blank" class="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black transition flex items-center space-x-1.5 shadow">
                                <i class="fa-brands fa-bilibili"></i>
                                <span>B站原列表 (#${activeId}) &nearr;</span>
                            </a>
                        </div>
                    </div>

                    <!-- 两个播放列表选择切换按钮 (2012662 & 3469448) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <button onclick="selectBiliPlaylist('${LIST_ID_1}')" class="text-left p-4 rounded-2xl border-2 transition flex items-center justify-between group ${activeId === LIST_ID_1 ? 'bg-yp-darkGreen/30 border-yp-lime shadow-lg' : 'bg-gray-800/70 border-gray-700 hover:border-gray-500'}">
                            <div class="pr-3">
                                <div class="flex items-center space-x-2">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black ${activeId === LIST_ID_1 ? 'bg-yp-lime text-gray-900' : 'bg-gray-700 text-gray-300'}">播放列表 01 · ID: 2012662</span>
                                    <span class="text-[11px] text-gray-400">已收录 ${state.lists[LIST_ID_1].episodes.length} 集</span>
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
                                    <span class="text-[11px] text-gray-400">已收录 ${state.lists[LIST_ID_2].episodes.length} 集</span>
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
                            ${buildPlayerIframeHtml(currentEp, currentList, isActiveContainer)}
                        </div>
                        <div class="p-4 sm:p-5 bg-gray-900 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div class="text-xs text-yp-lime font-bold">当前播放 (${currentList.name})：</div>
                                <div class="text-base font-black text-white mt-0.5">${currentEp ? `${currentEp.title} (${currentEp.bvid})` : '等待选择或添加视频分集'}</div>
                            </div>
                            <form onsubmit="handleQuickPlayInput(event, '${containerKey}')" class="flex items-center space-x-2 text-xs">
                                <input type="text" id="quick-bv-input-${containerKey}" placeholder="粘贴B站视频网址或BV号立即播..." class="w-52 sm:w-64 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white">
                                <button type="submit" class="px-3.5 py-2 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl transition shrink-0">直接播放</button>
                            </form>
                        </div>
                    </div>

                    <div class="lg:col-span-4 flex flex-col h-[480px] sm:h-[556px] bg-gray-900/90">
                        <div class="p-4 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <div class="text-sm font-black text-white">📋 列表选集 (${episodes.length})</div>
                                <div class="text-[11px] text-gray-400">点击分集直接在左侧窗口内播放</div>
                            </div>
                            <a href="${currentList.url}" target="_blank" class="text-xs text-pink-400 hover:underline font-bold">B站原列表 &rarr;</a>
                        </div>

                        <div class="flex-1 overflow-y-auto p-3 space-y-2">
                            ${episodes.length === 0 ? `
                                <div class="text-center py-12 px-4 text-gray-500 text-xs space-y-3">
                                    <div>暂未录入分集</div>
                                    ${isAdmin ? `
                                        <button onclick="openBatchImportModal('${activeId}')" class="px-3.5 py-2 bg-amber-400 text-gray-900 font-black rounded-xl shadow">
                                            ⚡ 点击批量导入 #${activeId} 的视频
                                        </button>
                                    ` : ''}
                                </div>
                            ` : episodes.map((ep, idx) => {
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

                <!-- 管理员底部快捷添加与管理栏 -->
                ${isAdmin ? `
                    <div class="p-5 bg-gray-950 border-t-2 border-yp-lime text-xs space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 bg-yp-lime text-gray-900 font-black rounded text-[10px]">管理员 · 播放列表管理 (#${activeId})</span>
                                <span class="font-bold text-gray-300">添加单个视频（不填标题将自动从B站识别真实标题）或点击右上角批量导入：</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <button onclick="openBatchImportModal('${activeId}')" class="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-lg">
                                    ⚡ 批量导入列表视频
                                </button>
                                <button onclick="renameCurrentBiliPlaylist()" class="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-amber-400 font-bold rounded-lg">
                                    ✏️ 修改列表名称
                                </button>
                                <button onclick="toggleTheaterOnHome()" class="px-3 py-1 rounded-lg font-bold border ${state.showOnHome ? 'bg-yp-green/20 border-yp-lime text-yp-lime' : 'bg-gray-800 border-gray-700 text-gray-400'}">
                                    ${state.showOnHome ? '🏠 首页显示：开启' : '🏠 首页显示：关闭'}
                                </button>
                            </div>
                        </div>
                        <form onsubmit="adminAddEpisodeToCurrentList(event, '${containerKey}')" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <input type="text" id="admin-ep-bv-${containerKey}" required placeholder="粘贴B站视频链接 (https://www.bilibili.com/video/BV...) 或 BV号 *" class="sm:col-span-6 rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white">
                            <input type="text" id="admin-ep-title-${containerKey}" placeholder="视频标题（选填，留空将自动从B站获取真实标题）" class="sm:col-span-4 rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white">
                            <button type="submit" class="sm:col-span-2 py-2 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl transition">
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

        const galleryPage = document.getElementById('page-gallery');
        if (galleryPage) {
            const oldBox = galleryPage.querySelector('#bili-quick-url-input')?.closest('.bg-gray-900.text-white.rounded-3xl');
            if (oldBox) {
                oldBox.innerHTML = '';
                oldBox.classList.add('hidden');
            }
            let galleryTheater = document.getElementById('yp-dual-playlist-gallery');
            if (!galleryTheater) {
                galleryTheater = document.createElement('div');
                galleryTheater.id = 'yp-dual-playlist-gallery';
                galleryTheater.className = 'mb-12';
                const colSec = document.getElementById('collections-section');
                if (colSec) galleryPage.insertBefore(galleryTheater, colSec);
                else galleryPage.appendChild(galleryTheater);
            }
            galleryTheater.innerHTML = generateTheaterHtml('gallery', activePage === 'gallery');
        }

        const homePage = document.getElementById('page-home');
        if (homePage) {
            let homeTheater = document.getElementById('yp-dual-playlist-home');
            if (!homeTheater) {
                homeTheater = document.createElement('section');
                homeTheater.id = 'yp-dual-playlist-home';
                homeTheater.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12';
                const heroSec = homePage.querySelector('section.hero-bg');
                if (heroSec && heroSec.nextSibling) homePage.insertBefore(homeTheater, heroSec.nextSibling);
                else homePage.appendChild(homeTheater);
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
    // 四、交互与添加分集函数
    // =========================================================================
    window.selectBiliPlaylist = function (listId) {
        const state = getPlaylistsState();
        state.activeListId = String(listId);
        currentPlayingEpisodeIndex = 0;
        userTriggeredPlay = false;
        savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    window.playBiliEpisode = function (index) {
        currentPlayingEpisodeIndex = index;
        userTriggeredPlay = true;
        window.renderDualPlaylistTheater();
    };

    window.handleQuickPlayInput = async function (e, containerKey) {
        e.preventDefault();
        const input = document.getElementById(`quick-bv-input-${containerKey}`);
        if (!input || !input.value.trim()) return;
        const raw = input.value.trim();
        const parsed = extractBvidOrAid(raw);

        let title = `点播视频 (${parsed.id})`;
        let dur = '';
        if (parsed.type === 'bvid') {
            const meta = await fetchSingleVideoMeta(parsed.id);
            if (meta && meta.title) {
                title = meta.title;
                dur = meta.duration;
            }
        }

        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        state.lists[activeId].episodes.unshift({ bvid: parsed.id, title, duration: dur });
        currentPlayingEpisodeIndex = 0;
        userTriggeredPlay = true;
        if (isPlaylistAdmin()) savePlaylistsState(state);
        window.renderDualPlaylistTheater();
    };

    window.adminAddEpisodeToCurrentList = async function (e, containerKey) {
        e.preventDefault();
        if (!isPlaylistAdmin()) return;
        const bvRaw = document.getElementById(`admin-ep-bv-${containerKey}`)?.value.trim();
        let title = document.getElementById(`admin-ep-title-${containerKey}`)?.value.trim() || '';
        if (!bvRaw) return;

        const parsed = extractBvidOrAid(bvRaw);
        let dur = '';
        if (!title && parsed.type === 'bvid') {
            if (typeof showToast === 'function') showToast('🔍 正在自动识别该B站视频的真实标题...');
            const meta = await fetchSingleVideoMeta(parsed.id);
            if (meta && meta.title) {
                title = meta.title;
                dur = meta.duration || '';
            }
        }
        if (!title) title = `车队精选视频 (${parsed.id})`;

        const state = getPlaylistsState();
        const activeId = state.activeListId || LIST_ID_1;
        state.lists[activeId].episodes.unshift({ bvid: parsed.id, title, duration: dur });
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
        if (currentPlayingEpisodeIndex >= state.lists[activeId].episodes.length) currentPlayingEpisodeIndex = 0;
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
        const newName = prompt(`请输入播放列表 #${activeId} 的新显示名称：`, state.lists[activeId].name);
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
    // 五、初始化挂载
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            injectBatchImporterModal();
            window.renderDualPlaylistTheater();
            window.syncBilibiliPlaylistsFromCloud(false);
        }, 150);

        const prevSwitchPage = window.switchPage;
        if (prevSwitchPage) {
            window.switchPage = function (pageId) {
                userTriggeredPlay = false;
                prevSwitchPage(pageId);
                window.renderDualPlaylistTheater();
            };
        }

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                window.renderDualPlaylistTheater();
            };
        }
    });
})();
