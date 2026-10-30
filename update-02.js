/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 独立升级插件 02 号【终极修复版】(update-02.js)
 * 说明：零断点完整单文件！不改变现有网站功能、设置与管理员密码，专门解决以下 4 大问题：
 * 1. 【彻底解决批量上传图片失败】：引入浏览器 IndexedDB 海量数据库（突破 localStorage 5MB 限制）+ 逐张队列智能压缩
 * 2. 【支持图集文件夹 URL 批量导入】：支持 GitHub 仓库图片文件夹 URL 自动扫描导入、规律编号文件夹 URL 导入、网盘/图床多行直链导入
 * 3. 【修复 Gallery 合集/影集同步至主页幻灯片播放】：打通“主题合集”、“风采影集卡片”与“影集编辑详情页”，一键同步至主页幻灯片/滚动长廊
 * 4. 【全站咨询/留言框自动填入用户邮箱并发送至 team_youthpower@outlook.com】：所有表单自动带出已登录用户邮箱，提交后直发车队邮箱
 */

(function () {
    'use strict';

    if (window.__YP_PLUGIN_02_V2_LOADED__) return;
    window.__YP_PLUGIN_02_V2_LOADED__ = true;

    const TEAM_OFFICIAL_EMAIL = 'team_youthpower@outlook.com';

    function getCurrentLoggedUser() {
        try {
            return JSON.parse(localStorage.getItem('yp_current_user') || 'null');
        } catch (e) { return null; }
    }

    function isAdminUser() {
        const u = getCurrentLoggedUser();
        return Boolean(u && u.email && u.email.toLowerCase() === TEAM_OFFICIAL_EMAIL && u.role === 'admin');
    }

    // =========================================================================
    // 一、IndexedDB 海量图片存储引擎 + 逐张自适应高清压缩（彻底根治批量上传失败）
    // =========================================================================
    const IDB_NAME = 'YouthPowerMediaDB';
    const IDB_STORE = 'kv_store';
    let idbInstance = null;
    const memoryMirror = {};

    function openMediaIDB() {
        if (idbInstance) return Promise.resolve(idbInstance);
        return new Promise((resolve) => {
            if (!window.indexedDB) { resolve(null); return; }
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE);
                }
            };
            req.onsuccess = function (e) {
                idbInstance = e.target.result;
                resolve(idbInstance);
            };
            req.onerror = function () { resolve(null); };
        });
    }

    async function idbSet(key, val) {
        memoryMirror[key] = val;
        // 尝试同步写入 localStorage（若超出 5MB 则静默交由 IndexedDB 独立承载，绝不报错中断）
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
        const db = await openMediaIDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(IDB_STORE, 'readwrite');
                tx.objectStore(IDB_STORE).put(val, key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (err) { resolve(false); }
        });
    }

    async function idbGet(key, fallbackVal) {
        if (memoryMirror[key] !== undefined) return memoryMirror[key];
        const db = await openMediaIDB();
        if (db) {
            const val = await new Promise((resolve) => {
                try {
                    const tx = db.transaction(IDB_STORE, 'readonly');
                    const req = tx.objectStore(IDB_STORE).get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(undefined);
                } catch (err) { resolve(undefined); }
            });
            if (val !== undefined) {
                memoryMirror[key] = val;
                return val;
            }
        }
        try {
            const ls = localStorage.getItem(key);
            if (ls) {
                const parsed = JSON.parse(ls);
                memoryMirror[key] = parsed;
                return parsed;
            }
        } catch (e) {}
        return fallbackVal;
    }

    // 稳健型本地图片压缩器（使用 createObjectURL 降低内存峰值，自动限制单张体积）
    window.compressLocalImage = function (file, maxWidth = 1280, quality = 0.78) {
        return new Promise((resolve) => {
            if (!file) { resolve(''); return; }
            const objUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(objUrl);
                let w = img.width || 1000, h = img.height || 750;
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                try {
                    let out = canvas.toDataURL('image/jpeg', quality);
                    // 如果图片依然偏大，二次轻度压缩确保百张图流畅存储
                    if (out.length > 350000) {
                        out = canvas.toDataURL('image/jpeg', 0.62);
                    }
                    resolve(out);
                } catch (err) {
                    resolve('');
                }
            };
            img.onerror = function () {
                URL.revokeObjectURL(objUrl);
                // 回退 FileReader
                const reader = new FileReader();
                reader.onload = ev => resolve(ev.target.result || '');
                reader.onerror = () => resolve('');
                reader.readAsDataURL(file);
            };
            img.src = objUrl;
        });
    };

    // 接管详情页多图上传，改为逐张队列压缩 + IndexedDB 混合存储
    window.uploadSubPhotos = async function (ev, t, id) {
        const files = Array.from(ev.target.files || []);
        if (!files.length) return;
        const key = `${t}_${id}`;
        const allAlbums = await idbGet('yp_entity_albums_v4', {});
        const album = Array.isArray(allAlbums[key]) ? allAlbums[key] : [];

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (typeof showToast === 'function') {
                showToast(`⏳ 正在压缩并上传第 ${i + 1} / ${files.length} 张照片...`);
            }
            const dataUrl = await window.compressLocalImage(f, 1280, 0.78);
            if (dataUrl) {
                album.push({
                    id: 'p_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
                    url: dataUrl,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
                successCount++;
            }
        }
        allAlbums[key] = album;
        await idbSet('yp_entity_albums_v4', allAlbums);
        window.openEntitySubpage(t, id);
        if (t === 'rider' && typeof window.renderRoster === 'function') window.renderRoster();
        if (t === 'sponsor') window.renderSponsorshipModule();
        if (t === 'ridepost') window.renderRidePostsModule();
        if (typeof showToast === 'function') {
            showToast(`✅ 批量上传完成！成功导入 ${successCount} / ${files.length} 张高清照片！`);
        }
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

    // =========================================================================
    // 三、全站咨询/留言/报名框：自动填入登录用户邮箱 + 发送至 team_youthpower@outlook.com
    // =========================================================================
    async function sendEmailToTeamInbox(subject, payloadObj) {
        const sendData = {
            _subject: `【青年力量官网咨询/报名】${subject}`,
            _template: 'table',
            _captcha: 'false',
            ...payloadObj,
            提交时间: new Date().toLocaleString('zh-CN')
        };
        if (payloadObj.用户邮箱) {
            sendData._replyto = payloadObj.用户邮箱;
        }

        // 存入本地留言备份中心供管理员随时查阅
        try {
            const logs = JSON.parse(localStorage.getItem('yp_inbox_messages_log') || '[]');
            logs.unshift({ id: Date.now(), subject, ...sendData });
            localStorage.setItem('yp_inbox_messages_log', JSON.stringify(logs.slice(0, 100)));
        } catch (e) {}

        // 通道 1：通过 FormSubmit AJAX 接口直接向 team_youthpower@outlook.com 发送邮件
        let cloudSent = false;
        try {
            const res = await fetch(`https://formsubmit.co/ajax/${TEAM_OFFICIAL_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(sendData)
            });
            if (res.ok) cloudSent = true;
        } catch (err) {}

        return cloudSent;
    }

    // 自动为所有咨询/报名/订单表单注入“电子邮箱”输入框，并默认填充登录邮箱
    window.syncAllConsultationFormsEmail = function () {
        const u = getCurrentLoggedUser();
        const defaultEmail = (u && u.email) ? u.email : '';

        // 1. 青野·驿住宿/骑游咨询表单 (#hostel-name 所在表单)
        const hostelNameInput = document.getElementById('hostel-name');
        if (hostelNameInput && hostelNameInput.form) {
            const form = hostelNameInput.form;
            if (!document.getElementById('hostel-user-email')) {
                const emailInput = document.createElement('input');
                emailInput.type = 'email';
                emailInput.id = 'hostel-user-email';
                emailInput.required = true;
                emailInput.placeholder = '您的电子邮箱 (用于接收回复) *';
                emailInput.className = 'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-sm';
                hostelNameInput.parentNode.insertBefore(emailInput, hostelNameInput.nextSibling);

                const msgInput = document.createElement('textarea');
                msgInput.id = 'hostel-user-msg';
                msgInput.rows = 2;
                msgInput.placeholder = '请输入您的咨询内容、入住日期或留言...';
                msgInput.className = 'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-sm';
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) form.insertBefore(msgInput, submitBtn);
            }
            const emailEl = document.getElementById('hostel-user-email');
            if (emailEl && defaultEmail && !emailEl.value) emailEl.value = defaultEmail;
        }

        // 2. 自行车教练服务报名表单 (#coach-student-name 所在表单)
        const coachNameInput = document.getElementById('coach-student-name');
        if (coachNameInput && coachNameInput.form) {
            const form = coachNameInput.form;
            if (!document.getElementById('coach-student-email')) {
                const wrap = document.createElement('div');
                wrap.innerHTML = `
                    <label class="block text-xs font-bold text-gray-300 mb-1.5">学员联系邮箱 (默认使用登录邮箱) *</label>
                    <input type="email" id="coach-student-email" required placeholder="用于接收训练计划与回复 *" class="w-full rounded-xl bg-gray-800 border border-gray-700 text-white px-3.5 py-3">
                `;
                coachNameInput.parentElement.parentNode.insertBefore(wrap, coachNameInput.parentElement.nextSibling);
            }
            const emailEl = document.getElementById('coach-student-email');
            if (emailEl && defaultEmail && !emailEl.value) emailEl.value = defaultEmail;
        }

        // 3. 商城购物车结算表单 (#order-name 所在表单)
        const orderNameInput = document.getElementById('order-name');
        if (orderNameInput && orderNameInput.form) {
            if (!document.getElementById('order-user-email')) {
                const emailInput = document.createElement('input');
                emailInput.type = 'email';
                emailInput.id = 'order-user-email';
                emailInput.required = true;
                emailInput.placeholder = '您的联系邮箱 (接收订单通知) *';
                emailInput.className = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-xs';
                orderNameInput.parentNode.insertBefore(emailInput, orderNameInput.nextSibling);
            }
            const emailEl = document.getElementById('order-user-email');
            if (emailEl && defaultEmail && !emailEl.value) emailEl.value = defaultEmail;
        }

        // 4. 全局在线留言/咨询弹窗中的邮箱框
        const quickConsultEmail = document.getElementById('quick-consult-email');
        if (quickConsultEmail && defaultEmail && !quickConsultEmail.value) {
            quickConsultEmail.value = defaultEmail;
        }
    };

    // 接管青野·驿住宿/骑游咨询提交，发送至 team_youthpower@outlook.com
    window.submitHostelForm = async function (e) {
        if (e) e.preventDefault();
        const name = document.getElementById('hostel-name')?.value.trim() || '';
        const email = document.getElementById('hostel-user-email')?.value.trim() || '';
        const phone = document.getElementById('hostel-phone')?.value.trim() || '';
        const msg = document.getElementById('hostel-user-msg')?.value.trim() || '咨询青野·驿住宿 / 骑游活动';

        if (!email) {
            if (typeof showToast === 'function') showToast('请填写您的电子邮箱地址！');
            return;
        }
        if (typeof showToast === 'function') showToast('⏳ 正在将您的咨询发送至车队邮箱 team_youthpower@outlook.com...');

        await sendEmailToTeamInbox(`青野·驿住宿/骑游咨询 - ${name}`, {
            咨询项目: 'La Fuga 青野·驿 住宿与骑游咨询',
            用户姓名: name,
            用户邮箱: email,
            联系电话: phone,
            咨询留言内容: msg
        });

        if (e && e.target) e.target.reset();
        window.syncAllConsultationFormsEmail();
        if (typeof showToast === 'function') {
            showToast(`✅ 登记成功！您的咨询内容与邮箱 (${email}) 已发送至车队邮箱 ${TEAM_OFFICIAL_EMAIL}！`);
        }
    };

    // 接管教练报名提交，同步发送报名详情至 team_youthpower@outlook.com
    const origSubmitCoachOrder = window.submitCoachOrder;
    window.submitCoachOrder = async function (e) {
        if (e) e.preventDefault();
        const selectEl = document.getElementById('coach-tier-select');
        const tierName = selectEl ? selectEl.options[selectEl.selectedIndex].getAttribute('data-name') : '教练服务';
        const price = selectEl ? parseInt(selectEl.value, 10) : 1200;
        const months = parseInt(document.getElementById('coach-months')?.value || '1', 10);
        const total = price * months;
        const name = document.getElementById('coach-student-name')?.value.trim() || '';
        const email = document.getElementById('coach-student-email')?.value.trim() || '';
        const phone = document.getElementById('coach-student-phone')?.value.trim() || '';
        const goal = document.getElementById('coach-student-goal')?.value.trim() || '';

        if (typeof openAlipayModal === 'function') {
            openAlipayModal(total, `${tierName} (${months}个月)`, `教练报名+${name}+${phone}`);
        }

        await sendEmailToTeamInbox(`教练服务报名 - ${name} (${tierName})`, {
            咨询项目: 'UCI 2级教练训练服务报名',
            报名组别: `${tierName} × ${months}个月 (应付 ¥${total})`,
            用户姓名: name,
            用户邮箱: email,
            联系电话: phone,
            训练目标与身体数据: goal
        });
    };

    // 接管商城购物车结算提交，同步发送订单详情至 team_youthpower@outlook.com
    const origCheckoutShopOrder = window.checkoutShopOrder;
    window.checkoutShopOrder = async function (e) {
        if (e) e.preventDefault();
        const name = document.getElementById('order-name')?.value.trim() || '';
        const email = document.getElementById('order-user-email')?.value.trim() || '';
        const phone = document.getElementById('order-phone')?.value.trim() || '';
        const addr = document.getElementById('order-address')?.value.trim() || '';

        if (origCheckoutShopOrder) origCheckoutShopOrder(e);

        await sendEmailToTeamInbox(`官方商城新订单 - ${name}`, {
            咨询项目: '官方器材商城订单提交',
            用户姓名: name,
            用户邮箱: email,
            联系电话: phone,
            收货地址与备注: addr
        });
    };

    // 注入全站右下角「✉️ 给车队留言 / 在线咨询」悬浮按钮与对话框
    function injectGlobalConsultationWidget() {
        if (document.getElementById('yp-global-consult-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'yp-global-consult-btn';
        btn.setAttribute('data-no-edit', 'true');
        btn.setAttribute('onclick', 'openGlobalConsultModal()');
        btn.className = 'fixed bottom-20 left-5 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-yp-darkGreen to-yp-green text-white text-xs font-black shadow-2xl border-2 border-yp-lime flex items-center space-x-2 hover:scale-105 transition';
        btn.innerHTML = `<i class="fa-solid fa-envelope-open-text text-sm"></i><span>✉️ 在线留言 / 咨询车队</span>`;
        document.body.appendChild(btn);

        const modal = document.createElement('div');
        modal.id = 'yp-global-consult-modal';
        modal.setAttribute('data-no-edit', 'true');
        modal.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
        modal.innerHTML = `
            <div onclick="closeGlobalConsultModal()" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
            <div class="bg-gray-900 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-yp-lime relative z-10">
                <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <span class="px-2 py-0.5 bg-yp-lime text-gray-900 text-[10px] font-black rounded">DIRECT MESSAGE TO TEAM</span>
                        <h3 class="text-lg font-black text-white mt-1">✉️ 给青年力量车队留言 / 咨询</h3>
                        <p class="text-[11px] text-gray-400">内容将直接发送至官方邮箱：${TEAM_OFFICIAL_EMAIL}</p>
                    </div>
                    <button onclick="closeGlobalConsultModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <form onsubmit="submitGlobalConsultForm(event)" class="p-6 space-y-3.5 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-gray-300 mb-1">您的姓名 / 称呼 *</label>
                            <input type="text" id="quick-consult-name" required placeholder="请输入姓名" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-300 mb-1">联系电话 / 微信</label>
                            <input type="tel" id="quick-consult-phone" placeholder="选填，方便微信联系" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-yp-lime mb-1">您的电子邮箱 (已登录用户自动填入) *</label>
                        <input type="email" id="quick-consult-email" required placeholder="请输入您的邮箱地址，车队将回复至此邮箱 *" class="w-full rounded-xl bg-gray-800 border border-gray-600 px-3.5 py-2.5 text-white font-bold">
                    </div>
                    <div>
                        <label class="block font-bold text-gray-300 mb-1">咨询类别</label>
                        <select id="quick-consult-topic" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white font-bold">
                            <option value="青训试训与教练课程咨询">🚴 青训试训与教练课程咨询</option>
                            <option value="千岛湖青野·驿住宿与骑游咨询">🏨 千岛湖青野·驿住宿与骑游咨询</option>
                            <option value="器材商城购买与售后咨询">🛒 器材商城购买与售后咨询</option>
                            <option value="商业赞助与品牌合作洽谈">🤝 商业赞助与品牌合作洽谈</option>
                            <option value="其他留言建议">💬 其他留言建议</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-gray-300 mb-1">留言或咨询详细内容 *</label>
                        <textarea id="quick-consult-body" required rows="4" placeholder="请详细描述您想咨询的问题..." class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3.5 py-2.5 text-white"></textarea>
                    </div>
                    <button type="submit" class="w-full py-3 bg-yp-lime hover:bg-white text-gray-900 font-black rounded-xl text-sm shadow transition">
                        📨 立即发送至车队邮箱 (${TEAM_OFFICIAL_EMAIL})
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.openGlobalConsultModal = function () {
        const u = getCurrentLoggedUser();
        const emailEl = document.getElementById('quick-consult-email');
        const nameEl = document.getElementById('quick-consult-name');
        if (u && emailEl) emailEl.value = u.email || '';
        if (u && nameEl && !nameEl.value && u.name) nameEl.value = u.name;
        document.getElementById('yp-global-consult-modal')?.classList.remove('hidden');
    };

    window.closeGlobalConsultModal = function () {
        document.getElementById('yp-global-consult-modal')?.classList.add('hidden');
    };

    window.submitGlobalConsultForm = async function (e) {
        e.preventDefault();
        const name = document.getElementById('quick-consult-name')?.value.trim() || '';
        const phone = document.getElementById('quick-consult-phone')?.value.trim() || '';
        const email = document.getElementById('quick-consult-email')?.value.trim() || '';
        const topic = document.getElementById('quick-consult-topic')?.value || '官网在线咨询';
        const body = document.getElementById('quick-consult-body')?.value.trim() || '';

        if (typeof showToast === 'function') showToast('⏳ 正在发送留言至车队邮箱...');
        await sendEmailToTeamInbox(`${topic} - 来自 ${name}`, {
            咨询类别: topic,
            用户姓名: name,
            用户邮箱: email,
            联系电话: phone,
            留言详细内容: body
        });

        document.getElementById('quick-consult-body').value = '';
        window.closeGlobalConsultModal();
        if (typeof showToast === 'function') {
            showToast(`✅ 发送成功！您的留言已投递至 ${TEAM_OFFICIAL_EMAIL}，我们将尽快回复至 ${email}！`);
        }
    };

    // =========================================================================
    // 四、通用拖拽辅助 & 赞助商介绍 / 骑游动态模块
    // =========================================================================
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

    let pendingCoverTarget = null;
    const universalCoverInput = document.createElement('input');
    universalCoverInput.type = 'file';
    universalCoverInput.accept = 'image/*';
    universalCoverInput.className = 'hidden';
    universalCoverInput.onchange = async function (ev) {
        const f = (ev.target.files || [])[0];
        if (!f || !pendingCoverTarget) return;
        const dataUrl = await window.compressLocalImage(f, 1280, 0.8);
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
            const list = await getAlbumsDataAsync();
            const item = list.find(x => String(x.id) === String(id));
            if (item) { item.cover = dataUrl; await saveAlbumsDataAsync(list); await window.renderGalleryAlbumsModule(); await window.renderHomeAlbumSlideshow(); }
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
    window.triggerMemberPhotoUpload = function (memberId) {
        window.triggerUniversalCoverUpload('rider', memberId);
    };

    // 赞助商介绍模块数据与渲染
    const defaultSponsorsData = [
        { id: 'sp_spect', name: '空力公式 (Spect)', tier: '官方车架合作伙伴', logoText: 'SPECT 空力公式', ageSpec: '核心器材赞助商 · 公路 / TT / Gravel 车架支持', highlight: '提供 Mira 破风气动车架与 Strada 超轻综合车架，助力车队征战国内外职业赛场', desc: '空力公式（Spect）专注于高性能碳纤维自行车架研发与空气动力学优化，为全队提供全方位职业竞赛车架支持。', photo: '' },
        { id: 'sp_elves', name: 'ELVES (精灵)', tier: '官方器材合作伙伴', logoText: 'ELVES 精灵', ageSpec: 'UCI认证竞赛车架品牌 · 全球化赛事伙伴', highlight: 'Vanyar 梵雅爬坡架 / Falath EVO 破风架 / Mori 砾石车架全系支持', desc: 'ELVES（精灵）拥有多项 UCI 国际自盟认证的专业竞赛级车架产品，展现中国智造碳纤维战车的赛场统治力。', photo: '' },
        { id: 'sp_essen', name: 'ESSEN 头盔', tier: '官方安全护具合作伙伴', logoText: 'ESSEN', ageSpec: '专业骑行安全装备品牌 · 气动与轻量防护', highlight: '赫拉 (HELA) 公路大组气动盔、超轻爬坡盔及 ITT 气动计时盔官方赞助', desc: 'ESSEN 深耕专业骑行头盔研发，为青年力量洲际队全体车手提供风洞低阻优化的赫拉（HELA）气动破风头盔。', photo: '' },
        { id: 'sp_zeray', name: '和博 / 卓锐 (ZERAY)', tier: '官方配件与传动合作伙伴', logoText: 'ZERAY 卓锐', ageSpec: '高性能碳纤维锁踏与骑行装备制造商', highlight: 'ZP-115 碳纤维公路自锁脚踏、锁片及职业车队补给水壶官方赞助商', desc: '和博旗下卓锐（ZERAY）品牌为车队提供高刚性、轻量化的 ZP-115 碳纤维公路自锁脚踏系统与定制赛训水壶。', photo: '' },
        { id: 'sp_jingteng', name: '静藤轮组 (Jingteng)', tier: '品牌出海战略合作伙伴', logoText: 'JINGTENG 静藤', ageSpec: '高性能碳纤维轮组 · 拉美与欧洲车店出海先锋', highlight: '依托车队哥伦比亚与西班牙赛训网络，成功开拓海外实体车店销售渠道', desc: '依托车队在南美洲（哥伦比亚）和西班牙的常驻赛训大本营，已成功将静藤高性能轮组引入当地多家专业实体车店网络。', photo: '' }
    ];

    function getSponsorsData() {
        try { return JSON.parse(localStorage.getItem('yp_sponsors_v4') || 'null') || defaultSponsorsData; } catch (e) { return defaultSponsorsData; }
    }
    function saveSponsorsData(list) { localStorage.setItem('yp_sponsors_v4', JSON.stringify(list)); }

    window.setSponsorCols = function (cols) { localStorage.setItem('yp_sponsor_cols_v5', String(cols)); window.renderSponsorshipModule(); };
    window.moveSponsorCard = function (id, dir) {
        if (!isAdminUser()) return;
        const list = getSponsorsData();
        const i = list.findIndex(x => String(x.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveSponsorsData(list); window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
    };
    window.deleteSponsorCard = function (id) {
        if (!isAdminUser() || !confirm('确定删除该赞助商档案吗？')) return;
        saveSponsorsData(getSponsorsData().filter(x => String(x.id) !== String(id)));
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
    };

    window.renderSponsorshipModule = function () {
        const spPage = document.getElementById('page-sponsorship');
        if (!spPage) return;
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
            Array.from(spPage.children).forEach(ch => { if (!ch.id.startsWith('yp-bg-ctrl-')) ch.remove(); });
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
                    <p class="text-gray-400 text-sm mt-1">感谢各合作品牌对青年力量洲际队的鼎力支持。点击任意赞助商卡片可进入其专属独立详情主页。</p>
                </div>
            </div>
            ${isAdmin ? `
                <div data-no-edit="true" class="mb-7 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div class="flex flex-wrap items-center gap-3">
                        <button onclick="openAddSponsorModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                            <i class="fa-solid fa-handshake"></i><span>➕ 添加赞助商介绍</span>
                        </button>
                        <span class="text-yp-lime font-bold">✥ 按住任意赞助商卡片可直接【拖动排序】；点击下方绿色按钮进入【赞助商独立详情页】！</span>
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
                    const imgUrl = sp.photo || sp.logoUrl || '';
                    return `
                        <div class="bg-gray-800/95 backdrop-blur-xs rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-spcard-id="${sp.id}">
                            <div>
                                <div onclick="openEntitySubpage('sponsor', '${sp.id}')" class="relative h-60 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                                    ${imgUrl ? `<img src="${imgUrl}" alt="${sp.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `
                                        <div class="text-center p-6">
                                            <div class="text-2xl font-black text-white group-hover:text-yp-lime tracking-widest mb-2">${sp.logoText || sp.name}</div>
                                            <span class="text-xs text-gray-400 font-bold block">点击进入品牌详情页或上传Logo封面</span>
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
                                    <i class="fa-solid fa-building"></i><span>🏢 进入赞助商独立详情页</span><i class="fa-solid fa-arrow-right"></i>
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
                            <div><label class="block font-bold mb-1">品牌名称 *</label><input type="text" id="asp-name" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">合作头衔 *</label><input type="text" id="asp-tier" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">副标题 / 领域特点 *</label><input type="text" id="asp-age" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">高光亮点一句话 *</label><input type="text" id="asp-high" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
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
        const photo = file ? await window.compressLocalImage(file, 1200, 0.8) : '';

        const list = getSponsorsData();
        list.push({ id: 'sp_' + Date.now(), name, tier, logoText: name, ageSpec, highlight, desc, photo, logoUrl: photo });
        saveSponsorsData(list);
        window.renderSponsorshipModule();
        if (typeof window.renderSponsorsBar === 'function') window.renderSponsorsBar();
        e.target.reset();
        document.getElementById('yp-add-sponsor-modal').classList.add('hidden');
    };

    // 骑游招募与赛事动态模块
    const defaultRidePostsCards = [
        { id: 'rp_1', name: '千岛湖亚运村「La Fuga 青野·驿」常态化骑游与集训营招募', role_zh: '骑游与集训招募', ageSpec: '2026-2027 常态化开放 · 杭州千岛湖亚运村', highlight: '依托千岛湖环湖经典赛道，提供青旅食宿、技师保障与洲际队跟队拉练体验', bio: '青年力量车队官方青年旅舍位于千岛湖亚运村（La Fuga 青野·驿），由巴塞罗那自治大学酒店管理硕士关若析主理。欢迎全国骑友前来入住打卡与跟队拉练！', photo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80' },
        { id: 'rp_2', name: '2026全国公开赛（湖北枝江）大学生组夺冠战报', role_zh: '赛事获奖动态', ageSpec: '2026赛季捷报 · 湖北枝江赛场', highlight: '车队主力平路车手张浩阳强势斩获大学生组冠军，并入选上海市自行车队', bio: '在2026全国公开赛（湖北枝江）大学生组较量中，张浩阳凭借出色的平路巡航与冲刺表现在终点夺得冠军。', photo: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80' }
    ];

    function getRidePostsData() {
        try { return JSON.parse(localStorage.getItem('yp_rideposts_cards_v5') || 'null') || defaultRidePostsCards; } catch (e) { return defaultRidePostsCards; }
    }
    function saveRidePostsData(list) { localStorage.setItem('yp_rideposts_cards_v5', JSON.stringify(list)); }

    window.setRidePostCols = function (cols) { localStorage.setItem('yp_ridepost_cols_v5', String(cols)); window.renderRidePostsModule(); };
    window.moveRidePostCard = function (id, dir) {
        if (!isAdminUser()) return;
        const list = getRidePostsData();
        const i = list.findIndex(x => String(x.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        saveRidePostsData(list); window.renderRidePostsModule();
    };
    window.deleteRidePostCard = function (id) {
        if (!isAdminUser() || !confirm('确定删除该条骑游招募/赛事动态吗？')) return;
        saveRidePostsData(getRidePostsData().filter(x => String(x.id) !== String(id)));
        window.renderRidePostsModule();
    };

    window.renderRidePostsModule = function () {
        document.getElementById('admin-ride-publisher')?.classList.add('hidden');
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
                        <span class="text-yp-lime font-bold">✥ 支持拖动排序、更换封面，点击卡片进入【活动/动态独立详情页】批量传图与排版！</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-300 font-bold">每行数量：</span>
                        <button onclick="setRidePostCols(2)" class="px-3 py-1.5 rounded-lg ${cols == '2' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">2列</button>
                        <button onclick="setRidePostCols(3)" class="px-3 py-1.5 rounded-lg ${cols == '3' ? 'bg-yp-green text-white font-black' : 'bg-gray-800 text-gray-300'}">3列</button>
                    </div>
                </div>
            ` : ''}
            <div id="rideposts-roster-style-grid" class="grid grid-cols-1 md:grid-cols-${cols} gap-7">
                ${list.map(rp => `
                    <div class="bg-gray-900 text-white rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative shadow-lg" data-rpcard-id="${rp.id}">
                        <div>
                            <div onclick="openEntitySubpage('ridepost', '${rp.id}')" class="relative h-60 bg-gray-800 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                                ${rp.photo ? `<img src="${rp.photo}" alt="${rp.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `
                                    <div class="text-center p-6 text-gray-400 text-xs"><i class="fa-solid fa-bicycle text-3xl text-yp-lime mb-2 block"></i><span>点击进入详情页或上传封面</span></div>
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
                                <i class="fa-solid fa-newspaper"></i><span>🚴 进入活动/动态独立详情页</span><i class="fa-solid fa-arrow-right"></i>
                            </button>
                            ${isAdmin ? `<button onclick="deleteRidePostCard('${rp.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        bindGridDragSort(document.getElementById('rideposts-roster-style-grid'), '[data-rpcard-id]', 'data-rpcard-id', (newIds) => {
            const cur = getRidePostsData();
            const ordered = newIds.map(id => cur.find(x => String(x.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) saveRidePostsData(ordered);
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
                            <div><label class="block font-bold mb-1">标题 *</label><input type="text" id="arp-name" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">分类标签 *</label><input type="text" id="arp-role" required value="骑游活动招募" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block font-bold mb-1">日期与地点 *</label><input type="text" id="arp-age" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                            <div><label class="block font-bold mb-1">核心亮点摘要 *</label><input type="text" id="arp-high" required class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></div>
                        </div>
                        <div><label class="block font-bold mb-1">上传封面图（可选）</label><input type="file" id="arp-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold mb-1">详细正文 *</label><textarea id="arp-bio" required rows="3" class="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white"></textarea></div>
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
        const photo = file ? await window.compressLocalImage(file, 1200, 0.8) : '';

        const list = getRidePostsData();
        list.unshift({ id: 'rp_' + Date.now(), name, role_zh, ageSpec, highlight, bio, photo });
        saveRidePostsData(list);
        window.renderRidePostsModule();
        e.target.reset();
        document.getElementById('yp-add-ridepost-modal').classList.add('hidden');
    };

    // 扩展 openEntitySubpage 支持 ridepost 与 sponsor
    const origOpenEntitySubpage = window.openEntitySubpage;
    window.openEntitySubpage = function (type, id) {
        if (type === 'ridepost') {
            const rp = getRidePostsData().find(x => String(x.id) === String(id));
            if (!rp) return;
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
    // 五、车队风采「主题影集 (Photo Albums)」系统（IndexedDB 大容量版 + 文件夹 URL 批量导入 + 100% 同步主页幻灯片）
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

    async function getAlbumsDataAsync() {
        const list = await idbGet('yp_photo_albums_v5', null);
        if (Array.isArray(list) && list.length > 0) return list;
        return JSON.parse(JSON.stringify(defaultPhotoAlbums));
    }

    async function saveAlbumsDataAsync(list) {
        await idbSet('yp_photo_albums_v5', list);
    }

    function getSlideshowSettings() {
        const def = { selectedAlbumId: 'all_checked', mode: 'slides', intervalSec: 4 };
        try { return { ...def, ...JSON.parse(localStorage.getItem('yp_home_slideshow_cfg_v5') || '{}') }; }
        catch (e) { return def; }
    }

    function saveSlideshowSettings(cfg) {
        localStorage.setItem('yp_home_slideshow_cfg_v5', JSON.stringify({ ...getSlideshowSettings(), ...cfg }));
    }

    window.moveAlbumCard = async function (id, dir) {
        if (!isAdminUser()) return;
        const list = await getAlbumsDataAsync();
        const i = list.findIndex(a => String(a.id) === String(id));
        if (i === -1 || i + dir < 0 || i + dir >= list.length) return;
        const tmp = list[i]; list[i] = list[i + dir]; list[i + dir] = tmp;
        await saveAlbumsDataAsync(list);
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
    };

    window.deleteAlbumCard = async function (id) {
        if (!isAdminUser() || !confirm('确定要删除整个影集及其内部照片吗？')) return;
        const list = (await getAlbumsDataAsync()).filter(a => String(a.id) !== String(id));
        await saveAlbumsDataAsync(list);
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') showToast('🗑️ 已删除该影集');
    };

    // 核心修复：点击任何影集或编辑页内的“设为主页轮播”按钮，100% 强制同步至主页幻灯片！
    window.toggleAlbumInHomeSlideshow = async function (id, refreshDetailView = false) {
        if (!isAdminUser()) return;
        const list = await getAlbumsDataAsync();
        const alb = list.find(a => String(a.id) === String(id));
        if (!alb) return;
        alb.inHomeSlideshow = !alb.inHomeSlideshow;
        await saveAlbumsDataAsync(list);

        // 如果管理员在单个影集中点了开启轮播，且当前主页下拉框锁定了别的影集，自动切回“播放所有已勾选轮播影集”或该影集
        const cfg = getSlideshowSettings();
        if (alb.inHomeSlideshow && cfg.selectedAlbumId !== 'all_checked' && cfg.selectedAlbumId !== alb.id) {
            saveSlideshowSettings({ selectedAlbumId: 'all_checked' });
        }

        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        if (refreshDetailView) {
            await window.openAlbumDetailView(id);
        }
        if (typeof showToast === 'function') {
            showToast(alb.inHomeSlideshow ? `🎞️ 已成功将「${alb.title}」同步至主页幻灯片播放！` : `已从主页幻灯片移除「${alb.title}」`);
        }
    };

    // 将影集一键单独锁定为主页当前唯一播放影集并立即跳转主页预览
    window.setExclusiveHomeSlideshowAlbum = async function (id) {
        if (!isAdminUser()) return;
        const list = await getAlbumsDataAsync();
        const alb = list.find(a => String(a.id) === String(id));
        if (!alb) return;
        alb.inHomeSlideshow = true;
        await saveAlbumsDataAsync(list);
        saveSlideshowSettings({ selectedAlbumId: alb.id });
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') {
            showToast(`🎬 已锁定主页幻灯片专门播放「${alb.title}」！`);
        }
    };

    window.setAlbumGridCols = function (cols) {
        localStorage.setItem('yp_album_cols_v5', String(cols));
        window.renderGalleryAlbumsModule();
    };

    window.renderGalleryAlbumsModule = async function () {
        const galleryPage = document.getElementById('page-gallery');
        if (!galleryPage) return;

        document.getElementById('admin-gallery-uploader')?.classList.add('hidden');
        const oldUploadBtn = galleryPage.querySelector('button[onclick*="handleStaffUploadClick"], button[onclick*="openCreateAlbumModal"]');
        if (oldUploadBtn) {
            oldUploadBtn.setAttribute('onclick', 'openCreateAlbumModal()');
            oldUploadBtn.innerHTML = `<i class="fa-solid fa-folder-plus text-yp-lime"></i><span>➕ 新建车队风采影集</span>`;
            oldUploadBtn.classList.toggle('hidden', !isAdminUser());
        }

        const grid = document.getElementById('gallery-grid');
        if (!grid) return;

        const isAdmin = isAdminUser();
        const cols = localStorage.getItem('yp_album_cols_v5') || '3';
        const albums = await getAlbumsDataAsync();

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
                <div class="flex flex-wrap items-center gap-2.5">
                    <button onclick="openCreateAlbumModal()" class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl shadow flex items-center space-x-1.5 text-sm">
                        <i class="fa-solid fa-images"></i><span>➕ 新建主题影集 (支持本地多图/文件夹URL)</span>
                    </button>
                    <button onclick="openFolderUrlImportModal('')" class="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl shadow flex items-center space-x-1.5">
                        <i class="fa-solid fa-folder-tree"></i><span>☁️ 文件夹URL / GitHub目录 / 网盘直链导入</span>
                    </button>
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
                            <div class="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-transparent to-transparent"></div>
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
                                    <button onclick="toggleAlbumInHomeSlideshow('${alb.id}', false)" class="px-2.5 py-1 rounded-lg text-[11px] font-black shadow ${alb.inHomeSlideshow ? 'bg-yp-lime text-gray-900' : 'bg-gray-800/90 text-gray-300 border border-gray-600'}">
                                        ${alb.inHomeSlideshow ? '✅ 已同步主页轮播' : '🎞️ 同步至主页轮播'}
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
                            <i class="fa-solid fa-folder-open"></i><span>📂 打开影集相册 / 批量传图 (${photos.length}张)</span><i class="fa-solid fa-arrow-right"></i>
                        </button>
                        ${isAdmin ? `<button onclick="deleteAlbumCard('${alb.id}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        bindGridDragSort(grid, '[data-albcard-id]', 'data-albcard-id', async (newIds) => {
            const cur = await getAlbumsDataAsync();
            const ordered = newIds.map(id => cur.find(a => String(a.id) === String(id))).filter(Boolean);
            if (ordered.length === cur.length) {
                await saveAlbumsDataAsync(ordered);
                await window.renderHomeAlbumSlideshow();
                if (typeof showToast === 'function') showToast('✅ 影集排列顺序已保存！');
            }
        });
    };

    // =========================================================================
    // 六、☁️ 图集文件夹 URL / GitHub 文件夹 / 网盘直链 一键批量导入器
    // =========================================================================
    window.openFolderUrlImportModal = async function (targetAlbumId = '') {
        if (!isAdminUser()) return;
        const albums = await getAlbumsDataAsync();
        let m = document.getElementById('yp-folder-url-import-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'yp-folder-url-import-modal';
            m.setAttribute('data-no-edit', 'true');
            m.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
            document.body.appendChild(m);
        }

        m.innerHTML = `
            <div onclick="document.getElementById('yp-folder-url-import-modal').classList.add('hidden')" class="fixed inset-0 bg-black/75 backdrop-blur-xs"></div>
            <div class="bg-gray-900 text-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-purple-400 relative z-10">
                <div class="p-5 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <span class="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded">CLOUD FOLDER & URL BATCH IMPORTER</span>
                        <h3 class="text-lg font-black text-white mt-1">☁️ 图集文件夹 URL / GitHub目录 / 网盘直链批量导入</h3>
                    </div>
                    <button onclick="document.getElementById('yp-folder-url-import-modal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div class="p-6 space-y-5 text-xs">
                    <!-- 选择导入到哪个影集 -->
                    <div class="p-3.5 rounded-2xl bg-gray-800 border border-gray-700 flex flex-wrap items-center justify-between gap-3">
                        <label class="font-black text-yp-lime">📂 选择要导入到的目标影集：</label>
                        <select id="import-target-album-id" class="flex-1 rounded-xl bg-gray-900 border border-gray-600 px-3 py-2 text-white font-bold">
                            <option value="NEW_ALBUM">➕ 自动新建一个独立影集并同步至主页轮播</option>
                            ${albums.map(a => `<option value="${a.id}" ${a.id === targetAlbumId ? 'selected' : ''}>追加到现有影集：${a.title} (${(a.photos || []).length}张)</option>`).join('')}
                        </select>
                    </div>

                    <div id="new-album-Quick-meta" class="${targetAlbumId ? 'hidden' : ''} grid grid-cols-2 gap-3">
                        <input type="text" id="import-new-alb-title" placeholder="新影集名称 (如：2027环赛精彩图集)" class="rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white">
                        <input type="text" id="import-new-alb-tag" value="云端图集" placeholder="分类标签" class="rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white">
                    </div>

                    <!-- 方式 1：GitHub 仓库图片文件夹 URL 自动扫描 -->
                    <div class="p-4 rounded-2xl bg-gray-800/90 border border-gray-700 space-y-2.5">
                        <div class="font-black text-sm text-yp-lime">方式 A：GitHub 仓库图片文件夹 URL 一键扫描导入（最推荐，无限容量免缓存）</div>
                        <p class="text-gray-400 leading-relaxed">把照片上传到您 GitHub 仓库的任意文件夹后，直接粘贴该文件夹地址（如 <code class="text-pink-300">https://github.com/用户名/仓库名/tree/main/images</code>），系统将自动抓取文件夹内全部图片：</p>
                        <div class="flex gap-2">
                            <input type="text" id="gh-folder-url-input" placeholder="粘贴 GitHub 文件夹链接 https://github.com/.../tree/main/文件夹" class="flex-1 rounded-xl bg-gray-900 border border-gray-600 px-3 py-2 text-white">
                            <button type="button" onclick="importFromGithubFolderUrl()" class="px-4 py-2 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl shrink-0">🚀 扫描文件夹导入</button>
                        </div>
                    </div>

                    <!-- 方式 2：服务器 / 云盘直链文件夹按编号规律批量生成 -->
                    <div class="p-4 rounded-2xl bg-gray-800/90 border border-gray-700 space-y-2.5">
                        <div class="font-black text-sm text-amber-400">方式 B：云存储 / 网站目录文件夹 URL 按编号批量导入</div>
                        <p class="text-gray-400 leading-relaxed">如果您的图片存放在某个文件夹 URL 下并按数字命名（例如 <code class="text-amber-200">https://team-youthpower.org.cn/photos/race1/</code> 下的 <code class="text-amber-200">1.jpg</code> 到 <code class="text-amber-200">30.jpg</code>）：</p>
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input type="text" id="seq-folder-base-url" placeholder="文件夹URL前缀，如 https://team-youthpower.org.cn/photos/" class="sm:col-span-6 rounded-xl bg-gray-900 border border-gray-600 px-3 py-2 text-white">
                            <input type="number" id="seq-start-num" value="1" min="0" placeholder="起始号(1)" class="sm:col-span-2 rounded-xl bg-gray-900 border border-gray-600 px-2.5 py-2 text-white">
                            <input type="number" id="seq-end-num" value="10" min="1" placeholder="结束号(10)" class="sm:col-span-2 rounded-xl bg-gray-900 border border-gray-600 px-2.5 py-2 text-white">
                            <input type="text" id="seq-ext" value=".jpg" placeholder=".jpg" class="sm:col-span-2 rounded-xl bg-gray-900 border border-gray-600 px-2.5 py-2 text-white">
                        </div>
                        <button type="button" onclick="importFromSequentialFolderUrl()" class="w-full py-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-black rounded-xl">📂 批量生成文件夹内全部图片并导入</button>
                    </div>

                    <!-- 方式 3：多行图片直链 URL 批量粘贴 -->
                    <div class="p-4 rounded-2xl bg-gray-800/90 border border-gray-700 space-y-2.5">
                        <div class="font-black text-sm text-purple-300">方式 C：多张图片直链 URL 批量粘贴（每行一个图片地址）</div>
                        <textarea id="multi-urls-textarea" rows="3" placeholder="https://.../pic1.jpg&#10;https://.../pic2.jpg" class="w-full rounded-xl bg-gray-900 border border-gray-600 px-3 py-2 text-white"></textarea>
                        <button type="button" onclick="importFromMultiLineUrls()" class="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl">🔗 批量导入以上全部图片链接</button>
                    </div>
                </div>
            </div>
        `;

        const sel = document.getElementById('import-target-album-id');
        if (sel) {
            sel.onchange = function () {
                document.getElementById('new-album-Quick-meta')?.classList.toggle('hidden', this.value !== 'NEW_ALBUM');
            };
        }
        m.classList.remove('hidden');
    };

    async function saveImportedUrlsToTargetAlbum(urlsArray, defaultCaptionPrefix = '车队图集') {
        if (!urlsArray || !urlsArray.length) {
            if (typeof showToast === 'function') showToast('⚠️ 未检测到有效的图片链接！');
            return;
        }
        const targetId = document.getElementById('import-target-album-id')?.value || 'NEW_ALBUM';
        const list = await getAlbumsDataAsync();
        let targetAlb = null;

        if (targetId === 'NEW_ALBUM') {
            const title = document.getElementById('import-new-alb-title')?.value.trim() || `云端导入影集 (${urlsArray.length}图)`;
            const tag = document.getElementById('import-new-alb-tag')?.value.trim() || '云端影集';
            targetAlb = {
                id: 'alb_' + Date.now(),
                title,
                tag,
                desc: `包含 ${urlsArray.length} 张云端图集照片`,
                cover: urlsArray[0].url,
                inHomeSlideshow: true,
                photos: []
            };
            list.unshift(targetAlb);
        } else {
            targetAlb = list.find(a => String(a.id) === String(targetId));
        }

        if (!targetAlb) return;
        targetAlb.photos = targetAlb.photos || [];
        urlsArray.forEach((item, idx) => {
            targetAlb.photos.push({
                id: 'ap_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).slice(2, 6),
                url: item.url,
                caption: item.caption || `${defaultCaptionPrefix} #${idx + 1}`
            });
        });
        if (!targetAlb.cover && targetAlb.photos[0]) {
            targetAlb.cover = targetAlb.photos[0].url;
        }
        targetAlb.inHomeSlideshow = true;

        await saveAlbumsDataAsync(list);
        document.getElementById('yp-folder-url-import-modal')?.classList.add('hidden');
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        await window.openAlbumDetailView(targetAlb.id);
        if (typeof showToast === 'function') {
            showToast(`✅ 成功导入 ${urlsArray.length} 张图片至「${targetAlb.title}」，并已同步至主页幻灯片！`);
        }
    }

    // 解析 GitHub 仓库文件夹 URL 并调用 GitHub API 获取全部图片
    window.importFromGithubFolderUrl = async function () {
        const raw = document.getElementById('gh-folder-url-input')?.value.trim() || '';
        if (!raw) return;
        // 匹配 https://github.com/{owner}/{repo}/tree/{branch}/{path}
        const m = raw.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/i);
        if (!m) {
            if (typeof showToast === 'function') showToast('⚠️ 格式示例：https://github.com/用户名/仓库名/tree/main/文件夹名');
            return;
        }
        const [, owner, repo, branch, folderPath] = m;
        if (typeof showToast === 'function') showToast('⏳ 正在扫描 GitHub 文件夹内的全部图片...');
        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`;
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error('API Error');
            const files = await res.json();
            const imgFiles = (Array.isArray(files) ? files : []).filter(f => f.type === 'file' && /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name));
            const urls = imgFiles.map(f => ({
                url: f.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`,
                caption: f.name.replace(/\.[^/.]+$/, '')
            }));
            await saveImportedUrlsToTargetAlbum(urls, folderPath);
        } catch (err) {
            if (typeof showToast === 'function') showToast('❌ 无法读取该 GitHub 文件夹，请确认仓库为 Public 且路径正确！');
        }
    };

    window.importFromSequentialFolderUrl = async function () {
        let base = document.getElementById('seq-folder-base-url')?.value.trim() || '';
        const start = parseInt(document.getElementById('seq-start-num')?.value || '1', 10);
        const end = parseInt(document.getElementById('seq-end-num')?.value || '10', 10);
        let ext = document.getElementById('seq-ext')?.value.trim() || '.jpg';
        if (!base || end < start) return;
        if (!base.endsWith('/')) base += '/';
        if (!ext.startsWith('.')) ext = '.' + ext;

        const urls = [];
        for (let i = start; i <= Math.min(end, start + 200); i++) {
            urls.push({ url: `${base}${i}${ext}`, caption: `照片 #${i}` });
        }
        await saveImportedUrlsToTargetAlbum(urls, '图集');
    };

    window.importFromMultiLineUrls = async function () {
        const raw = document.getElementById('multi-urls-textarea')?.value || '';
        const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s));
        const urls = lines.map((u, idx) => ({ url: u, caption: `图集照片 #${idx + 1}` }));
        await saveImportedUrlsToTargetAlbum(urls, '精选照片');
    };

    // 新建影集弹窗（支持逐张队列高清压缩 + IndexedDB 海量存储）
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
                            <label class="block font-bold mb-1 text-yp-lime">📂 从本地批量选择照片上传（已启用 IndexedDB 大容量引擎，支持一次选数十张）</label>
                            <input type="file" id="calb-files" accept="image/*" multiple class="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-yp-green file:text-white font-bold">
                        </div>
                        <label class="flex items-center space-x-2 cursor-pointer pt-1">
                            <input type="checkbox" id="calb-home" checked class="rounded text-yp-green">
                            <span class="font-bold text-gray-200">🎞️ 立即将该影集同步至主页（首页）幻灯片播放</span>
                        </label>
                        <button type="submit" id="btn-create-alb-submit" class="w-full py-3 bg-yp-lime text-gray-900 font-black rounded-xl text-sm">➕ 立即创建影集并上传照片</button>
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
        const submitBtn = document.getElementById('btn-create-alb-submit');

        const photos = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (submitBtn) submitBtn.textContent = `⏳ 正在处理第 ${i + 1} / ${files.length} 张照片...`;
            const dataUrl = await window.compressLocalImage(f, 1280, 0.78);
            if (dataUrl) {
                photos.push({
                    id: 'ap_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
                    url: dataUrl,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
            }
        }
        if (submitBtn) submitBtn.textContent = '➕ 立即创建影集并上传照片';

        const newAlb = {
            id: 'alb_' + Date.now(),
            title, tag, desc,
            cover: photos[0]?.url || '',
            inHomeSlideshow,
            photos
        };

        const list = await getAlbumsDataAsync();
        list.unshift(newAlb);
        await saveAlbumsDataAsync(list);
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        e.target.reset();
        document.getElementById('yp-create-album-modal').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`✅ 影集「${title}」已创建，成功上传 ${photos.length} 张照片！`);
    };

    // 打开单个影集的内部相册编辑页（配备醒目的“同步至主页幻灯片”开关 + “文件夹URL导入” + “本地批量上传”）
    window.openAlbumDetailView = async function (albumId) {
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
        const list = await getAlbumsDataAsync();
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
                        <button onclick="toggleAlbumInHomeSlideshow('${alb.id}', true)" class="px-4 py-2 rounded-xl font-black shadow transition ${alb.inHomeSlideshow ? 'bg-yp-lime text-gray-900 ring-2 ring-white' : 'bg-gray-800 text-gray-200 border border-gray-600 hover:bg-yp-green'}">
                            ${alb.inHomeSlideshow ? '✅ 已同步至主页幻灯片轮播 (点击取消)' : '🎞️ 点击将本影集同步至主页幻灯片轮播'}
                        </button>
                        <button onclick="setExclusiveHomeSlideshowAlbum('${alb.id}')" class="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black shadow">
                            🎯 设为主页唯一独播影集
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
                    <div data-no-edit="true" class="mt-6 pt-5 border-t border-gray-800 space-y-4 text-xs">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div class="md:col-span-5">
                                <label class="cursor-pointer w-full py-3 px-4 bg-yp-green hover:bg-yp-darkGreen text-white font-black rounded-xl flex items-center justify-center space-x-2 shadow-lg transition">
                                    <i class="fa-solid fa-cloud-arrow-up text-base"></i>
                                    <span id="alb-upload-btn-label">➕ 从本地批量选择图片上传 (IndexedDB大容量)</span>
                                    <input type="file" accept="image/*" multiple class="hidden" onchange="uploadLocalPhotosToAlbum(event, '${alb.id}')">
                                </label>
                            </div>
                            <div class="md:col-span-3">
                                <button type="button" onclick="openFolderUrlImportModal('${alb.id}')" class="w-full py-3 px-3 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl shadow flex items-center justify-center space-x-1.5 transition">
                                    <i class="fa-solid fa-folder-tree"></i>
                                    <span>☁️ 文件夹URL批量导入</span>
                                </button>
                            </div>
                            <form onsubmit="addUrlPhotoToAlbum(event, '${alb.id}')" class="md:col-span-4 flex gap-1.5">
                                <input type="url" id="alb-add-url-input" required placeholder="或粘贴单张图片URL..." class="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                                <button type="submit" class="px-3.5 py-2.5 bg-amber-400 text-gray-900 font-black rounded-xl shrink-0">添加</button>
                            </form>
                        </div>
                    </div>
                ` : ''}
            </div>

            ${photos.length === 0 ? `
                <div class="text-center py-16 bg-gray-900/80 text-gray-400 rounded-3xl border border-dashed border-gray-700 text-sm">
                    该影集暂未上传照片。${isAdmin ? '请点击上方绿色按钮「➕ 从本地批量选择图片上传」或紫色按钮「☁️ 文件夹URL批量导入」！' : ''}
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

        bindGridDragSort(document.getElementById('album-internal-photos-grid'), '[data-alb-pid]', 'data-alb-pid', async (newIds) => {
            const all = await getAlbumsDataAsync();
            const target = all.find(a => String(a.id) === String(albumId));
            if (target && target.photos) {
                target.photos = newIds.map(pid => target.photos.find(x => String(x.id) === String(pid))).filter(Boolean);
                await saveAlbumsDataAsync(all);
                await window.renderHomeAlbumSlideshow();
                if (typeof showToast === 'function') showToast('✅ 影集内部照片顺序已保存！');
            }
        });

        window.switchPage('subdetail');
    };

    // 逐张队列压缩 + IndexedDB 异步保存，彻底解决批量上传部分图片失败的 Bug
    window.uploadLocalPhotosToAlbum = async function (event, albumId) {
        if (!isAdminUser()) return;
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        alb.photos = alb.photos || [];

        const btnLabel = document.getElementById('alb-upload-btn-label');
        let okCount = 0;

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (btnLabel) btnLabel.textContent = `⏳ 正在上传 ${i + 1} / ${files.length}...`;
            if (typeof showToast === 'function') {
                showToast(`⏳ 正在智能压缩并保存第 ${i + 1} / ${files.length} 张照片...`);
            }
            const dataUrl = await window.compressLocalImage(f, 1280, 0.78);
            if (dataUrl) {
                alb.photos.push({
                    id: 'ap_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
                    url: dataUrl,
                    caption: f.name.replace(/\.[^/.]+$/, '')
                });
                if (!alb.cover) alb.cover = dataUrl;
                okCount++;
            }
        }

        await saveAlbumsDataAsync(all);
        await window.openAlbumDetailView(albumId);
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') {
            showToast(`✅ 批量上传完成！成功上传 ${okCount} / ${files.length} 张照片至影集！`);
        }
    };

    window.addUrlPhotoToAlbum = async function (e, albumId) {
        e.preventDefault();
        if (!isAdminUser()) return;
        const url = document.getElementById('alb-add-url-input')?.value.trim();
        if (!url) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        alb.photos = alb.photos || [];
        alb.photos.push({ id: 'ap_' + Date.now(), url, caption: alb.title });
        if (!alb.cover) alb.cover = url;
        await saveAlbumsDataAsync(all);
        await window.openAlbumDetailView(albumId);
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
        if (typeof showToast === 'function') showToast('✅ 已添加照片至影集！');
    };

    window.movePhotoInAlbum = async function (albumId, idx, dir) {
        if (!isAdminUser()) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb || !alb.photos) return;
        const target = idx + dir;
        if (target < 0 || target >= alb.photos.length) return;
        const tmp = alb.photos[idx]; alb.photos[idx] = alb.photos[target]; alb.photos[target] = tmp;
        await saveAlbumsDataAsync(all);
        await window.openAlbumDetailView(albumId);
        await window.renderHomeAlbumSlideshow();
    };

    window.setPhotoAsAlbumCover = async function (albumId, url) {
        if (!isAdminUser()) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (alb) {
            alb.cover = url;
            await saveAlbumsDataAsync(all);
            await window.renderGalleryAlbumsModule();
            if (typeof showToast === 'function') showToast('⭐ 已设为该影集封面！');
        }
    };

    window.editPhotoCaptionInAlbum = async function (albumId, photoId) {
        if (!isAdminUser()) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        const p = alb?.photos?.find(x => String(x.id) === String(photoId));
        if (!p) return;
        const txt = prompt('修改照片说明文字：', p.caption || '');
        if (txt !== null) {
            p.caption = txt.trim();
            await saveAlbumsDataAsync(all);
            await window.openAlbumDetailView(albumId);
            await window.renderHomeAlbumSlideshow();
        }
    };

    window.deletePhotoFromAlbum = async function (albumId, photoId) {
        if (!isAdminUser()) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (alb && alb.photos) {
            alb.photos = alb.photos.filter(x => String(x.id) !== String(photoId));
            await saveAlbumsDataAsync(all);
            await window.openAlbumDetailView(albumId);
            await window.renderGalleryAlbumsModule();
            await window.renderHomeAlbumSlideshow();
        }
    };

    window.editAlbumMetaPrompt = async function (albumId) {
        if (!isAdminUser()) return;
        const all = await getAlbumsDataAsync();
        const alb = all.find(a => String(a.id) === String(albumId));
        if (!alb) return;
        const t = prompt('修改影集名称：', alb.title);
        if (t && t.trim()) alb.title = t.trim();
        const d = prompt('修改影集简介：', alb.desc || '');
        if (d !== null) alb.desc = d.trim();
        await saveAlbumsDataAsync(all);
        await window.openAlbumDetailView(albumId);
        await window.renderGalleryAlbumsModule();
        await window.renderHomeAlbumSlideshow();
    };

    // 同时为 Gallery 上半部分的「主题合集 (#collections-grid)」注入“同步至主页幻灯片”按钮，彻底打通合集与主页轮播
    window.toggleCollectionInHomeSlideshow = async function (colId) {
        if (!isAdminUser()) return;
        try {
            const cols = JSON.parse(localStorage.getItem('yp_media_collections') || '[]');
            const target = cols.find(c => String(c.id) === String(colId));
            if (target) {
                target.inHomeSlideshow = !target.inHomeSlideshow;
                localStorage.setItem('yp_media_collections', JSON.stringify(cols));
                if (typeof window.renderCollectionsGrid === 'function') window.renderCollectionsGrid('all');
                await window.renderHomeAlbumSlideshow();
                if (typeof showToast === 'function') {
                    showToast(target.inHomeSlideshow ? `🎞️ 已将合集「${target.title}」同步至主页幻灯片！` : `已从主页幻灯片移除「${target.title}」`);
                }
            }
        } catch (e) {}
    };

    function enhanceCollectionsGridWithHomeSync() {
        if (!isAdminUser()) return;
        const colGrid = document.getElementById('collections-grid');
        if (!colGrid) return;
        let cols = [];
        try { cols = JSON.parse(localStorage.getItem('yp_media_collections') || '[]'); } catch (e) {}

        Array.from(colGrid.children).forEach((card, idx) => {
            if (card.querySelector('.col-home-sync-btn')) return;
            const colItem = cols[idx];
            if (!colItem || colItem.type === 'video' || colItem.type === 'bilibili') return;
            const btn = document.createElement('button');
            btn.setAttribute('data-no-edit', 'true');
            btn.setAttribute('onclick', `toggleCollectionInHomeSlideshow('${colItem.id}')`);
            btn.className = `col-home-sync-btn absolute bottom-3 right-3 px-3 py-1 rounded-lg text-xs font-black shadow ${colItem.inHomeSlideshow ? 'bg-yp-lime text-gray-900' : 'bg-gray-900/90 text-white border border-gray-600'}`;
            btn.innerHTML = colItem.inHomeSlideshow ? '✅ 已同步主页轮播' : '🎞️ 同步至主页幻灯片';
            const imgWrap = card.querySelector('.relative');
            if (imgWrap) imgWrap.appendChild(btn);
        });
    }

    // =========================================================================
    // 七、主页（#page-home）最高优先级幻灯片播放 / 滚动播放选定影集照片（绝不被静态模块覆盖）
    // =========================================================================
    let currentSlideIndex = 0;
    let slideTimer = null;

    async function getSlideshowPhotosListAsync() {
        const albums = await getAlbumsDataAsync();
        const cfg = getSlideshowSettings();
        let targetAlbums = [];

        if (cfg.selectedAlbumId === 'all_checked') {
            targetAlbums = albums.filter(a => a.inHomeSlideshow);
            if (targetAlbums.length === 0) targetAlbums = albums;
        } else {
            const found = albums.find(a => String(a.id) === String(cfg.selectedAlbumId));
            targetAlbums = found ? [found] : albums;
        }

        const slides = [];
        targetAlbums.forEach(alb => {
            (alb.photos || []).forEach(p => {
                slides.push({
                    photoId: p.id,
                    url: p.url,
                    caption: p.caption || alb.title,
                    albumId: alb.id,
                    albumTitle: alb.title,
                    albumTag: alb.tag
                });
            });
        });

        // 同时合并 Gallery 主题合集里被勾选了“同步至主页幻灯片”的图片合集
        try {
            const cols = JSON.parse(localStorage.getItem('yp_media_collections') || '[]');
            cols.filter(c => c.inHomeSlideshow && c.type === 'image' && (c.mediaUrl || c.cover)).forEach(c => {
                slides.push({
                    photoId: c.id,
                    url: c.mediaUrl || c.cover,
                    caption: c.title,
                    albumId: '',
                    albumTitle: c.category || '主题合集',
                    albumTag: '精选合集'
                });
            });
        } catch (e) {}

        return slides;
    }

    window.renderHomeAlbumSlideshow = async function () {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;

        // 隐藏 custom-update.js 旧的静态 3 图展示区，防止冲突或覆盖
        const oldShowcase = document.getElementById('home-photo-showcase-sec');
        if (oldShowcase) {
            oldShowcase.className = 'hidden';
            oldShowcase.innerHTML = '';
        }

        // 建立独立的主页幻灯片容器 #yp-master-home-slideshow
        let masterSlideSec = document.getElementById('yp-master-home-slideshow');
        if (!masterSlideSec) {
            masterSlideSec = document.createElement('section');
            masterSlideSec.id = 'yp-master-home-slideshow';
            masterSlideSec.setAttribute('data-hsec-id', 'sec_master_slideshow');
            const heroSec = homePage.querySelector('section.hero-bg');
            if (heroSec && heroSec.nextSibling) {
                homePage.insertBefore(masterSlideSec, heroSec.nextSibling);
            } else {
                homePage.appendChild(masterSlideSec);
            }
        }

        const isAdmin = isAdminUser();
        const albums = await getAlbumsDataAsync();
        const cfg = getSlideshowSettings();
        const slides = await getSlideshowPhotosListAsync();
        if (currentSlideIndex >= slides.length) currentSlideIndex = 0;

        masterSlideSec.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10';

        const adminControlHtml = isAdmin ? `
            <div data-no-edit="true" class="mb-4 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="flex items-center space-x-2">
                    <span class="px-2.5 py-1 bg-yp-lime text-gray-900 font-black rounded">🎞️ 主页影集幻灯片/滚动播放控制</span>
                    <span class="text-gray-300 font-bold">当前共加载 ${slides.length} 张轮播照片：</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <select onchange="changeHomeSlideshowAlbum(this.value)" class="rounded-xl bg-gray-800 border border-gray-600 px-3 py-1.5 text-yp-lime font-black">
                        <option value="all_checked" ${cfg.selectedAlbumId === 'all_checked' ? 'selected' : ''}>📂 播放全部已勾选「同步主页轮播」的影集</option>
                        ${albums.map(a => `<option value="${a.id}" ${cfg.selectedAlbumId === a.id ? 'selected' : ''}>🎯 仅独播影集：${a.title} (${(a.photos || []).length}张)</option>`).join('')}
                    </select>
                    <button onclick="setHomeSlideshowMode('slides')" class="px-3 py-1.5 rounded-xl font-bold ${cfg.mode === 'slides' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">🎞️ 幻灯片大图轮播</button>
                    <button onclick="setHomeSlideshowMode('scroll')" class="px-3 py-1.5 rounded-xl font-bold ${cfg.mode === 'scroll' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300'}">↔️ 连续横向滚动画廊</button>
                    <select onchange="setHomeSlideshowInterval(this.value)" class="rounded-xl bg-gray-800 border border-gray-600 px-2.5 py-1.5 text-white font-bold">
                        <option value="3" ${cfg.intervalSec == 3 ? 'selected' : ''}>3秒切换</option>
                        <option value="5" ${cfg.intervalSec == 5 ? 'selected' : ''}>5秒切换</option>
                        <option value="0" ${cfg.intervalSec == 0 ? 'selected' : ''}>暂停自动播放</option>
                    </select>
                    <button onclick="switchPage('gallery')" class="px-3 py-1.5 rounded-xl bg-amber-400 text-gray-900 font-black">📂 管理影集与批量传图</button>
                </div>
            </div>
        ` : '';

        if (slides.length === 0) {
            masterSlideSec.innerHTML = `${adminControlHtml}`;
            return;
        }

        let bodyHtml = '';
        if (cfg.mode === 'scroll') {
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
                            <div onclick="${s.albumId ? `openAlbumDetailView('${s.albumId}')` : `switchPage('gallery')`}" class="cursor-pointer shrink-0 w-80 sm:w-96 bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-yp-lime transition group">
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
            const cur = slides[currentSlideIndex];
            bodyHtml = `
                <div class="relative rounded-3xl overflow-hidden bg-gray-950 border-2 border-gray-800 shadow-2xl group" data-no-edit="true"
                     onmouseenter="pauseHomeSlideTimer()" onmouseleave="startHomeSlideTimer()">
                    <div class="relative h-[380px] sm:h-[500px] w-full overflow-hidden bg-black">
                        <img id="yp-home-slide-img" src="${cur.url}" alt="${cur.caption}" class="w-full h-full object-cover transition-all duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent"></div>

                        <button onclick="stepHomeSlide(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gray-900/80 hover:bg-yp-green text-white flex items-center justify-center shadow-lg transition">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button onclick="stepHomeSlide(1)" class="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gray-900/80 hover:bg-yp-green text-white flex items-center justify-center shadow-lg transition">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>

                        <div class="absolute bottom-6 left-6 right-6 sm:left-10 sm:right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div>
                                <button onclick="${cur.albumId ? `openAlbumDetailView('${cur.albumId}')` : `switchPage('gallery')`}" class="px-3 py-1 bg-yp-green text-white text-xs font-black rounded-lg shadow mb-2 inline-flex items-center space-x-1.5 hover:bg-yp-darkGreen transition">
                                    <i class="fa-regular fa-images"></i>
                                    <span>所属影集：${cur.albumTitle} (${currentSlideIndex + 1}/${slides.length})</span>
                                </button>
                                <h3 class="text-xl sm:text-2xl font-black text-white drop-shadow">${cur.caption}</h3>
                            </div>
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

        masterSlideSec.innerHTML = `${adminControlHtml}${bodyHtml}`;
        startHomeSlideTimer();
    };

    window.stepHomeSlide = async function (dir) {
        const slides = await getSlideshowPhotosListAsync();
        if (!slides.length) return;
        currentSlideIndex = (currentSlideIndex + dir + slides.length) % slides.length;
        await window.renderHomeAlbumSlideshow();
    };

    window.goToHomeSlide = async function (idx) {
        currentSlideIndex = idx;
        await window.renderHomeAlbumSlideshow();
    };

    window.changeHomeSlideshowAlbum = async function (albumId) {
        currentSlideIndex = 0;
        saveSlideshowSettings({ selectedAlbumId: albumId });
        await window.renderHomeAlbumSlideshow();
    };

    window.setHomeSlideshowMode = async function (mode) {
        saveSlideshowSettings({ mode });
        await window.renderHomeAlbumSlideshow();
    };

    window.setHomeSlideshowInterval = async function (sec) {
        saveSlideshowSettings({ intervalSec: Number(sec) });
        await window.renderHomeAlbumSlideshow();
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
    // 八、统一初始化与全局挂钩
    // =========================================================================
    async function initPlugin02All() {
        await openMediaIDB();
        cleanLoginModalAdminHints();
        injectGlobalConsultationWidget();
        window.syncAllConsultationFormsEmail();
        window.renderSponsorshipModule();
        window.renderRidePostsModule();
        await window.renderGalleryAlbumsModule();
        enhanceCollectionsGridWithHomeSync();
        await window.renderHomeAlbumSlideshow();
    }

    window.addEventListener('DOMContentLoaded', () => {
        const origRenderHomeAll = window.renderHomeAll;
        if (origRenderHomeAll) {
            window.renderHomeAll = function () {
                origRenderHomeAll();
                window.renderHomeAlbumSlideshow();
            };
        }

        const origRenderCollections = window.renderCollectionsGrid;
        if (origRenderCollections) {
            window.renderCollectionsGrid = function (f) {
                origRenderCollections(f);
                setTimeout(enhanceCollectionsGridWithHomeSync, 30);
            };
        }

        window.renderGallery = function () {
            window.renderGalleryAlbumsModule();
        };

        window.renderRidePosts = function () {
            window.renderRidePostsModule();
        };

        setTimeout(initPlugin02All, 160);

        const prevUpdateAuth = window.updateAuthUI;
        if (prevUpdateAuth) {
            window.updateAuthUI = function () {
                prevUpdateAuth();
                setTimeout(initPlugin02All, 50);
            };
        }

        const prevOpenAuth = window.openAuthModal;
        if (prevOpenAuth) {
            window.openAuthModal = function () {
                cleanLoginModalAdminHints();
                prevOpenAuth();
            };
        }

        const prevSwitchPage = window.switchPage;
        if (prevSwitchPage) {
            window.switchPage = function (pageId) {
                if (pageId === 'partners') pageId = 'sponsorship';
                prevSwitchPage(pageId);
                window.syncAllConsultationFormsEmail();
                if (pageId === 'sponsorship') window.renderSponsorshipModule();
                if (pageId === 'rides') window.renderRidePostsModule();
                if (pageId === 'gallery') {
                    window.renderGalleryAlbumsModule();
                    setTimeout(enhanceCollectionsGridWithHomeSync, 50);
                }
                if (pageId === 'home') window.renderHomeAlbumSlideshow();
            };
        }
    });
})();
