/**
 * 青年力量洲际队官网 - 外部扩展与内容更新文件 (custom-update.js)
 * 说明：直接在此文件中添加车手、商品、公告或新页面，无需修改 index.html 主文件！
 */

window.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 功能 1：直接新增商城器材（会自动追加到官方商城里）
    // =========================================================================
    if (typeof products !== 'undefined') {
        products.push(
            {
                id: 201,
                category: 'spect', // 分类可选：'spect'(空力公式), 'elves'(精灵), 'helmet'(头盔), 'pedal'(锁踏)
                brand: '静藤轮组',
                name: '静藤 50mm 碳纤维真空胎公路轮组 (车队出海合作款)',
                desc: '哥伦比亚与西班牙车店热销同款，高刚性碳辐条/钢辐条可选。',
                price: 3999,
                badge: '新品上架',
                icon: 'fa-compact-disc'
            }
            // 以后还要加新商品，直接在这里按相同格式往下复制即可
        );
        // 重新渲染商城列表
        renderProducts('all');
    }


    // =========================================================================
    // 功能 2：直接新增或修改 2027 赛季队员介绍（支持直接填入照片路径）
    // =========================================================================
    if (typeof defaultRoster !== 'undefined') {
        // 示例 A：给现有的车手（比如徐核）直接绑定同文件夹下的照片
        const xuhe = defaultRoster.find(r => r.id === 'xuhe');
        if (xuhe) {
            // 只要您把照片命名为 xuhe.jpg 放在同一个文件夹里，取消下面这行的注释就能显示：
            // xuhe.photo = 'images/xuhe.jpg'; 
        }

        // 示例 B：如果后续新签约了车手，直接 push 进去即可（如需启用请取消注释）
        /*
        defaultRoster.push({
            id: 'new_rider_01',
            role_zh: '外籍青训车手',
            role_en: 'U23 Continental Rider',
            role_es: 'Corredor Sub-23',
            name: 'Carlos Gómez',
            flag: '🇨🇴',
            ageSpec: '19岁 · 哥伦比亚 · 爬坡手',
            highlight: '哥伦比亚青年赛前十名 | 2027新晋签约车手',
            bio: '这里是新车手的详细介绍文字...',
            photo: 'images/carlos.jpg' // 照片路径
        });
        */
        renderRoster();
    }


    // =========================================================================
    // 功能 3：直接新增「车队风采 Gallery」照片
    // =========================================================================
    if (typeof defaultGallery !== 'undefined') {
        /* 取消注释即可批量添加相册图片：
        defaultGallery.unshift({
            id: Date.now(),
            title: '2027青年力量洲际队新赛季战车定妆照',
            tag: '器材展示',
            url: 'images/team-bike-2027.jpg' // 可以填本地图片路径或网络图片链接
        });
        renderGallery();
        */
    }


    // =========================================================================
    // 功能 4：在不改 index.html 的情况下，动态增加一个全新的导航栏按钮和独立子页面！
    // （例如：未来想增加一个“赛事战报”或“合作伙伴”独立页面）
    // =========================================================================
    function addNewCustomPage(pageId, navTitle, pageHtmlContent) {
        // 1. 往桌面端和移动端导航栏自动插入新按钮
        const desktopNav = document.querySelector('header nav.hidden.xl\\:flex');
        const mobileNav = document.querySelector('header div.xl\\:hidden.flex');

        if (desktopNav) {
            const btn = document.createElement('button');
            btn.setAttribute('onclick', `switchPage('${pageId}')`);
            btn.setAttribute('data-target', pageId);
            btn.className = 'nav-btn px-3 py-2 rounded-lg text-gray-700 hover:text-yp-darkGreen transition';
            btn.innerHTML = navTitle;
            desktopNav.appendChild(btn);
        }

        if (mobileNav) {
            const mBtn = document.createElement('button');
            mBtn.setAttribute('onclick', `switchPage('${pageId}')`);
            mBtn.setAttribute('data-target', pageId);
            mBtn.className = 'nav-btn px-3 py-1.5 rounded-md text-gray-700';
            mBtn.innerHTML = navTitle;
            mobileNav.appendChild(mBtn);
        }

        // 2. 往主内容区自动插入新页面的 HTML 结构
        const mainContainer = document.getElementById('editable-main');
        if (mainContainer) {
            const sec = document.createElement('div');
            sec.id = 'page-' + pageId;
            sec.className = 'page-section py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
            sec.innerHTML = pageHtmlContent;
            mainContainer.appendChild(sec);
        }
    }
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
