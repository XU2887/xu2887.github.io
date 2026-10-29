/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 终极版扩展插件 (custom-update.js)
 * 本次核心升级：
 * 1. 【丝滑实时拖拽排序 (Live DOM Swap) + ◀▶按钮双保险】：彻底解决图片拦截导致无法拖动队员档案、商城商品排序的问题
 * 2. 【队员个人详情页：多图相册系统】：支持管理员为每位队员批量上传多张照片，相册内照片同样支持拖拽排序与删除
 * 3. 【队员个人详情页：4种页面排版 + 相册列数自由切换】：支持“左图右文”、“杂志巨幕”、“右图左文”、“画廊优先”4种排版独立保存
 * 4. 【100%全站英/西精译词库 + 微软(Microsoft Edge/Bing)神经网络翻译】：队员介绍、赞助、骑游、商城全覆盖
 */

(function () {
    'use strict';

    window.__ypLang = 'zh';

    // 注入全局拖拽增强样式（禁止图片原生拖拽干扰，高亮拖拽目标）
    const dragStyle = document.createElement('style');
    dragStyle.innerHTML = `
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
    `;
    document.head.appendChild(dragStyle);

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
    // 二、队员多图相册 & 详情页独立排版存储系统
    // =========================================================================
    // 获取某位队员的多张相册图片数组
    function getRiderAlbum(riderId) {
        try {
            const allAlbums = JSON.parse(localStorage.getItem('yp_rider_multi_albums') || '{}');
            return Array.isArray(allAlbums[riderId]) ? allAlbums[riderId] : [];
        } catch (e) { return []; }
    }

    function saveRiderAlbum(riderId, photosArray) {
        try {
            const allAlbums = JSON.parse(localStorage.getItem('yp_rider_multi_albums') || '{}');
            allAlbums[riderId] = photosArray;
            localStorage.setItem('yp_rider_multi_albums', JSON.stringify(allAlbums));
        } catch (e) {}
    }

    // 获取某位队员详情页的排版配置 { layout: 'classic' | 'magazine' | 'reverse' | 'gallery_first', albumCols: 3 }
    function getRiderLayoutConfig(riderId) {
        try {
            const allCfg = JSON.parse(localStorage.getItem('yp_rider_page_layouts') || '{}');
            return allCfg[riderId] || { layout: 'classic', albumCols: 3 };
        } catch (e) {
            return { layout: 'classic', albumCols: 3 };
        }
    }

    function saveRiderLayoutConfig(riderId, cfg) {
        try {
            const allCfg = JSON.parse(localStorage.getItem('yp_rider_page_layouts') || '{}');
            allCfg[riderId] = { ...getRiderLayoutConfig(riderId), ...cfg };
            localStorage.setItem('yp_rider_page_layouts', JSON.stringify(allCfg));
        } catch (e) {}
    }

    // =========================================================================
    // 三、通用丝滑拖拽排序引擎（支持队员卡片、商品卡片、队员详情页多图相册）
    // =========================================================================
    function bindLiveSortableGrid(gridEl, itemSelector, idAttr, onOrderChanged) {
        if (!gridEl || !isStrictAdmin()) return;
        let draggingEl = null;

        const items = Array.from(gridEl.querySelectorAll(itemSelector));
        items.forEach(item => {
            item.classList.add('yp-draggable-card');
            item.setAttribute('draggable', 'true');

            // 防止内部图片拦截拖拽
            item.querySelectorAll('img, a').forEach(img => img.setAttribute('draggable', 'false'));

            item.ondragstart = function (e) {
                draggingEl = this;
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', this.getAttribute(idAttr)); } catch (err) {}
                setTimeout(() => this.classList.add('yp-dragging'), 0);
            };

            item.ondragend = function () {
                this.classList.remove('yp-dragging');
                gridEl.querySelectorAll(itemSelector).forEach(el => el.classList.remove('yp-drag-over'));
                draggingEl = null;
                // 读取当前 DOM 最新顺序并回调保存
                const newIds = Array.from(gridEl.querySelectorAll(itemSelector)).map(el => el.getAttribute(idAttr));
                onOrderChanged(newIds);
            };

            item.ondragover = function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!draggingEl || draggingEl === this) return;
                this.classList.add('yp-drag-over');

                // 实时在 DOM 中交换位置（所见即所得）
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
    // 四、全站多语言完整精译数据库（队员介绍、商业赞助、骑游青旅、商城、赛历）
    // =========================================================================
    const rosterTranslations = {
        xuhe: {
            en: {
                role: 'Team Manager / Sports Director / Captain',
                ageSpec: '1997.10 (Age 28) · Shaanxi · Sprinter',
                highlight: 'UCI Level 2 Coach (Level 3 Full Scholarship) | PhD Candidate at UCM Madrid | Spanish C1',
                bio: `<strong>[Education & Academic Background]</strong> PhD Candidate in Moral Philosophy at Complutense University of Madrid (UCM, 2026.10-), M.A. in Advanced Philosophical Studies (UCM, 2023-2025), M.A. in Journalism - Discourse & Communication (UCM, 2019-2021); B.A. in Spanish from Macau University of Science and Technology; Alumni of Tsinghua University High School Zhixin. Visiting Lecturer of Spanish at Zhejiang International Studies University; former Marketing Assistant at RE Cycling; Contracted Writer for Biketo.com (2020 Author of the Year).<br>
                      <strong>[Racing & Coaching Career]</strong> Raced for Salchi Cycling (U23), Avimosa Chozas Team (U23), Huansheng Sports, Guangzhou Fenglei Continental, Wuzhishan 1867 Continental, Kamen Pazin-Kiwi Atlántico Continental, and Sidi Ali Unlock Continental Team. Won Best Young Rider at 2018 Tour of Duolun, 8th in Trofeo de Madrid, 9th in Trofeo de Cosalda, 3rd Team GC at 2021 Tour of Ya'an, and 2nd Elite Men at the 50th Anniversary of China-Spain Diplomatic Relations Race. Trained under Spanish pro coach <strong>Raúl Celdrán (current Red Bull - BORA - hansgrohe coach)</strong> since 2021.`
            },
            es: {
                role: 'Director General / Director Deportivo / Capitán',
                ageSpec: '1997.10 (28 años) · Shaanxi · Esprínter',
                highlight: 'Entrenador UCI Nivel 2 (Beca completa Nivel 3) | Doctorando en la UCM Madrid | Español C1',
                bio: `<strong>[Formación Académica y Profesional]</strong> Doctorando en Filosofía Moral en la Universidad Complutense de Madrid (UCM, 2026.10-), Máster en Estudios Avanzados en Filosofía (UCM, 2023-2025), Máster en Periodismo: Discurso y Comunicación (UCM, 2019-2021); Grado en Español por la MUST. Profesor de español en la Universidad de Estudios Internacionales de Zhejiang; ex asistente de marketing en RE Cycling y articulista premiado en Biketo.com.<br>
                      <strong>[Trayectoria Deportiva y como Entrenador]</strong> Compitió en Salchi Cycling (Sub-23), Avimosa Chozas Team (Sub-23), Huansheng, Guangzhou Fenglei Continental, Wuzhishan 1867 Continental, Kamen Pazin-Kiwi Atlántico y Sidi Ali Unlock Continental. Mejor Joven en el Tour de Duolun 2018, 8º en Trofeo de Madrid, 9º en Trofeo de Cosalda, y Subcampeón Élite en el 50º Aniversario de Relaciones China-España. Desde 2021 se forma junto al entrenador profesional español <strong>Raúl Celdrán (actual entrenador del Red Bull - BORA - hansgrohe)</strong>.`
            }
        },
        dongyuan: {
            en: {
                role: 'Team Leader / Coach / Head Mechanic',
                ageSpec: 'Age 26 · Co-Founder',
                highlight: 'Senior Team Coach & Pro Mechanic | Leading Race Operations & Equipment Since 2023',
                bio: 'Competed in elite adult events such as the China Cycling League Alishan Station and Tour of Duolun before retiring due to injuries. As one of the co-founders of Youth Power Team, he has led the team at national races since early 2023, providing comprehensive training guidance and professional mechanical support.'
            },
            es: {
                role: 'Jefe de Equipo / Entrenador / Mecánico Jefe',
                ageSpec: '26 años · Cofundador',
                highlight: 'Entrenador Senior y Mecánico Profesional | Responsable Técnico y de Competición desde 2023',
                bio: 'Participó en pruebas élite como la Liga China de Ciclismo en Alishan y el Tour de Duolun antes de retirarse por lesiones. Como cofundador de Youth Power, dirige al equipo en competiciones nacionales desde principios de 2023, brindando asistencia integral en entrenamiento y mecánica.'
            }
        },
        zhangbowen: {
            en: {
                role: 'Vice Captain / Assistant',
                ageSpec: 'Age 20 · Youth Team Captain',
                highlight: 'Team Co-Founder | Defeated Hengxiang Pro Riders in a Breakaway Win at 2023 Shangyi Race',
                bio: 'One of the co-founders of Youth Power Team and long-time captain of the youth squad. Multiple-time U18 champion in the Beijing and Hebei Leagues. In summer 2023 at the Shangyi Stage race, he went head-to-head against professional riders from Hengxiang Continental Team and won via a decisive breakaway.'
            },
            es: {
                role: 'Subcapitán / Asistente',
                ageSpec: '20 años · Capitán del Equipo Juvenil',
                highlight: 'Cofundador del Equipo | Victoria en Fuga ante Profesionales de Hengxiang en Shangyi 2023',
                bio: 'Uno de los fundadores de Youth Power y capitán de la escuadra juvenil. Múltiple campeón Sub-18 en las ligas de Pekín y Hebei. En el verano de 2023, en la prueba de Shangyi, derrotó directamente a los corredores profesionales del equipo continental Hengxiang culminando una fuga victoriosa.'
            }
        },
        vladimir: {
            en: {
                role: 'Foreign Leader / Americas Director / Vice Captain',
                ageSpec: 'Age 37 (1988) · 170cm / 58kg · GC All-Rounder',
                highlight: 'Former Team Ukyo & Bank of Gansu Pro | Multiple Top-10 GC Finishes in UCI Stage Races',
                bio: 'A highly experienced GC all-rounder who previously raced for UCI Continental teams such as Team Ukyo and Bank of Gansu, achieving numerous Top-10 General Classification finishes. He brings invaluable mentorship to our young riders and serves as Head of our Americas Division.'
            },
            es: {
                role: 'Líder Extranjero / Director División América / Subcapitán',
                ageSpec: '37 años (1988) · 170cm / 58kg · Corredor Completo de Clasificación General (GC)',
                highlight: 'Ex corredor de Team Ukyo y Bank of Gansu | Múltiples Top-10 en la General de Vueltas UCI',
                bio: 'Corredor colombiano con amplia experiencia internacional en equipos continentales como Team Ukyo y Bank of Gansu con múltiples Top-10 en clasificaciones generales. Aporta experiencia clave para nuestros jóvenes y lidera la división americana del equipo.'
            }
        },
        gabriel: {
            en: {
                role: 'Foreign Lead Climber (KOM)',
                ageSpec: 'Age 24 · Spain · Lead Climber',
                highlight: '1-Hour Power-to-Weight > 6.2 W/kg | Vuelta a Madrid KOM & Best Madrid Rider Winner',
                bio: 'An explosive Spanish climber boasting a 1-hour power-to-weight ratio exceeding 6.2 watt/kg. He previously raced for Spanish squads Caja Rural and Gsport, winning the King of the Mountains (KOM) and Best Madrid Rider jerseys at Vuelta a Madrid.'
            },
            es: {
                role: 'Escalador Principal Extranjero (Líder de Montaña)',
                ageSpec: '24 años · España · Jefe de Filas en Montaña',
                highlight: 'Relación peso-potencia en 1 hora > 6.2 W/kg | Ganador de la Montaña en la Vuelta a Madrid',
                bio: 'Escalador español de altísimo nivel con una relación potencia-peso superior a 6.2 W/kg durante una hora. Ha militado en equipos como Caja Rural y Gsport, conquistando el maillot de la Montaña y Mejor Madrileño en la Vuelta a Madrid.'
            }
        },
        zhanghaoyang: {
            en: {
                role: 'Chinese U23 Rouleur & ITT Specialist',
                ageSpec: 'Age 21 · Mature Rouleur & Time Trialist',
                highlight: '2026 National Open (Zhijiang) Collegiate Champion | Selected for Shanghai Cycling Team',
                bio: 'A mature flat-stage rouleur who finished 5th in the National U-Series Championship and won multiple Elite ITT titles. Winner of the Collegiate Category at the 2026 National Open Race (Zhijiang). Trained in Spain with Team Cycling Galicia in 2024. Officially selected for the Shanghai Cycling Team.'
            },
            es: {
                role: 'Rodador Sub-23 y Especialista en Contrarreloj (CRI)',
                ageSpec: '21 años · Rodador y Especialista CRI',
                highlight: 'Campeón Universitario del Abierto Nacional 2026 (Zhijiang) | Seleccionado por el Equipo de Shanghái',
                bio: 'Rodador consolidado, 5º en el Campeonato Nacional Sub y múltiple campeón en contrarreloj élite. Campeón universitario en el Abierto Nacional de Zhijiang 2026. Entrenó en España con el Team Cycling Galicia en 2024 y ha sido seleccionado por el Equipo de Ciclismo de Shanghái.'
            }
        },
        gongjiayao: {
            en: {
                role: 'Chinese Breakaway & All-Rounder',
                ageSpec: 'Age 25 · Breakaway Specialist',
                highlight: 'Multiple Team GC Winner & Podium Finisher | 6th at Tour of Hainan (Amateur Stage 1)',
                bio: 'A versatile breakaway rider capable of attacking, defending, and leading out sprints. Helped his squads secure numerous team titles (2024 Wanmei Landscape, 2024 Tour of Chongming Island Elite, 2025 Grand Canal Haian). Placed 5th at 2024 Grand Canal Zhenjiang and 6th on Stage 1 of 2025 Tour of Hainan (Amateur).'
            },
            es: {
                role: 'Especialista en Fugas y Todoterreno',
                ageSpec: '25 años · Corredor Completo de Fugas',
                highlight: 'Múltiple Campeón por Equipos | 6º en Etapa 1 del Tour de Hainan (Amateur) y 5º en Gran Canal',
                bio: 'Corredor todoterreno especializado en fugas y lanzamiento de esprints. Pieza clave en múltiples victorias por equipos (Wanmei 2024, Isla Chongming Élite 2024). Individualmente logró el 5º puesto en Zhenjiang 2024 y 6º en la Etapa 1 del Tour de Hainan 2025 (Amateur).'
            }
        },
        jiangwendi: {
            en: {
                role: 'Chinese U23 Climbing Talent',
                ageSpec: 'Age 19 · Promising Young Climber',
                highlight: 'Multiple Top-5 Finishes in Elite Hill Climbs | Strong Contender for Best Young Rider White Jersey',
                bio: 'A promising young climbing talent who competed extensively in elite hill climb races during his junior years, consistently finishing in the Top 5. Key contender for the Best Young Rider (White Jersey) in 2027.'
            },
            es: {
                role: 'Joven Promesa Escalador Sub-23',
                ageSpec: '19 años · Escalador de Proyección',
                highlight: 'Múltiples Top-5 en Escaladas Élite | Firme Candidato al Maillot Blanco de Mejor Joven',
                bio: 'Joven escalador con gran proyección que ha logrado múltiples puestos dentro del Top-5 en competiciones élite de montaña. Principal aspirante al maillot blanco de Mejor Joven en 2027.'
            }
        },
        jinluoxi: {
            en: {
                role: 'Chinese U23 Sprint Prospect',
                ageSpec: 'Age 20 · Explosive Sprinter',
                highlight: 'FTP Increased by 60W+ in Just 5 Months | 1450W Peak Sprint Power (Projected 1850W)',
                bio: 'An extraordinarily gifted sprint prospect who began structured road cycling training in March 2026. Within just 5 months, his FTP surged by over 60W, reaching a peak sprint power of ~1450W with a projected ceiling of 1850W.'
            },
            es: {
                role: 'Promesa del Esprint Sub-23',
                ageSpec: '20 años · Esprínter Explosivo',
                highlight: 'Aumento de +60W en FTP en solo 5 meses | Pico de potencia de 1450W (Proyección 1850W)',
                bio: 'Esprínter de enorme potencial que inició el entrenamiento estructurado en marzo de 2026. En apenas 5 meses incrementó su FTP en más de 60W, alcanzando picos de esprint de 1450W con proyección a 1850W.'
            }
        }
    };

    const productTranslations = {
        101: {
            en: { brand: 'Spect', name: 'Spect Mira Aero Carbon Road Frame Set', desc: 'External steerer + integrated aero bar, T1100+M60 high-modulus carbon. Official store price.', badge: 'Official Price' },
            es: { brand: 'Spect', name: 'Cuadro de Ruta Carbono Aero Spect Mira', desc: 'Tubo de dirección externo + manillar integrado, carbono T1100+M60. Precio oficial.', badge: 'Precio Oficial' }
        },
        102: {
            en: { brand: 'Spect', name: 'Spect Strada Ultralight All-Round Disc Frame Set', desc: 'Fully internal cable routing ultralight climbing & all-round disc frame.', badge: 'Ultralight All-Round' },
            es: { brand: 'Spect', name: 'Cuadro Ultraligero de Disco Spect Strada', desc: 'Cableado totalmente interno, cuadro escalador ultraligero de freno de disco.', badge: 'Ultraligero' }
        },
        103: {
            en: { brand: 'ELVES', name: 'ELVES VANYAR UCI-Approved Ultralight Climbing Frame', desc: 'UCI-certified superlight carbon climbing frameset with custom paint options.', badge: 'UCI Climber' },
            es: { brand: 'ELVES', name: 'Cuadro Escalador Ultraligero ELVES VANYAR (UCI)', desc: 'Cuadro de carbono superligero certificado por la UCI para alta montaña.', badge: 'Escalador UCI' }
        },
        104: {
            en: { brand: 'ELVES', name: 'ELVES FALATH EVO Aero Disc Carbon Road Frame Set', desc: 'UCI-certified aero road disc frameset used by our team riders.', badge: 'Pro Aero Frame' },
            es: { brand: 'ELVES', name: 'Cuadro Aero de Disco ELVES FALATH EVO (UCI)', desc: 'Cuadro aerodinámico certificado por la UCI con cableado integrado.', badge: 'Aero Pro' }
        },
        105: {
            en: { brand: 'ELVES', name: 'ELVES FALATH EXP Flagship Aero Disc Carbon Frame Set', desc: 'Latest flagship Falath EXP aerodynamic carbon frameset with ultra-stiff BB.', badge: 'Flagship EXP' },
            es: { brand: 'ELVES', name: 'Cuadro Carbono Aero ELVES FALATH EXP', desc: 'Última evolución del cuadro aerodinámico Falath EXP de máxima rigidez.', badge: 'Insignia EXP' }
        },
        106: {
            en: { brand: 'ELVES', name: 'ELVES MORI Carbon Gravel Frame Set', desc: 'Built for UCI Gravel World Series racing with wide tire clearance.', badge: 'Gravel Race' },
            es: { brand: 'ELVES', name: 'Cuadro de Carbono Gravel ELVES MORI', desc: 'Diseñado para la Copa del Mundo UCI Gravel con amplio paso de rueda.', badge: 'Gravel Pro' }
        },
        107: {
            en: { brand: 'ZERAY', name: 'ZERAY ZP-115 Carbon Road Clipless Pedals (LOOK KEO)', desc: 'Lightweight carbon body road pedals, smooth sealed bearings, LOOK KEO compatible.', badge: 'Official Price' },
            es: { brand: 'ZERAY', name: 'Pedales Automáticos de Carbono ZERAY ZP-115 (LOOK)', desc: 'Cuerpo ligero de fibra de carbono, rodamientos sellados, compatibles con LOOK KEO.', badge: 'Precio Oficial' }
        },
        108: {
            en: { brand: 'ESSEN', name: 'ESSEN HELA Aero Pro Road Cycling Helmet', desc: 'In-mold aerodynamic helmet (~255g lightweight protection), official team issue.', badge: 'Genuine HELA' },
            es: { brand: 'ESSEN', name: 'Casco Aerodinámico de Ciclismo ESSEN HELA', desc: 'Casco aerodinámico ultraligero (~255g) de competición, equipamiento oficial.', badge: 'HELA Oficial' }
        }
    };

    // =========================================================================
    // 五、队员介绍列表 (Roster) 与 商城商品 (Products) 拖拽排序 & 列数控制
    // =========================================================================
    function getRosterGridCols() { return localStorage.getItem('yp_roster_grid_cols') || '3'; }
    function getShopGridCols() { return localStorage.getItem('yp_shop_grid_cols') || '4'; }

    window.setRosterGridCols = function (cols) {
        if (!isStrictAdmin()) return;
        localStorage.setItem('yp_roster_grid_cols', String(cols));
        window.renderRoster();
        if (typeof showToast === 'function') showToast(`队员列表已切换为：每行 ${cols} 列`);
    };

    window.setShopGridCols = function (cols) {
        if (!isStrictAdmin()) return;
        localStorage.setItem('yp_shop_grid_cols', String(cols));
        window.renderProducts('all');
        if (typeof showToast === 'function') showToast(`商城商品已切换为：每行 ${cols} 列`);
    };

    // 按钮微调队员顺序（与鼠标拖拽形成双保险）
    window.moveRosterStep = function (id, dir) {
        if (!isStrictAdmin()) return;
        const list = getSavedRosterData();
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= list.length) return;
        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
        window.renderRoster();
        if (typeof showToast === 'function') showToast('已移动队员档案顺序');
    };

    // 获取持久化的商城商品顺序
    function getOrderedProducts(filter = 'all') {
        if (typeof products === 'undefined') return [];
        try {
            const savedOrder = JSON.parse(localStorage.getItem('yp_shop_order_ids') || '[]');
            if (savedOrder.length > 0) {
                products.sort((a, b) => {
                    const ia = savedOrder.indexOf(String(a.id));
                    const ib = savedOrder.indexOf(String(b.id));
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                });
            }
        } catch (e) {}
        return filter === 'all' ? products : products.filter(p => p.category === filter);
    }

    window.moveProductStep = function (id, dir) {
        if (!isStrictAdmin() || typeof products === 'undefined') return;
        getOrderedProducts('all');
        const idx = products.findIndex(p => String(p.id) === String(id));
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= products.length) return;
        const temp = products[idx];
        products[idx] = products[targetIdx];
        products[targetIdx] = temp;
        localStorage.setItem('yp_shop_order_ids', JSON.stringify(products.map(p => String(p.id))));
        window.renderProducts('all');
        if (typeof showToast === 'function') showToast('已移动商城商品排序');
    };

    function injectAdminRosterLayoutBar() {
        const rosterPage = document.querySelector('#page-roster .max-w-7xl');
        if (!rosterPage) return;
        let bar = document.getElementById('admin-roster-layout-bar');
        if (!isStrictAdmin()) {
            if (bar) bar.remove();
            return;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'admin-roster-layout-bar';
            bar.setAttribute('data-no-edit', 'true');
            bar.className = 'mb-6 p-4 rounded-2xl bg-gray-800 border-2 border-yp-lime flex flex-wrap items-center justify-between gap-4 text-xs';
            bar.innerHTML = `
                <div class="flex items-center space-x-2 text-yp-lime font-bold">
                    <i class="fa-solid fa-up-down-left-right text-base"></i>
                    <span>管理员排版已启用：直接按住下方任意队员卡片【拖动到目标位置】或点卡片上的【◀ ▶】即可调整先后顺序！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行排版列数：</span>
                    <button onclick="setRosterGridCols(2)" class="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-yp-green text-white font-bold transition">每行 2 人</button>
                    <button onclick="setRosterGridCols(3)" class="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-yp-green text-white font-bold transition">每行 3 人</button>
                    <button onclick="setRosterGridCols(4)" class="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-yp-green text-white font-bold transition">每行 4 人</button>
                </div>
            `;
            const grid = document.getElementById('roster-grid');
            if (grid) rosterPage.insertBefore(bar, grid);
        }
    }

    function injectAdminShopLayoutBar() {
        const shopPage = document.getElementById('page-shop');
        if (!shopPage) return;
        let bar = document.getElementById('admin-shop-layout-bar');
        if (!isStrictAdmin()) {
            if (bar) bar.remove();
            return;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'admin-shop-layout-bar';
            bar.setAttribute('data-no-edit', 'true');
            bar.className = 'mb-6 p-4 rounded-2xl bg-gray-900 text-white border-2 border-yp-lime flex flex-wrap items-center justify-between gap-4 text-xs';
            bar.innerHTML = `
                <div class="flex items-center space-x-2 text-yp-lime font-bold">
                    <i class="fa-solid fa-up-down-left-right text-base"></i>
                    <span>管理员商城排版：直接按住下方任意器材商品卡片【拖动】或点击【◀ ▶】即可调整商品展示顺序！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行商品列数：</span>
                    <button onclick="setShopGridCols(2)" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-yp-green text-white font-bold transition">2 列</button>
                    <button onclick="setShopGridCols(3)" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-yp-green text-white font-bold transition">3 列</button>
                    <button onclick="setShopGridCols(4)" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-yp-green text-white font-bold transition">4 列</button>
                </div>
            `;
            const grid = document.getElementById('product-grid');
            if (grid) shopPage.insertBefore(bar, grid);
        }
    }

    // 重写队员列表渲染
    window.renderRoster = function () {
        const rosterData = typeof getSavedRosterData === 'function' ? getSavedRosterData() : [];
        const savedPhotos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
        const isAdmin = isStrictAdmin();
        const lang = window.__ypLang || 'zh';
        const grid = document.getElementById('roster-grid');
        if (!grid) return;

        const cols = getRosterGridCols();
        grid.className = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7`;
        injectAdminRosterLayoutBar();

        grid.innerHTML = rosterData.map(m => {
            const tr = (lang !== 'zh' && rosterTranslations[m.id] && rosterTranslations[m.id][lang]) ? rosterTranslations[m.id][lang] : null;
            const roleText = tr ? tr.role : (lang === 'en' ? (m.role_en || m.role_zh) : (lang === 'es' ? (m.role_es || m.role_zh) : m.role_zh));
            const ageText = tr ? tr.ageSpec : m.ageSpec;
            const highText = tr ? tr.highlight : m.highlight;
            const bioText = tr ? tr.bio : m.bio;
            const album = getRiderAlbum(m.id);
            const photoUrl = savedPhotos[m.id] || m.photo || (album.length > 0 ? album[0].url : '');

            const slotLabel = lang === 'en' ? '2027 Official Portrait Slot' : (lang === 'es' ? 'Espacio para Foto Oficial 2027' : '2027赛季官方定妆照预留位');
            const viewProfileLabel = lang === 'en' ? 'View Full Profile & Photo Album' : (lang === 'es' ? 'Ver Perfil y Álbum de Fotos' : `进入个人主页与多图相册 (${album.length}张)`);
            const delLabel = lang === 'en' ? 'Delete' : (lang === 'es' ? 'Eliminar' : '删除');

            return `
                <div class="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative" data-roster-id="${m.id}">
                    <div>
                        <div class="relative h-60 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden">
                            ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" draggable="false" class="w-full h-full object-cover">` : `
                                <div class="text-center p-6">
                                    <div class="w-16 h-16 rounded-full bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2 text-gray-500">
                                        <i class="fa-solid fa-user-astronaut text-2xl"></i>
                                    </div>
                                    <span class="text-xs text-gray-500 font-bold block">${slotLabel}</span>
                                    <span class="text-[11px] text-gray-600">${m.name}</span>
                                </div>
                            `}
                            <span class="roster-role absolute top-3 left-3 px-2.5 py-1 bg-gray-900/90 border border-gray-700 text-yp-lime text-xs font-bold rounded">${roleText}</span>
                            <span class="absolute top-3 right-3 text-lg">${m.flag || '🇨🇳'}</span>
                            ${isAdmin ? `
                                <div data-no-edit="true" class="absolute bottom-3 left-3 flex items-center space-x-1">
                                    <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow cursor-grab flex items-center">
                                        <i class="fa-solid fa-grip-vertical mr-1"></i>按住拖动
                                    </span>
                                    <button onclick="moveRosterStep('${m.id}', -1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded shadow" title="向前移动">◀</button>
                                    <button onclick="moveRosterStep('${m.id}', 1)" class="w-7 h-7 bg-gray-900/90 hover:bg-yp-green text-white text-xs font-black rounded shadow" title="向后移动">▶</button>
                                </div>
                                <button onclick="triggerMemberPhotoUpload('${m.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-2.5 py-1 bg-yp-red hover:bg-red-700 text-white text-[11px] font-black rounded-lg shadow-lg flex items-center space-x-1">
                                    <i class="fa-solid fa-camera"></i>
                                    <span>换封面</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="p-6">
                            <div class="roster-agespec text-xs text-gray-400 mb-1">${ageText}</div>
                            <h3 onclick="openEntitySubpage('rider', '${m.id}')" class="roster-name text-2xl font-black text-white hover:text-yp-lime cursor-pointer mb-2">${m.name}</h3>
                            <div class="roster-highlight p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${highText}</div>
                            <div class="roster-bio text-xs text-gray-300 leading-relaxed space-y-1.5">${bioText}</div>
                        </div>
                    </div>
                    <div data-no-edit="true" class="px-6 py-3 bg-gray-900/70 border-t border-gray-700 flex items-center justify-between text-xs">
                        <button onclick="openEntitySubpage('rider', '${m.id}')" class="text-yp-lime font-bold hover:underline flex items-center">
                            <i class="fa-regular fa-images mr-1.5"></i><span>${viewProfileLabel}</span> <i class="fa-solid fa-arrow-right ml-1"></i>
                        </button>
                        ${isAdmin ? `<button onclick="deleteRosterMember('${m.id}')" class="text-red-400 hover:text-red-300 font-bold"><i class="fa-solid fa-trash mr-1"></i>${delLabel}</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // 绑定实时拖拽排序
        bindLiveSortableGrid(grid, '[data-roster-id]', 'data-roster-id', (newIds) => {
            const currentList = getSavedRosterData();
            const reordered = newIds.map(id => currentList.find(r => String(r.id) === String(id))).filter(Boolean);
            if (reordered.length === currentList.length) {
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(reordered));
                if (typeof showToast === 'function') showToast('✅ 队员档案顺序已实时保存！');
            }
        });
    };

    // 重写商城商品渲染（支持实时拖拽排序 + 按钮调序 + 列数切换）
    window.renderProducts = function (filter = 'all') {
        const grid = document.getElementById('product-grid');
        if (!grid || typeof products === 'undefined') return;
        const lang = window.__ypLang || 'zh';
        const isAdmin = isStrictAdmin();
        const cols = getShopGridCols();
        grid.className = `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-6`;
        injectAdminShopLayoutBar();

        const list = getOrderedProducts(filter);
        const priceLabel = lang === 'en' ? 'Official Store Price' : (lang === 'es' ? 'Precio Oficial' : '官方同步售价');
        const buyLabel = lang === 'en' ? 'Add to Cart' : (lang === 'es' ? 'Añadir' : '选购');

        grid.innerHTML = list.map(p => {
            const tr = (lang !== 'zh' && productTranslations[p.id] && productTranslations[p.id][lang]) ? productTranslations[p.id][lang] : null;
            const brand = tr ? tr.brand : p.brand;
            const name = tr ? tr.name : p.name;
            const desc = tr ? tr.desc : p.desc;
            const badge = tr ? tr.badge : p.badge;

            return `
                <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between relative" data-product-id="${p.id}">
                    <div>
                        <div class="h-40 bg-gradient-to-br from-gray-900 via-gray-800 to-yp-darkGreen relative flex items-center justify-center p-4 overflow-hidden">
                            ${p.imgUrl ? `<img src="${p.imgUrl}" draggable="false" class="w-full h-full object-cover">` : `<i class="fa-solid ${p.icon || 'fa-bicycle'} text-5xl text-white/90"></i>`}
                            <span class="absolute top-3 left-3 px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[11px] font-black rounded">${badge}</span>
                            <span class="absolute top-3 right-3 text-[11px] text-gray-300 font-bold">${brand}</span>
                            ${isAdmin ? `
                                <div data-no-edit="true" class="absolute bottom-2 left-2 flex items-center space-x-1">
                                    <span class="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab">
                                        <i class="fa-solid fa-grip-vertical mr-1"></i>拖动排序
                                    </span>
                                    <button onclick="moveProductStep('${p.id}', -1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">◀</button>
                                    <button onclick="moveProductStep('${p.id}', 1)" class="w-6 h-6 bg-gray-900/90 hover:bg-yp-green text-white text-[10px] font-black rounded">▶</button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="p-4">
                            <h3 onclick="openEntitySubpage('product', '${p.id}')" class="font-black text-gray-900 hover:text-yp-darkGreen cursor-pointer text-sm leading-snug mb-1.5">${name}</h3>
                            <p class="text-xs text-gray-500 leading-relaxed">${desc}</p>
                        </div>
                    </div>
                    <div class="px-4 pb-4 pt-3 border-t border-gray-100 flex items-center justify-between" data-no-edit="true">
                        <div>
                            <span class="text-[10px] text-gray-400 block">${priceLabel}</span>
                            <div class="text-lg font-black text-yp-darkGreen">¥${p.price}</div>
                        </div>
                        <button onclick="addToCart(${p.id})" class="px-3.5 py-2 bg-gray-900 hover:bg-yp-alipay text-white text-xs font-bold rounded-xl transition flex items-center space-x-1">
                            <i class="fa-solid fa-cart-plus"></i>
                            <span>${buyLabel}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 绑定商城商品实时拖拽排序
        bindLiveSortableGrid(grid, '[data-product-id]', 'data-product-id', (newIds) => {
            localStorage.setItem('yp_shop_order_ids', JSON.stringify(newIds));
            if (typeof showToast === 'function') showToast('✅ 商城器材展示顺序已实时保存！');
        });
    };

    // =========================================================================
    // 六、队员个人详情页：支持【无限添加多张图片 + 拖拽排图 + 4种页面排版切换】
    // =========================================================================
    let currentDetailRiderId = null;

    function initDynamicSubpageContainer() {
        const main = document.getElementById('editable-main');
        if (!main || document.getElementById('page-subdetail')) return;
        const detailSec = document.createElement('div');
        detailSec.id = 'page-subdetail';
        detailSec.className = 'page-section py-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8';
        detailSec.innerHTML = `<div id="subdetail-content"></div>`;
        main.appendChild(detailSec);
    }

    // 切换某位队员详情页的排版风格
    window.changeRiderDetailLayout = function (riderId, layoutType) {
        if (!isStrictAdmin()) return;
        saveRiderLayoutConfig(riderId, { layout: layoutType });
        window.openEntitySubpage('rider', riderId);
        if (typeof showToast === 'function') showToast('✨ 队员详情页排版已切换并保存！');
    };

    // 切换某位队员详情页内相册的每行图片列数
    window.changeRiderAlbumCols = function (riderId, cols) {
        if (!isStrictAdmin()) return;
        saveRiderLayoutConfig(riderId, { albumCols: cols });
        window.openEntitySubpage('rider', riderId);
        if (typeof showToast === 'function') showToast(`📸 队员相册已切换为每行 ${cols} 张图片`);
    };

    // 批量上传多张队员照片到该队员详情页相册
    window.handleRiderMultiPhotosUpload = function (event, riderId) {
        if (!isStrictAdmin()) return;
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const album = getRiderAlbum(riderId);
        let loadedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function (ev) {
                album.push({
                    id: 'rp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    url: ev.target.result,
                    caption: file.name.replace(/\.[^/.]+$/, '')
                });
                loadedCount++;
                if (loadedCount === files.length) {
                    saveRiderAlbum(riderId, album);
                    window.openEntitySubpage('rider', riderId);
                    window.renderRoster();
                    if (typeof showToast === 'function') showToast(`✅ 已成功为该队员添加 ${files.length} 张新照片！`);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    // 通过外链URL为队员添加新照片
    window.handleRiderUrlPhotoAdd = function (e, riderId) {
        e.preventDefault();
        if (!isStrictAdmin()) return;
        const urlInput = document.getElementById('rider-extra-photo-url');
        const capInput = document.getElementById('rider-extra-photo-cap');
        const url = urlInput ? urlInput.value.trim() : '';
        const caption = capInput ? capInput.value.trim() : '';
        if (!url) return;

        const album = getRiderAlbum(riderId);
        album.push({
            id: 'rp_' + Date.now(),
            url,
            caption: caption || '队员赛场风采'
        });
        saveRiderAlbum(riderId, album);
        window.openEntitySubpage('rider', riderId);
        window.renderRoster();
        if (typeof showToast === 'function') showToast('✅ 已添加新照片至队员相册！');
    };

    // 删除队员相册中的某张照片
    window.deleteRiderAlbumPhoto = function (riderId, photoId) {
        if (!isStrictAdmin()) return;
        const album = getRiderAlbum(riderId).filter(p => String(p.id) !== String(photoId));
        saveRiderAlbum(riderId, album);
        window.openEntitySubpage('rider', riderId);
        window.renderRoster();
        if (typeof showToast === 'function') showToast('已从相册移除该照片');
    };

    // 将相册中的某张照片设为队员主封面
    window.setRiderMainCoverFromAlbum = function (riderId, photoUrl) {
        if (!isStrictAdmin()) return;
        const savedPhotos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
        savedPhotos[riderId] = photoUrl;
        localStorage.setItem('yp_member_photos', JSON.stringify(savedPhotos));
        window.openEntitySubpage('rider', riderId);
        window.renderRoster();
        if (typeof showToast === 'function') showToast('⭐ 已将该照片设为队员档案主封面！');
    };

    // 左右按钮移动相册图片顺序
    window.moveRiderAlbumPhotoStep = function (riderId, photoId, dir) {
        if (!isStrictAdmin()) return;
        const album = getRiderAlbum(riderId);
        const idx = album.findIndex(p => String(p.id) === String(photoId));
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= album.length) return;
        const temp = album[idx];
        album[idx] = album[targetIdx];
        album[targetIdx] = temp;
        saveRiderAlbum(riderId, album);
        window.openEntitySubpage('rider', riderId);
    };

    // 打开队员或商品详情独立子页面
    window.openEntitySubpage = function (type, id) {
        const container = document.getElementById('subdetail-content');
        if (!container) return;
        const lang = window.__ypLang || 'zh';
        const isAdmin = isStrictAdmin();

        if (type === 'rider' && typeof getSavedRosterData === 'function') {
            currentDetailRiderId = id;
            const list = getSavedRosterData();
            const photos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
            const m = list.find(r => String(r.id) === String(id));
            if (!m) return;

            const tr = (lang !== 'zh' && rosterTranslations[m.id] && rosterTranslations[m.id][lang]) ? rosterTranslations[m.id][lang] : null;
            const roleText = tr ? tr.role : m.role_zh;
            const ageText = tr ? tr.ageSpec : m.ageSpec;
            const highText = tr ? tr.highlight : m.highlight;
            const bioText = tr ? tr.bio : m.bio;

            const album = getRiderAlbum(m.id);
            const mainImg = photos[m.id] || m.photo || (album.length > 0 ? album[0].url : 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80');
            const cfg = getRiderLayoutConfig(m.id);

            // 管理员专属：页面排版切换器 & 多图批量上传工具箱
            const adminToolbarHtml = isAdmin ? `
                <div data-no-edit="true" class="mb-8 p-5 rounded-3xl bg-gray-900 text-white border-2 border-yp-lime shadow-xl space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
                        <div>
                            <span class="px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[11px] font-black rounded">管理员专属 · 队员主页排版与多图相册中心</span>
                            <h4 class="text-sm font-black mt-1">当前队员：${m.name}（您可以自由切换页面布局，或一次上传多张比赛/生活照片）</h4>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5 text-xs">
                            <span class="text-gray-400 font-bold mr-1">页面排版风格：</span>
                            <button onclick="changeRiderDetailLayout('${m.id}', 'classic')" class="px-3 py-1.5 rounded-lg font-bold ${cfg.layout === 'classic' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">① 左图右文</button>
                            <button onclick="changeRiderDetailLayout('${m.id}', 'magazine')" class="px-3 py-1.5 rounded-lg font-bold ${cfg.layout === 'magazine' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">② 杂志巨幕全宽</button>
                            <button onclick="changeRiderDetailLayout('${m.id}', 'reverse')" class="px-3 py-1.5 rounded-lg font-bold ${cfg.layout === 'reverse' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">③ 左文右图</button>
                            <button onclick="changeRiderDetailLayout('${m.id}', 'gallery_first')" class="px-3 py-1.5 rounded-lg font-bold ${cfg.layout === 'gallery_first' ? 'bg-yp-green text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">④ 多图画廊优先</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs">
                        <div class="lg:col-span-5">
                            <label class="cursor-pointer w-full py-3 px-4 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl flex items-center justify-center space-x-2 shadow transition">
                                <i class="fa-solid fa-images text-base"></i>
                                <span>➕ 点击批量选择本地照片（支持一次选多张）</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange="handleRiderMultiPhotosUpload(event, '${m.id}')">
                            </label>
                        </div>
                        <form onsubmit="handleRiderUrlPhotoAdd(event, '${m.id}')" class="lg:col-span-7 flex flex-wrap sm:flex-nowrap gap-2">
                            <input type="url" id="rider-extra-photo-url" required placeholder="或粘贴图片链接 https://..." class="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                            <input type="text" id="rider-extra-photo-cap" placeholder="照片说明(选填)" class="w-36 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-white">
                            <button type="submit" class="px-4 py-2.5 bg-amber-400 text-gray-900 font-black rounded-xl hover:bg-amber-300 shrink-0">添加图片</button>
                        </form>
                    </div>
                </div>
            ` : '';

            // 队员多图相册网格 HTML
            const albumSectionHtml = `
                <div class="mt-10 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs">
                    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <span class="text-yp-darkGreen font-black text-xs uppercase">RIDER PHOTO GALLERY</span>
                            <h3 class="text-xl font-black text-gray-900 mt-0.5">📸 ${m.name} · 个人赛事与风采相册 (${album.length}张)</h3>
                        </div>
                        ${isAdmin ? `
                            <div class="flex items-center space-x-2 text-xs" data-no-edit="true">
                                <span class="text-gray-500 font-bold">相册每行列数：</span>
                                <button onclick="changeRiderAlbumCols('${m.id}', 2)" class="px-2.5 py-1 rounded ${cfg.albumCols == 2 ? 'bg-yp-darkGreen text-white font-bold' : 'bg-gray-100 text-gray-700'}">2列大图</button>
                                <button onclick="changeRiderAlbumCols('${m.id}', 3)" class="px-2.5 py-1 rounded ${cfg.albumCols == 3 ? 'bg-yp-darkGreen text-white font-bold' : 'bg-gray-100 text-gray-700'}">3列标准</button>
                                <button onclick="changeRiderAlbumCols('${m.id}', 4)" class="px-2.5 py-1 rounded ${cfg.albumCols == 4 ? 'bg-yp-darkGreen text-white font-bold' : 'bg-gray-100 text-gray-700'}">4列紧凑</button>
                            </div>
                        ` : ''}
                    </div>
                    ${album.length === 0 ? `
                        <div class="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                            暂未上传更多个人相册图片。${isAdmin ? '管理员请点击上方绿色按钮批量上传多张队员照片！' : ''}
                        </div>
                    ` : `
                        <div id="rider-album-sortable-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cfg.albumCols || 3} gap-5">
                            ${album.map(p => `
                                <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group relative" data-album-photo-id="${p.id}">
                                    <div class="h-64 overflow-hidden bg-black flex items-center justify-center">
                                        <img src="${p.url}" alt="${p.caption || m.name}" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                                    </div>
                                    ${p.caption ? `<div class="p-3 bg-white text-xs font-bold text-gray-800">${p.caption}</div>` : ''}
                                    ${isAdmin ? `
                                        <div data-no-edit="true" class="absolute top-2.5 left-2.5 flex items-center space-x-1">
                                            <span class="px-2 py-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded shadow cursor-grab">
                                                <i class="fa-solid fa-grip-vertical mr-1"></i>拖动排图
                                            </span>
                                            <button onclick="moveRiderAlbumPhotoStep('${m.id}', '${p.id}', -1)" class="w-6 h-6 bg-gray-900/90 text-white text-[10px] font-bold rounded">◀</button>
                                            <button onclick="moveRiderAlbumPhotoStep('${m.id}', '${p.id}', 1)" class="w-6 h-6 bg-gray-900/90 text-white text-[10px] font-bold rounded">▶</button>
                                        </div>
                                        <div data-no-edit="true" class="absolute top-2.5 right-2.5 flex items-center space-x-1">
                                            <button onclick="setRiderMainCoverFromAlbum('${m.id}', '${p.url}')" class="px-2 py-1 bg-yp-green text-white text-[10px] font-bold rounded shadow" title="设为主封面">设为封面</button>
                                            <button onclick="deleteRiderAlbumPhoto('${m.id}', '${p.id}')" class="w-6 h-6 bg-yp-red text-white text-[10px] font-bold rounded shadow" title="删除">✕</button>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;

            // 根据管理员选择的 4 种排版生成主体结构
            let profileCardHtml = '';
            if (cfg.layout === 'magazine') {
                profileCardHtml = `
                    <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800">
                        <div class="h-96 w-full bg-gray-800 relative">
                            <img src="${mainImg}" alt="${m.name}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                            <div class="absolute bottom-6 left-8 right-8 flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <span class="px-3 py-1 bg-yp-green text-white text-xs font-bold rounded">${roleText}</span>
                                    <h2 class="text-4xl font-black mt-2">${m.name} <span class="text-2xl">${m.flag || '🇨🇳'}</span></h2>
                                    <p class="text-xs text-gray-300 mt-1">${ageText}</p>
                                </div>
                            </div>
                        </div>
                        <div class="p-8 sm:p-12 max-w-4xl mx-auto">
                            <div class="p-4 rounded-xl bg-gray-800 border border-gray-700 text-sm text-yp-lime font-bold mb-6">${highText}</div>
                            <div class="text-sm text-gray-200 leading-relaxed space-y-3">${bioText}</div>
                        </div>
                    </div>
                    ${albumSectionHtml}
                `;
            } else if (cfg.layout === 'reverse') {
                profileCardHtml = `
                    <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                        <div class="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <span class="px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${roleText}</span>
                                    <span class="text-2xl">${m.flag || '🇨🇳'}</span>
                                </div>
                                <h2 class="text-3xl font-black mb-1">${m.name}</h2>
                                <p class="text-xs text-gray-400 mb-4">${ageText}</p>
                                <div class="p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-yp-lime font-bold mb-5">${highText}</div>
                                <div class="text-sm text-gray-200 leading-relaxed space-y-2">${bioText}</div>
                            </div>
                        </div>
                        <div class="md:col-span-5 bg-gray-800 min-h-[340px]">
                            <img src="${mainImg}" alt="${m.name}" class="w-full h-full object-cover">
                        </div>
                    </div>
                    ${albumSectionHtml}
                `;
            } else if (cfg.layout === 'gallery_first') {
                profileCardHtml = `
                    ${albumSectionHtml}
                    <div class="mt-8 bg-gray-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-800">
                        <div class="flex items-center justify-between mb-3">
                            <span class="px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${roleText}</span>
                            <span class="text-2xl">${m.flag || '🇨🇳'}</span>
                        </div>
                        <h2 class="text-3xl font-black mb-1">${m.name}</h2>
                        <p class="text-xs text-gray-400 mb-4">${ageText}</p>
                        <div class="p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-yp-lime font-bold mb-5">${highText}</div>
                        <div class="text-sm text-gray-200 leading-relaxed space-y-2">${bioText}</div>
                    </div>
                `;
            } else {
                // 默认 classic 左图右文
                profileCardHtml = `
                    <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                        <div class="md:col-span-5 bg-gray-800 min-h-[340px]">
                            <img src="${mainImg}" alt="${m.name}" class="w-full h-full object-cover">
                        </div>
                        <div class="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <span class="px-3 py-1 bg-yp-green/20 text-yp-lime text-xs font-bold rounded">${roleText}</span>
                                    <span class="text-2xl">${m.flag || '🇨🇳'}</span>
                                </div>
                                <h2 class="text-3xl font-black mb-1">${m.name}</h2>
                                <p class="text-xs text-gray-400 mb-4">${ageText}</p>
                                <div class="p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-yp-lime font-bold mb-5">${highText}</div>
                                <div class="text-sm text-gray-200 leading-relaxed space-y-2">${bioText}</div>
                            </div>
                            <div class="mt-8 pt-4 border-t border-gray-800 text-xs text-gray-400">Youth Power Continental Team · Official Rider Profile</div>
                        </div>
                    </div>
                    ${albumSectionHtml}
                `;
            }

            container.innerHTML = `
                <button onclick="switchPage('roster')" class="mb-6 inline-flex items-center text-xs font-bold text-yp-darkGreen hover:underline">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> 返回 2027 队员介绍列表
                </button>
                ${adminToolbarHtml}
                ${profileCardHtml}
            `;

            // 为队员详情页内的相册绑定实时拖拽排图
            const albumGrid = document.getElementById('rider-album-sortable-grid');
            if (albumGrid) {
                bindLiveSortableGrid(albumGrid, '[data-album-photo-id]', 'data-album-photo-id', (newPhotoIds) => {
                    const currentAlbum = getRiderAlbum(m.id);
                    const reordered = newPhotoIds.map(pid => currentAlbum.find(x => String(x.id) === String(pid))).filter(Boolean);
                    if (reordered.length === currentAlbum.length) {
                        saveRiderAlbum(m.id, reordered);
                        if (typeof showToast === 'function') showToast('✅ 队员相册图片顺序已保存！');
                    }
                });
            }

        } else if (type === 'product' && typeof products !== 'undefined') {
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            const tr = (lang !== 'zh' && productTranslations[p.id] && productTranslations[p.id][lang]) ? productTranslations[p.id][lang] : null;
            container.innerHTML = `
                <button onclick="switchPage('shop')" class="mb-6 inline-flex items-center text-xs font-bold text-yp-darkGreen hover:underline">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> 返回官方器材商城
                </button>
                <div class="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div class="md:col-span-5 h-72 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-yp-darkGreen flex items-center justify-center">
                        <i class="fa-solid ${p.icon || 'fa-bicycle'} text-7xl text-white/90"></i>
                    </div>
                    <div class="md:col-span-7">
                        <span class="px-3 py-1 bg-green-100 text-yp-darkGreen text-xs font-black rounded">${tr ? tr.brand : p.brand}</span>
                        <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-3 mb-3">${tr ? tr.name : p.name}</h2>
                        <div class="text-3xl font-black text-yp-darkGreen mb-4">¥${p.price}</div>
                        <p class="text-sm text-gray-600 leading-relaxed mb-6">${tr ? tr.desc : p.desc}</p>
                        <button onclick="addToCart(${p.id})" class="px-6 py-3.5 bg-yp-darkGreen hover:bg-yp-green text-white font-black rounded-xl text-sm transition">
                            <i class="fa-solid fa-cart-plus mr-1.5"></i> 加入购物车
                        </button>
                    </div>
                </div>
            `;
        }
        window.switchPage('subdetail');
    };

    // =========================================================================
    // 七、全站词典 + 微软翻译 (Microsoft Edge/Bing) 引擎
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
            "报班/教练训练": "Join Coaching",
            "千岛湖亚运村 · 车队官方青年旅舍": "Qiandao Lake Asian Games Village · Official Team Youth Hostel",
            "基地与骑游动态说明": "Hostel Base & Club Ride Updates",
            "La Fuga 青野·驿 住宿/骑游咨询": "La Fuga Youth Hostel Stay & Ride Inquiry",
            "提交入住 / 骑游咨询": "Submit Hostel / Ride Inquiry",
            "车队最新骑游招募与赛事动态": "Latest Team Club Rides & Race Announcements",
            "资金开销类目、招商需求与赞助商权益": "Annual Budget Breakdown, Sponsorship Tiers & Commercial Rights",
            "2027 招商合作席位需求": "2027 Sponsorship Tiers & Investment",
            "🏆 车队主冠名": "🏆 First Title Sponsor",
            "🥈 车队副冠名": "🥈 Second Title Sponsor",
            "👕 队服胸前 Logo": "👕 Jersey Chest Logo",
            "💪 队服袖子 Logo": "💪 Jersey Sleeve Logo",
            "核心亮点 · 品牌出海与海外渠道建立": "Key Highlight · Global Brand Expansion & Overseas Dealer Network",
            "南美洲（哥伦比亚）与西班牙实体车店销售网络搭建": "Direct B2B Sales Network in South America (Colombia) & Spain",
            "📺 国内外核心赛事电视直播": "📺 Global & Domestic Live TV Broadcasts",
            "🛍️ 70个比赛日赛场展销与双基地展示": "🛍️ 70 Race-Day On-Site Expos & Dual Base Showrooms"
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
            "报班/教练训练": "Inscribirse",
            "千岛湖亚运村 · 车队官方青年旅舍": "Villa de los Juegos Asiáticos de Qiandao · Albergue Oficial del Equipo",
            "基地与骑游动态说明": "Información sobre el Albergue Base y Rutas Ciclistas",
            "La Fuga 青野·驿 住宿/骑游咨询": "Reserva de Alojamiento en La Fuga y Consulta de Rutas",
            "提交入住 / 骑游咨询": "Enviar Consulta de Alojamiento / Ruta",
            "车队最新骑游招募与赛事动态": "Últimas Convocatorias de Rutas y Noticias del Equipo",
            "资金开销类目、招商需求与赞助商权益": "Presupuesto Anual, Niveles de Patrocinio y Derechos Comerciales",
            "2027 招商合作席位需求": "Niveles de Patrocinio Temporada 2027",
            "🏆 车队主冠名": "🏆 Patrocinador Principal (Primer Nombre)",
            "🥈 车队副冠名": "🥈 Copatrocinador Principal (Segundo Nombre)",
            "👕 队服胸前 Logo": "👕 Logo en el Pecho del Maillot",
            "💪 队服袖子 Logo": "💪 Logo en la Manga del Maillot",
            "核心亮点 · 品牌出海与海外渠道建立": "Punto Clave · Expansión Internacional de Marca en Latinoamérica y España",
            "南美洲（哥伦比亚）与西班牙实体车店销售网络搭建": "Red Comercial Directa con Tiendas de Ciclismo en Colombia y España",
            "📺 国内外核心赛事电视直播": "📺 Retransmisión Televisiva en Directo en América, Europa y China",
            "🛍️ 70个比赛日赛场展销与双基地展示": "🛍️ Exposición en 70 Días de Competición y Showrooms Permanentes"
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
    // 八、初始化与全局挂载
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        safeRemoveQiuHaolin();
        initDynamicSubpageContainer();

        window.renderRoster();
        window.renderProducts('all');

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
                window.renderRoster();
                window.renderProducts('all');
                if (window.__ypLang !== 'zh') {
                    setTimeout(() => window.translateEntireDOM(window.__ypLang), 50);
                }
            };
        }
    });
})();
