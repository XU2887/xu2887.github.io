/**
 * 青年力量洲际队官网 (Youth Power Continental Team) - 终极版扩展插件 (custom-update.js)
 * 核心升级：
 * 1. 【100%全站英/西精译词库 + 微软(Microsoft Bing/Edge)神经网络翻译引擎】：彻底解决队员介绍、商业赞助、骑游详情无法翻译的问题
 * 2. 【管理员拖拽改变布局】：管理员可直接鼠标拖动队员档案卡片、商城卡片调整排列顺序，并支持切换每行显示2/3/4列布局
 * 3. 【严格管理员唯一权限】：所有编辑、拖拽、上传、新建页面功能仅对管理员 (team_youthpower@outlook.com) 开放
 */

(function () {
    'use strict';

    window.__ypLang = 'zh';

    // =========================================================================
    // 一、严格权限校验：仅允许管理员账户 (team_youthpower@outlook.com) 编辑网站
    // =========================================================================
    function isStrictAdmin() {
        try {
            const u = JSON.parse(localStorage.getItem('yp_current_user') || 'null');
            return Boolean(u && u.email && u.email.toLowerCase() === 'team_youthpower@outlook.com' && u.role === 'admin');
        } catch (e) {
            return false;
        }
    }

    // 清理邱皓麟数据
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
    // 二、全站多语言完整精译数据库（含全部队员介绍、商业赞助、骑游详情、赛历等）
    // =========================================================================
    const rosterTranslations = {
        xuhe: {
            en: {
                role: 'Team Manager / Sports Director / Captain',
                ageSpec: '1997.10 (Age 28) · Shaanxi · Sprinter',
                highlight: 'UCI Level 2 Coach (Level 3 Full Scholarship) | PhD Candidate at UCM Madrid | Spanish C1',
                bio: `<strong>[Education & Academic Background]</strong> PhD Candidate in Moral Philosophy at Complutense University of Madrid (UCM, 2026.10-), M.A. in Advanced Philosophical Studies (UCM, 2023-2025), M.A. in Journalism - Discourse & Communication (UCM, 2019-2021); B.A. in Spanish from Macau University of Science and Technology; Alumni of Tsinghua University High School Zhixin. Currently Visiting Lecturer of Spanish at Zhejiang International Studies University; former Marketing Assistant at RE Cycling (led the 500-rider "Ride Win" campaign and co-organized the 2023 Beijing Cycling League); Contracted Writer for Biketo.com (2020 Author of the Year).<br>
                      <strong>[Racing & Coaching Career]</strong> Raced for Salchi Cycling (U23), Avimosa Chozas Team (U23), Huansheng Sports, Guangzhou Fenglei Continental, Wuzhishan 1867 Continental, Kamen Pazin-Kiwi Atlántico Continental, and Sidi Ali Unlock Continental Team. Won Best Young Rider at 2018 Tour of Duolun, 8th in Trofeo de Madrid, 9th in Trofeo de Cosalda, 3rd Team GC / 13th Individual GC at 2021 Tour of Ya'an, and 2nd Elite Men at the 50th Anniversary of China-Spain Diplomatic Relations Race. Trained and studied under Spanish pro coach & European University Professor <strong>Raúl Celdrán (current Red Bull - BORA - hansgrohe coach)</strong> since 2021.`
            },
            es: {
                role: 'Director General / Director Deportivo / Capitán',
                ageSpec: '1997.10 (28 años) · Shaanxi · Esprínter',
                highlight: 'Entrenador UCI Nivel 2 (Beca completa Nivel 3) | Doctorando en la UCM Madrid | Español C1',
                bio: `<strong>[Formación Académica y Profesional]</strong> Doctorando en Filosofía Moral en la Universidad Complutense de Madrid (UCM, 2026.10-), Máster en Estudios Avanzados en Filosofía (UCM, 2023-2025), Máster en Investigación en Periodismo: Discurso y Comunicación (UCM, 2019-2021); Grado en Español por la Universidad de Ciencia y Tecnología de Macao. Profesor de español en la Universidad de Estudios Internacionales de Zhejiang; ex asistente de marketing en RE Cycling (organizador de la Liga de Ciclismo de Pekín 2023) y articulista premiado en Biketo.com.<br>
                      <strong>[Trayectoria Deportiva y como Entrenador]</strong> Compitió en Salchi Cycling (Sub-23), Avimosa Chozas Team (Sub-23), Huansheng, Guangzhou Fenglei Continental, Wuzhishan 1867 Continental, Kamen Pazin-Kiwi Atlántico y Sidi Ali Unlock Continental. Mejor Joven en el Tour de Duolun 2018, 8º en Trofeo de Madrid, 9º en Trofeo de Cosalda, y Subcampeón Élite en la Carrera del 50º Aniversario de Relaciones Diplomáticas China-España. Desde 2021 entrena y se forma junto al entrenador profesional español y profesor universitario <strong>Raúl Celdrán (actual entrenador del Red Bull - BORA - hansgrohe)</strong>.`
            }
        },
        dongyuan: {
            en: {
                role: 'Team Leader / Coach / Head Mechanic',
                ageSpec: 'Age 26 · Co-Founder',
                highlight: 'Senior Team Coach & Pro Mechanic | Leading Race Operations & Equipment Since 2023',
                bio: 'Competed in elite adult events such as the China Cycling League Alishan Station and Tour of Duolun during his youth before retiring due to recurring injuries. As one of the co-founders of Youth Power Team, he has been leading the team at national races since early 2023, providing comprehensive training guidance and professional mechanical support.'
            },
            es: {
                role: 'Jefe de Equipo / Entrenador / Mecánico Jefe',
                ageSpec: '26 años · Cofundador',
                highlight: 'Entrenador Senior y Mecánico Profesional | Responsable Técnico y de Competición desde 2023',
                bio: 'Participó en pruebas élite como la Liga China de Ciclismo en Alishan y el Tour de Duolun antes de retirarse por lesiones. Como cofundador del equipo Youth Power, dirige al equipo en competiciones nacionales desde principios de 2023, brindando asistencia integral en entrenamiento y mecánica de competición.'
            }
        },
        zhangbowen: {
            en: {
                role: 'Vice Captain / Assistant',
                ageSpec: 'Age 20 · Youth Team Captain',
                highlight: 'Team Co-Founder | Defeated Hengxiang Pro Riders in a Breakaway Win at 2023 Shangyi Race',
                bio: 'One of the co-founders of Youth Power Team and long-time captain of the youth squad. Multiple-time U18 champion in the Beijing League and Hebei League. Most notably, in the summer of 2023 at the Beijing-Zhangjiakou Sports Tourism Belt (Shangyi Stage), he went head-to-head against professional riders from Hengxiang Continental Team and won via a decisive breakaway.'
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
                bio: 'A highly experienced GC all-rounder who previously raced for UCI Continental teams such as Team Ukyo and Bank of Gansu, achieving numerous Top-10 General Classification finishes. His arrival brings invaluable mentorship to our young riders and serves as a strong guarantee for the team’s GC ambitions. He also serves as Head of our Americas Division.'
            },
            es: {
                role: 'Líder Extranjero / Director División América / Subcapitán',
                ageSpec: '37 años (1988) · 170cm / 58kg · Corredor Completo de Clasificación General (GC)',
                highlight: 'Ex corredor de Team Ukyo y Bank of Gansu | Múltiples Top-10 en la General de Vueltas UCI',
                bio: 'Corredor colombiano con amplia experiencia internacional, habiendo militado en equipos continentales como Team Ukyo y Bank of Gansu con múltiples Top-10 en clasificaciones generales. Aporta una valiosa experiencia para nuestros jóvenes y lidera de forma integral la división americana del equipo.'
            }
        },
        gabriel: {
            en: {
                role: 'Foreign Lead Climber (KOM)',
                ageSpec: 'Age 24 · Spain · Lead Climber',
                highlight: '1-Hour Power-to-Weight > 6.2 W/kg | Vuelta a Madrid KOM & Best Madrid Rider Winner',
                bio: 'An explosive Spanish climber boasting a 1-hour power-to-weight ratio exceeding 6.2 watt/kg. He previously raced for renowned Spanish squads Caja Rural and Gsport, winning the King of the Mountains (KOM) and Best Madrid Rider jerseys at Vuelta a Madrid. He is our undisputed climbing leader and a prime contender for the polka-dot jersey in stage races.'
            },
            es: {
                role: 'Escalador Principal Extranjero (Líder de Montaña)',
                ageSpec: '24 años · España · Jefe de Filas en Montaña',
                highlight: 'Relación peso-potencia en 1 hora > 6.2 W/kg | Ganador de la Montaña en la Vuelta a Madrid',
                bio: 'Escalador español de altísimo nivel con una relación potencia-peso superior a 6.2 W/kg durante una hora. Ha militado en equipos españoles de prestigio como Caja Rural y Gsport, conquistando el maillot de la Montaña y Mejor Madrileño en la Vuelta a Madrid. Es nuestro líder indiscutible para disputar la clasificación de la montaña.'
            }
        },
        zhanghaoyang: {
            en: {
                role: 'Chinese U23 Rouleur & ITT Specialist',
                ageSpec: 'Age 21 · Mature Rouleur & Time Trialist',
                highlight: '2026 National Open (Zhijiang) Collegiate Champion | Selected for Shanghai Cycling Team',
                bio: 'A mature flat-stage rouleur who finished 5th in the National U-Series Championship and won multiple Elite Individual Time Trial (ITT) titles. Winner of the Collegiate Category at the 2026 National Open Race (Zhijiang, Hubei). In summer 2024, he trained in Spain with Team Cycling Galicia. Currently training with and officially selected for the Shanghai Cycling Team.'
            },
            es: {
                role: 'Rodador Sub-23 y Especialista en Contrarreloj (CRI)',
                ageSpec: '21 años · Rodador y Especialista CRI',
                highlight: 'Campeón Universitario del Abierto Nacional 2026 (Zhijiang) | Seleccionado por el Equipo de Shanghái',
                bio: 'Rodador consolidado, 5º en el Campeonato Nacional Sub y múltiple campeón en contrarreloj individual élite. Campeón universitario en el Abierto Nacional de Zhijiang 2026. En el verano de 2024 entrenó en España con el Team Cycling Galicia. Actualmente seleccionado oficialmente por el Equipo Profesional de Ciclismo de Shanghái.'
            }
        },
        gongjiayao: {
            en: {
                role: 'Chinese Breakaway & All-Rounder',
                ageSpec: 'Age 25 · Breakaway Specialist',
                highlight: 'Multiple Team GC Winner & Podium Finisher | 6th at Tour of Hainan (Amateur Stage 1)',
                bio: 'A versatile breakaway rider capable of attacking, defending, and leading out sprints. Helped his squads secure numerous team titles and podiums (2024 Wanmei Landscape, 2024 Tour of Chongming Island Elite, 2025 Grand Canal Race Haian, 7th Team GC at 2024 Tour of Sayram Lake). Individually placed 5th at 2024 Grand Canal Zhenjiang, 6th on Stage 1 of 2025 Tour of Hainan (Amateur), and 8th at 2026 HEROS Kaihua.'
            },
            es: {
                role: 'Especialista en Fugas y Todoterreno',
                ageSpec: '25 años · Corredor Completo de Fugas',
                highlight: 'Múltiple Campeón por Equipos | 6º en Etapa 1 del Tour de Hainan (Amateur) y 5º en Gran Canal',
                bio: 'Corredor todoterreno especializado en fugas, defensa táctica y lanzamiento de esprints. Pieza clave en múltiples victorias y podios por equipos (Wanmei 2024, Isla Chongming Élite 2024, Gran Canal Haian 2025). Individualmente logró el 5º puesto en Zhenjiang 2024, 6º en la primera etapa del Tour de Hainan 2025 (Amateur) y 8º en HEROS Kaihua 2026.'
            }
        },
        jiangwendi: {
            en: {
                role: 'Chinese U23 Climbing Talent',
                ageSpec: 'Age 19 · Promising Young Climber',
                highlight: 'Multiple Top-5 Finishes in Elite Hill Climbs | Strong Contender for Best Young Rider White Jersey',
                bio: 'A highly promising young climbing talent who competed extensively in elite hill climb races during his junior years, consistently finishing in the Top 5. He is a key contender for the Best Young Rider (White Jersey) in the 2027 season.'
            },
            es: {
                role: 'Joven Promesa Escalador Sub-23',
                ageSpec: '19 años · Escalador de Proyección',
                highlight: 'Múltiples Top-5 en Escaladas Élite | Firme Candidato al Maillot Blanco de Mejor Joven',
                bio: 'Joven escalador con gran proyección que ha logrado múltiples puestos dentro del Top-5 en competiciones élite de montaña. Será uno de nuestros principales aspirantes al maillot blanco de Mejor Joven en la temporada 2027.'
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
                bio: 'Esprínter de enorme potencial que inició el entrenamiento estructurado en marzo de 2026. En apenas 5 meses incrementó su FTP en más de 60W, alcanzando picos de esprint de 1450W con una proyección estimada de 1850W.'
            }
        }
    };

    // 针对全站所有板块（首页、商业赞助、骑游青旅、赛历、教练、商城）的完整字典库
    const fullSiteDictionary = {
        en: {
            // 顶部与导航
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
            // 首页与荣誉
            "坚持群众路线 · 体教结合 · 上海市自行车队储备人才基地": "Grassroots to Pro · Sports & Education · Shanghai Team Reserve Base",
            "打通从群众体育到职业赛场的上升通道": "Bridging Grassroots Cycling to the Pro Peloton",
            "车队愿景与2027洲际队规划": "Team Vision & 2027 Continental Team Plan",
            "上海市自行车队官方储备人才基地": "Official Talent Reserve Base for Shanghai Cycling Team",
            "上海市自行车队（负责人：孙栋主任）对我们的工作非常满意并极其认可我们的发展理念。": "The Shanghai Cycling Team (Director Sun Dong) highly recognizes our work, philosophy, and development plan.",
            "自2027年起，我们将成为该专业运动队的储备人才基地": "Starting in 2027, we serve as the official talent reserve base for the Shanghai Cycling Team",
            "，展开更深层次合作，为选手提供更多参与国内外高级别赛事的机会。": ", deepening our collaboration to provide riders with greater opportunities in high-level domestic and international races.",
            "17人国际化车手阵容": "17-Rider International Roster",
            "车队成员主要由哥伦比亚和中国青年车手构成，预计注册17名运动员：": "Composed primarily of Colombian and Chinese young riders, registering 17 athletes:",
            "8名哥伦比亚籍、7名中国籍、2名西班牙籍": "8 Colombians, 7 Chinese, and 2 Spaniards",
            "海外车队合作积淀（2022年起）": "International Team Partnerships (Since 2022)",
            "先后与西班牙U23车队 ": "Partnered with Spanish U23 squad ",
            " 及摩洛哥洲际车队 ": " and Moroccan UCI Continental Team ",
            " 达成合作，积累了丰富的国际参赛经验与人脉。": ", gaining extensive international racing experience and global networks.",
            "青年力量发展车队主要荣誉 (2021-2026)": "Youth Power Team Key Achievements (2021-2026)",
            "2026 赛季": "2026 Season",
            "2025 赛季": "2025 Season",
            "2024 赛季": "2024 Season",
            "2023 赛季": "2023 Season",
            "全国公开赛（湖北枝江）大学生组 冠军 — ": "National Open (Zhijiang, Hubei) Collegiate Champion — ",
            "（后入选上海市自行车队）": " (Selected for Shanghai Cycling Team)",
            " 入选世巡赛阿斯塔纳（Astana）车队集训名单": " selected for WorldTour Team Astana Training Camp",
            "全国U系列锦标赛乙组大组赛 冠军 — ": "National U-Series Championship Group B Road Race Champion — ",
            " 以优异成绩获 UCI Level 2 教练证书，并获 Level 3 全额奖学金资格": " earned the UCI Level 2 Coaching Certificate with distinction and qualified for a full Level 3 scholarship",
            "全国U系列锦标赛甲组大组赛 冠军 — ": "National U-Series Championship Group A Road Race Champion — ",
            "全国U系列锦标赛甲组 ITT 冠军、亚军 — ": "National U-Series Championship Group A ITT Champion & Runner-up — ",
            "全国U系列锦标赛甲组 ITT 冠军 — ": "National U-Series Championship Group A ITT Champion — ",
            "（后入选大学生国家队、成年国家队）": " (Later selected for National Collegiate & Elite National Team)",
            // 队员页
            "2027赛季车队工作人员与队员介绍": "2027 Season Staff & Riders Roster",
            "预计注册17名运动员（8名哥伦比亚籍、7名中国籍、2名西班牙籍）。管理员登录后可直接点击上传照片或开启全站文本编辑修改任何介绍。": "Registering 17 athletes (8 COL, 7 CHN, 2 ESP). Admins can drag cards to reorder layout, upload portraits, or edit text.",
            "🎯 7人上场标准战术搭配：": "🎯 Standard 7-Rider Race Lineup:",
            "1名中方中生代 + 2名外籍爬坡手 + 1名外籍综合GC手 + 2名成熟青训手 + 1名刚成年青训手": "1 Chinese Mid-Gen + 2 Foreign Climbers + 1 Foreign GC Leader + 2 Mature U23 + 1 Junior-Grad U23",
            "进入个人独立主页": "View Full Profile",
            "删除队员": "Delete Rider",
            "上传/更换照片": "Upload Photo",
            "2027赛季官方定妆照预留位": "2027 Official Portrait Slot",
            // 赛历页
            "未来5年规划与2027赛季参赛计划": "5-Year Vision & 2027 Season Racing Calendar",
            "2027年以南美洲和中国大陆赛事为主（欧洲确保参加 Vuelta a Asturias）；2027-2029年将逐步拓展环摩洛哥、环阿尔巴尼亚、环塞尔维亚等北非及欧洲赛事。": "In 2027 we focus on South America and Mainland China (plus Vuelta a Asturias in Europe); from 2027-2029 we expand to Tour du Maroc, Tour of Albania, and Tour de Serbie.",
            "大中华地区拟定赛历": "Greater China Racing Calendar",
            "争取全国锦标赛及全运会积分": "Competing for National Championship & National Games Points",
            "预计比赛日": "Race Days",
            "环门头沟职业自行车赛": "Tour of Mentougou Pro Cycling Race",
            "环鄱阳湖职业自行车赛": "Tour of Poyang Lake Pro Cycling Race",
            "跨喜马拉雅国际自行车极限挑战赛": "Trans-Himalaya International Cycling Challenge",
            "环上海职业自行车赛": "Tour of Shanghai New Cities Pro Cycling Race",
            "沿黄河观光带·东营口职业自行车赛": "Yellow River Belt · Dongying Pro Cycling Race",
            "环广州(2段) / 成都天府绿道(2段) / 环榆林(3段)": "Tour of Guangzhou (2) / Chengdu Greenway (2) / Tour of Yulin (3)",
            "中国自行车全国锦标赛 (U23/精英 大组+ITT)": "China National Road Cycling Championships (U23/Elite Road & ITT)",
            "中国职业自行车联赛(2~5站) & 中国自行车联赛(1~3站)": "China Pro Cycling League (2-5 rounds) & China Cycling League (1-3 rounds)",
            "美洲地区及欧洲/北非赛历": "Americas, Europe & North Africa Calendar",
            "副队长 Vladimir López 全权负责美洲赛区": "Managed by Vice Captain & Americas Director Vladimir López",
            "环哥伦比亚职业自行车赛": "Tour Colombia (UCI 2.PRO)",
            "环哥伦比亚 (Vuelta a Colombia)": "Vuelta a Colombia (UCI 2.2)",
            "包含麦德林经典赛在内的 6~7 场古典赛": "6-7 One-Day Classics including Clásica de Medellín",
            "UCI Gravel 世界杯（哥伦比亚站、墨西哥站）": "UCI Gravel World Series (Colombia & Mexico Rounds)",
            "UCI Gravel 世锦赛（代表哥伦比亚国家队）": "UCI Gravel World Championships (Representing Colombia National Team)",
            "欧洲与北非拓展：Vuelta a Asturias / 环摩洛哥 / 环阿尔巴尼亚 / 环塞尔维亚": "Europe & North Africa: Vuelta a Asturias / Tour du Maroc / Albania / Serbia",
            // 青旅与骑游详情页
            "千岛湖亚运村 · 车队官方青年旅舍": "Qiandao Lake Asian Games Village · Official Team Youth Hostel",
            "青年力量洲际队官方青年旅舍坐落于": "The official youth hostel of Youth Power Continental Team is located in ",
            "杭州千岛湖亚运村": "Hangzhou Qiandao Lake Asian Games Village",
            "，名字为 ": ", named ",
            "基地与骑游动态说明": "Hostel Base & Club Ride Updates",
            "我们的青年旅舍位于": "Our official youth hostel is located at ",
            "千岛湖亚运村（La Fuga 青野·驿）": "Qiandao Lake Asian Games Village (La Fuga Youth Hostel)",
            "。您可以关注我们的微信公众号": ". Follow our official WeChat account ",
            "「青年力量发展车队」": "'Youth Power Team'",
            "或注册成为本网站会员，一旦发布最新骑游招募或赛事获奖动态，您将第一时间收到推送！": " or register as a member on this website to receive instant notifications when new club rides or race victories are announced!",
            "La Fuga 青野·驿 住宿/骑游咨询": "La Fuga Youth Hostel Stay & Ride Inquiry",
            "预订青旅床位或咨询骑游，请登记或致电 18513693097。": "To book a bed at our hostel or inquire about rides, please register below or call +86 18513693097.",
            "提交入住 / 骑游咨询": "Submit Hostel / Ride Inquiry",
            "车队最新骑游招募与赛事动态": "Latest Team Club Rides & Race Announcements",
            "【基地公告】千岛湖亚运村「La Fuga 青野·驿」青年旅舍常态化开放": "[Base Notice] Qiandao Lake Asian Games Village 'La Fuga Youth Hostel' Now Open Year-Round",
            "青年力量车队官方青年旅舍位于千岛湖亚运村（La Fuga青野·驿），欢迎各位车友入住交流。具体官方骑游活动将由管理员在此处及微信公众号「青年力量发展车队」同步发布。": "Our official team youth hostel at Qiandao Lake Asian Games Village (La Fuga) welcomes cyclists from around the world. Official club rides and training camps will be published here and on our WeChat account.",
            // 商业赞助页
            "资金开销类目、招商需求与赞助商权益": "Annual Budget Breakdown, Sponsorship Tiers & Commercial Rights",
            "车队年度所有费用预计总和：151万5千元人民币（车队注册费约5万元 + 人员工资及运动保险115.5万元 + 比赛差旅补贴10万元 + UCI可退押金约21万元）。": "Total Estimated Annual Budget: 1,515,000 RMB (~50k RMB Registration + 1,155k RMB Salaries & Insurance + 100k RMB Travel Subsidy + ~210k RMB Refundable UCI Bank Guarantee).",
            "2027 招商合作席位需求": "2027 Sponsorship Tiers & Investment",
            "🏆 车队主冠名": "🏆 First Title Sponsor",
            "每年 120万元 ": "1,200,000 RMB / yr ",
            "(合约三年或以上)": "(3+ Year Contract)",
            "🥈 车队副冠名": "🥈 Second Title Sponsor",
            "每年 55万元 ": "550,000 RMB / yr ",
            "👕 队服胸前 Logo": "👕 Jersey Chest Logo",
            "每年 15万元 ": "150,000 RMB / yr ",
            "(合约两年或以上)": "(2+ Year Contract)",
            "💪 队服袖子 Logo": "💪 Jersey Sleeve Logo",
            "每年 10万元 ": "100,000 RMB / yr ",
            "(合约一年或以上)": "(1+ Year Contract)",
            "核心亮点 · 品牌出海与海外渠道建立": "Key Highlight · Global Brand Expansion & Overseas Dealer Network",
            "南美洲（哥伦比亚）与西班牙实体车店销售网络搭建": "Direct B2B Sales Network in South America (Colombia) & Spain",
            "我们会在南美洲以哥伦比亚为中心，依托车队的赛训活动建立一套销售网络，尽全力提高品牌的国际知名度，并全力协助品牌方同当地车店建立密切的联系。": "Centered in Colombia across South America, we leverage our racing and training operations to build a direct sales network, maximizing international brand awareness and connecting partner brands directly with local bike shops. ",
            "（目前，我们已经开始将静藤轮组引入哥伦比亚和西班牙市场，在一个月的时间内已经有四家车店对产品展现兴趣并询价。）": "(Currently, we have already introduced Jingteng Wheelsets into the Colombian and Spanish markets, with 4 local bike shops expressing strong interest and requesting quotes within just one month.)",
            "📺 国内外核心赛事电视直播": "📺 Global & Domestic Live TV Broadcasts",
            "南美环哥伦比亚等由哥伦比亚国家电视台及RCN全国直播；欧洲 Vuelta a Asturias 由当地电视台及 Eurosport 转播；国内环鄱阳湖、环上海等获省级卫视与央视报道。": "Vuelta a Colombia is broadcast live nationwide on Señal Colombia and RCN TV; Vuelta a Asturias in Europe is broadcast on RTPA and Eurosport; domestic UCI races receive coverage on CCTV-5, CCTV-13, and provincial satellite TV.",
            "🛍️ 70个比赛日赛场展销与双基地展示": "🛍️ 70 Race-Day On-Site Expos & Dual Base Showrooms",
            "全年70个比赛日现场展销体验，并在杭州余杭及千岛湖亚运村（La Fuga青野·驿）常态化基地长期陈列展示。": "On-site product display and trial experiences across 70 race days annually, plus permanent exhibition at our Hangzhou Yuhang and Qiandao Lake (La Fuga Hostel) bases.",
            // 教练服务页
            "UCI 2级教练科学训练服务 · 分级定价": "UCI Level 2 Scientific Coaching Service · Tiered Pricing",
            "U16 青少年组": "U16 Youth Tier",
            "U16 教练服务": "U16 Coaching Plan",
            "面向16岁以下青少年，夯实有氧基础与控车技术，备战全国U系列锦标赛乙组。": "For riders under 16: building aerobic base and bike handling skills to prepare for National U-Series Group B.",
            "U18 青年竞技组": "U18 Junior Competitive Tier",
            "U18 教练服务": "U18 Coaching Plan",
            "面向16-18岁青年车手，强化专项功率与比赛战术，冲击全国U系列锦标赛甲组冠军。": "For ages 16-18: enhancing specific power output and race tactics to target National U-Series Group A podiums.",
            "洲际队/上海队直通": "Pro & Shanghai Team Pathway",
            "U23 准职业/大学生组": "U23 & Collegiate Elite Tier",
            "U23 教练服务": "U23 Coaching Plan",
            "面向U23及大学生精英，对标洲际队标准，优秀者推荐进入青年力量洲际队或上海市自行车队。": "For U23 & collegiate riders: pro-level training standards. Top performers are recommended to Youth Power Continental Team or Shanghai Cycling Team.",
            "成人组定制私教": "Adult Custom Coaching",
            "成人 教练服务": "Adult 1-on-1 Coaching",
            "面向成年业余爱好者与精英车手，量身定制周期功率计划，高效提升FTP与赛场表现。": "For adult enthusiasts and amateur racers: tailored periodized power plans to boost FTP and race results.",
            "填写教练服务报名表 & 支付宝付款": "Coaching Registration Form & Alipay Checkout"
        },
        es: {
            // 顶部与导航
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
            // 首页与荣誉
            "坚持群众路线 · 体教结合 · 上海市自行车队储备人才基地": "Deporte Base y Educación · Base de Reserva del Equipo de Shanghái",
            "打通从群众体育到职业赛场的上升通道": "Conectando el Ciclismo Base con el Pelotón Profesional",
            "车队愿景与2027洲际队规划": "Visión del Equipo y Plan Continental 2027",
            "上海市自行车队官方储备人才基地": "Base Oficial de Reserva de Talentos del Equipo de Ciclismo de Shanghái",
            "上海市自行车队（负责人：孙栋主任）对我们的工作非常满意并极其认可我们的发展理念。": "El Equipo Profesional de Ciclismo de Shanghái (Director Sun Dong) valora enormemente nuestro trabajo y filosofía de desarrollo.",
            "自2027年起，我们将成为该专业运动队的储备人才基地": "A partir de 2027, seremos la base oficial de reserva de talentos de dicho equipo profesional",
            "，展开更深层次合作，为选手提供更多参与国内外高级别赛事的机会。": ", cooperando estrechamente para brindar a los corredores más oportunidades en carreras de alto nivel nacional e internacional.",
            "17人国际化车手阵容": "Plantilla Internacional de 17 Corredores",
            "车队成员主要由哥伦比亚和中国青年车手构成，预计注册17名运动员：": "Integrado principalmente por jóvenes ciclistas de Colombia y China, con 17 corredores registrados:",
            "8名哥伦比亚籍、7名中国籍、2名西班牙籍": "8 colombianos, 7 chinos y 2 españoles",
            "海外车队合作积淀（2022年起）": "Alianzas Internacionales (Desde 2022)",
            "先后与西班牙U23车队 ": "Colaboración con el equipo español Sub-23 ",
            " 及摩洛哥洲际车队 ": " y el equipo continental marroquí ",
            " 达成合作，积累了丰富的国际参赛经验与人脉。": ", acumulando amplia experiencia y contactos en competiciones internacionales.",
            "青年力量发展车队主要荣誉 (2021-2026)": "Palmarés Principal del Equipo Youth Power (2021-2026)",
            "2026 赛季": "Temporada 2026",
            "2025 赛季": "Temporada 2025",
            "2024 赛季": "Temporada 2024",
            "2023 赛季": "Temporada 2023",
            "全国公开赛（湖北枝江）大学生组 冠军 — ": "Campeón Universitario del Abierto Nacional (Zhijiang) — ",
            "（后入选上海市自行车队）": " (Seleccionado por el Equipo de Ciclismo de Shanghái)",
            " 入选世巡赛阿斯塔纳（Astana）车队集训名单": " seleccionado para la concentración del equipo WorldTour Astana",
            "全国U系列锦标赛乙组大组赛 冠军 — ": "Campeón Nacional Sub en Ruta (Grupo B) — ",
            " 以优异成绩获 UCI Level 2 教练证书，并获 Level 3 全额奖学金资格": " obtuvo el certificado de Entrenador UCI Nivel 2 con honores y beca completa para el Nivel 3",
            "全国U系列锦标赛甲组大组赛 冠军 — ": "Campeón Nacional Sub en Ruta (Grupo A) — ",
            "全国U系列锦标赛甲组 ITT 冠军、亚军 — ": "Campeón y Subcampeón Nacional Sub Contrarreloj (CRI Grupo A) — ",
            "全国U系列锦标赛甲组 ITT 冠军 — ": "Campeón Nacional Sub Contrarreloj (CRI Grupo A) — ",
            "（后入选大学生国家队、成年国家队）": " (Posteriormente seleccionado para la Selección Nacional Universitaria y Absoluta)",
            // 队员页
            "2027赛季车队工作人员与队员介绍": "Personal Técnico y Corredores Temporada 2027",
            "预计注册17名运动员（8名哥伦比亚籍、7名中国籍、2名西班牙籍）。管理员登录后可直接点击上传照片或开启全站文本编辑修改任何介绍。": "17 ciclistas registrados (8 COL, 7 CHN, 2 ESP). El administrador puede arrastrar las tarjetas para cambiar el diseño y editar textos.",
            "🎯 7人上场标准战术搭配：": "🎯 Alineación Táctica Estándar de 7 Corredores:",
            "1名中方中生代 + 2名外籍爬坡手 + 1名外籍综合GC手 + 2名成熟青训手 + 1名刚成年青训手": "1 Chino Media Gen + 2 Escaladores Extranjeros + 1 Líder GC Extranjero + 2 Sub-23 Consolidados + 1 Sub-23 Debutante",
            "进入个人独立主页": "Ver Perfil Individual",
            "删除队员": "Eliminar",
            "上传/更换照片": "Subir Foto",
            "2027赛季官方定妆照预留位": "Espacio para Foto Oficial 2027",
            // 赛历页
            "未来5年规划与2027赛季参赛计划": "Plan a 5 Años y Calendario de Competición 2027",
            "2027年以南美洲和中国大陆赛事为主（欧洲确保参加 Vuelta a Asturias）；2027-2029年将逐步拓展环摩洛哥、环阿尔巴尼亚、环塞尔维亚等北非及欧洲赛事。": "En 2027 nos centramos en Sudamérica y China (con participación asegurada en la Vuelta a Asturias en Europa); entre 2027 y 2029 ampliaremos al Tour de Marruecos, Albania y Serbia.",
            "大中华地区拟定赛历": "Calendario en Gran China",
            "争取全国锦标赛及全运会积分": "Puntos para el Campeonato Nacional y Juegos Nacionales",
            "预计比赛日": "Días de Carrera",
            "环门头沟职业自行车赛": "Tour de Mentougou (UCI 2.PRO)",
            "环鄱阳湖职业自行车赛": "Tour del Lago Poyang (UCI 2.1)",
            "跨喜马拉雅国际自行车极限挑战赛": "Reto Internacional Trans-Himalaya (UCI 2.1)",
            "环上海职业自行车赛": "Tour de Shanghái (UCI 2.1)",
            "沿黄河观光带·东营口职业自行车赛": "Clásica del Río Amarillo · Dongying (UCI 1.2)",
            "环广州(2段) / 成都天府绿道(2段) / 环榆林(3段)": "Tour de Cantón (2) / Chengdu (2) / Tour de Yulin (3)",
            "中国自行车全国锦标赛 (U23/精英 大组+ITT)": "Campeonato Nacional de Ciclismo de China (Ruta y CRI Sub-23/Élite)",
            "中国职业自行车联赛(2~5站) & 中国自行车联赛(1~3站)": "Liga Profesional de Ciclismo de China (2-5 paradas) y Liga Nacional (1-3 paradas)",
            "美洲地区及欧洲/北非赛历": "Calendario en América, Europa y Norte de África",
            "副队长 Vladimir López 全权负责美洲赛区": "Dirigido en América por el Subcapitán Vladimir López",
            "环哥伦比亚职业自行车赛": "Tour Colombia (UCI 2.PRO · 14 etapas)",
            "环哥伦比亚 (Vuelta a Colombia)": "Vuelta a Colombia (UCI 2.2 · 7 etapas)",
            "包含麦德林经典赛在内的 6~7 场古典赛": "6-7 Clásicas incluyendo la Clásica de Medellín (UCI 1.2)",
            "UCI Gravel 世界杯（哥伦比亚站、墨西哥站）": "Copa del Mundo UCI Gravel (Sedes de Colombia y México)",
            "UCI Gravel 世锦赛（代表哥伦比亚国家队）": "Mundial UCI Gravel (Representando a la Selección de Colombia)",
            "欧洲与北非拓展：Vuelta a Asturias / 环摩洛哥 / 环阿尔巴尼亚 / 环塞尔维亚": "Europa y África: Vuelta a Asturias / Tour de Marruecos / Albania / Serbia",
            // 青旅与骑游详情页
            "千岛湖亚运村 · 车队官方青年旅舍": "Villa de los Juegos Asiáticos de Qiandao · Albergue Oficial del Equipo",
            "青年力量洲际队官方青年旅舍坐落于": "El albergue juvenil oficial de Youth Power Continental Team se encuentra en la ",
            "杭州千岛湖亚运村": "Villa de los Juegos Asiáticos del Lago Qiandao (Hangzhou)",
            "，名字为 ": ", llamado ",
            "基地与骑游动态说明": "Información sobre el Albergue Base y Rutas Ciclistas",
            "我们的青年旅舍位于": "Nuestro albergue juvenil está ubicado en la ",
            "千岛湖亚运村（La Fuga 青野·驿）": "Villa Asiática del Lago Qiandao (Albergue La Fuga)",
            "。您可以关注我们的微信公众号": ". Puede seguir nuestra cuenta oficial de WeChat ",
            "「青年力量发展车队」": "'Youth Power Team'",
            "或注册成为本网站会员，一旦发布最新骑游招募或赛事获奖动态，您将第一时间收到推送！": " o registrarse como miembro en nuestra web para recibir notificaciones inmediatas sobre nuevas rutas grupales y victorias del equipo.",
            "La Fuga 青野·驿 住宿/骑游咨询": "Reserva de Alojamiento en La Fuga y Consulta de Rutas",
            "预订青旅床位或咨询骑游，请登记或致电 18513693097。": "Para reservar alojamiento en el albergue o consultar sobre rutas, regístrese aquí o llame al +86 18513693097.",
            "提交入住 / 骑游咨询": "Enviar Consulta de Alojamiento / Ruta",
            "车队最新骑游招募与赛事动态": "Últimas Convocatorias de Rutas y Noticias del Equipo",
            "【基地公告】千岛湖亚运村「La Fuga 青野·驿」青年旅舍常态化开放": "[Aviso Oficial] Albergue Juvenil «La Fuga» en la Villa Asiática del Lago Qiandao Abierto Todo el Año",
            "青年力量车队官方青年旅舍位于千岛湖亚运村（La Fuga青野·驿），欢迎各位车友入住交流。具体官方骑游活动将由管理员在此处及微信公众号「青年力量发展车队」同步发布。": "El albergue oficial del equipo en la Villa Asiática de Qiandao (La Fuga) da la bienvenida a todos los ciclistas. Las próximas rutas oficiales serán publicadas aquí por el administrador y en nuestra cuenta de WeChat.",
            // 商业赞助页
            "资金开销类目、招商需求与赞助商权益": "Presupuesto Anual, Niveles de Patrocinio y Derechos Comerciales",
            "车队年度所有费用预计总和：151万5千元人民币（车队注册费约5万元 + 人员工资及运动保险115.5万元 + 比赛差旅补贴10万元 + UCI可退押金约21万元）。": "Presupuesto Anual Total Estimado: 1.515.000 RMB (~50.000 RMB Registro en Colombia + 1.155.000 RMB Salarios y Seguros + 100.000 RMB Viajes + ~210.000 RMB Aval UCI reembolsable).",
            "2027 招商合作席位需求": "Niveles de Patrocinio Temporada 2027",
            "🏆 车队主冠名": "🏆 Patrocinador Principal (Primer Nombre)",
            "每年 120万元 ": "1.200.000 RMB / año ",
            "(合约三年或以上)": "(Contrato de 3 años o más)",
            "🥈 车队副冠名": "🥈 Copatrocinador Principal (Segundo Nombre)",
            "每年 55万元 ": "550.000 RMB / año ",
            "👕 队服胸前 Logo": "👕 Logo en el Pecho del Maillot",
            "每年 15万元 ": "150.000 RMB / año ",
            "(合约两年或以上)": "(Contrato de 2 años o más)",
            "💪 队服袖子 Logo": "💪 Logo en la Manga del Maillot",
            "每年 10万元 ": "100.000 RMB / año ",
            "(合约一年或以上)": "(Contrato de 1 año o más)",
            "核心亮点 · 品牌出海与海外渠道建立": "Punto Clave · Expansión Internacional de Marca en Latinoamérica y España",
            "南美洲（哥伦比亚）与西班牙实体车店销售网络搭建": "Red Comercial Directa con Tiendas de Ciclismo en Colombia y España",
            "我们会在南美洲以哥伦比亚为中心，依托车队的赛训活动建立一套销售网络，尽全力提高品牌的国际知名度，并全力协助品牌方同当地车店建立密切的联系。": "Con centro de operaciones en Colombia para toda Sudamérica, aprovechamos nuestras competiciones y entrenamientos para establecer una red de distribución directa con tiendas locales e impulsar el reconocimiento internacional de las marcas patrocinadoras. ",
            "（目前，我们已经开始将静藤轮组引入哥伦比亚和西班牙市场，在一个月的时间内已经有四家车店对产品展现兴趣并询价。）": "(Actualmente ya hemos introducido las ruedas Jingteng en los mercados de Colombia y España; en solo un mes, cuatro tiendas especializadas ya han mostrado interés y solicitado cotizaciones).",
            "📺 国内外核心赛事电视直播": "📺 Retransmisión Televisiva en Directo en América, Europa y China",
            "南美环哥伦比亚等由哥伦比亚国家电视台及RCN全国直播；欧洲 Vuelta a Asturias 由当地电视台及 Eurosport 转播；国内环鄱阳湖、环上海等获省级卫视与央视报道。": "La Vuelta a Colombia se transmite en vivo a nivel nacional por Señal Colombia y RCN; la Vuelta a Asturias en Europa por RTPA y Eurosport; y las pruebas en China por CCTV-5, CCTV-13 y televisiones provinciales.",
            "🛍️ 70个比赛日赛场展销与双基地展示": "🛍️ Exposición en 70 Días de Competición y Showrooms Permanentes",
            "全年70个比赛日现场展销体验，并在杭州余杭及千岛湖亚运村（La Fuga青野·驿）常态化基地长期陈列展示。": "Exhibición y prueba de productos durante los 70 días de carrera anuales, además de exposición permanente en nuestras bases de Hangzhou Yuhang y el Lago Qiandao (Albergue La Fuga).",
            // 教练服务页
            "UCI 2级教练科学训练服务 · 分级定价": "Servicio de Entrenamiento Científico UCI Nivel 2 · Tarifas por Categoría",
            "U16 青少年组": "Categoría Cadete Sub-16",
            "U16 教练服务": "Entrenamiento Sub-16",
            "面向16岁以下青少年，夯实有氧基础与控车技术，备战全国U系列锦标赛乙组。": "Para menores de 16 años: desarrollo de base aeróbica y técnica de manejo para el Campeonato Nacional Sub.",
            "U18 青年竞技组": "Categoría Juvenil Sub-18",
            "U18 教练服务": "Entrenamiento Sub-18",
            "面向16-18岁青年车手，强化专项功率与比赛战术，冲击全国U系列锦标赛甲组冠军。": "Para ciclistas de 16 a 18 años: potencia específica y táctica de competición rumbo al podio nacional.",
            "洲际队/上海队直通": "Acceso a Equipo Continental y Shanghái",
            "U23 准职业/大学生组": "Categoría Élite Sub-23 / Universitaria",
            "U23 教练服务": "Entrenamiento Sub-23",
            "面向U23及大学生精英，对标洲际队标准，优秀者推荐进入青年力量洲际队或上海市自行车队。": "Preparación de nivel continental para ciclistas Sub-23 y universitarios, con opción de ascenso al equipo continental o al Equipo de Shanghái.",
            "成人组定制私教": "Entrenamiento Personalizado Adultos",
            "成人 教练服务": "Entrenamiento Adultos",
            "面向成年业余爱好者与精英车手，量身定制周期功率计划，高效提升FTP与赛场表现。": "Planificación por potencia a medida para ciclistas máster y aficionados que buscan elevar su FTP y rendimiento.",
            "填写教练服务报名表 & 支付宝付款": "Formulario de Inscripción al Entrenamiento y Pago con Alipay"
        }
    };

    // 商城商品三语对照
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
    // 三、微软翻译 (Microsoft Edge / Bing Neural Translator) 兜底引擎
    // =========================================================================
    let msAuthToken = null;
    let msTokenExpire = 0;

    async function getMicrosoftTranslatorToken() {
        if (msAuthToken && Date.now() < msTokenExpire) return msAuthToken;
        try {
            const res = await fetch('https://edge.microsoft.com/translate/auth');
            if (res.ok) {
                msAuthToken = await res.text();
                msTokenExpire = Date.now() + 8 * 60 * 1000; // 缓存8分钟
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

    function hasChinese(str) {
        return /[\u4e00-\u9fa5]/.test(str);
    }

    async function translateViaMicrosoft(text, targetLang) {
        const clean = text.trim();
        if (!clean || !hasChinese(clean)) return text;

        if (fullSiteDictionary[targetLang] && fullSiteDictionary[targetLang][clean]) {
            return fullSiteDictionary[targetLang][clean];
        }

        const cache = getTransCache();
        if (cache[targetLang] && cache[targetLang][clean]) {
            return cache[targetLang][clean];
        }

        // 1. 优先使用微软官方 Edge 神经网络翻译接口（国内直连高速稳定）
        try {
            const token = await getMicrosoftTranslatorToken();
            if (token) {
                const toLang = targetLang === 'es' ? 'es' : 'en';
                const msRes = await fetch(`https://api-edge.cognitive.microsofttranslator.com/translate?from=zh-Hans&to=${toLang}&api-version=3.0`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
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

        // 2. 备用 MyMemory 翻译接口
        try {
            const pair = targetLang === 'es' ? 'zh-CN|es' : 'zh-CN|en';
            const res2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${pair}`);
            const data2 = await res2.json();
            if (data2?.responseData?.translatedText) {
                const t2 = data2.responseData.translatedText;
                cache[targetLang][clean] = t2;
                saveTransCache(cache);
                return t2;
            }
        } catch (e2) {}

        return text;
    }

    // 扫描并翻译整个页面中所有文本节点
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
            textNodes.forEach(node => {
                if (node.__origZhText) node.nodeValue = node.__origZhText;
            });
            return;
        }

        const nodesToTranslate = [];
        textNodes.forEach(node => {
            if (!node.__origZhText && hasChinese(node.nodeValue)) {
                node.__origZhText = node.nodeValue;
            }
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

        if (uncachedList.length === 0) return;

        // 并发调用微软翻译处理剩余动态新增文本
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
    // 四、管理员专属：拖拽队员卡片调整页面布局 (Drag & Drop) + 列数布局切换器
    // =========================================================================
    function getRosterGridCols() {
        return localStorage.getItem('yp_roster_grid_cols') || '3';
    }

    window.setRosterGridCols = function (cols) {
        if (!isStrictAdmin()) return;
        localStorage.setItem('yp_roster_grid_cols', String(cols));
        applyRosterGridCols();
        if (typeof showToast === 'function') showToast(`已将队员页面布局切换为：每行 ${cols} 列`);
    };

    function applyRosterGridCols() {
        const grid = document.getElementById('roster-grid');
        if (!grid) return;
        const cols = getRosterGridCols();
        grid.className = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-7`;
    }

    // 注入管理员「布局切换工具条」到队员介绍页顶部
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
                    <span>管理员布局编辑已开启：直接用鼠标按住下方任意队员卡片即可【拖拽调整先后顺序】！</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 font-bold">每行排版列数：</span>
                    <button onclick="setRosterGridCols(2)" class="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-yp-green text-white font-bold transition">每行 2 人 (大图)</button>
                    <button onclick="setRosterGridCols(3)" class="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-yp-green text-white font-bold transition">每行 3 人 (标准)</button>
                    <button onclick="setRosterGridCols(4)" class="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-yp-green text-white font-bold transition">每行 4 人 (紧凑)</button>
                </div>
            `;
            const grid = document.getElementById('roster-grid');
            if (grid) rosterPage.insertBefore(bar, grid);
        }
    }

    // 启用管理员卡片拖拽排序并持久化保存顺序
    let draggedRosterId = null;

    function enableAdminRosterDragAndDrop() {
        if (!isStrictAdmin()) return;
        const grid = document.getElementById('roster-grid');
        if (!grid) return;

        const cards = Array.from(grid.querySelectorAll('[data-roster-id]'));
        cards.forEach(card => {
            card.setAttribute('draggable', 'true');
            card.style.cursor = 'grab';

            card.addEventListener('dragstart', function (e) {
                draggedRosterId = this.getAttribute('data-roster-id');
                this.style.opacity = '0.45';
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', function () {
                this.style.opacity = '1';
                cards.forEach(c => c.classList.remove('ring-4', 'ring-yp-lime'));
            });

            card.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('ring-4', 'ring-yp-lime');
            });

            card.addEventListener('dragleave', function () {
                this.classList.remove('ring-4', 'ring-yp-lime');
            });

            card.addEventListener('drop', function (e) {
                e.preventDefault();
                this.classList.remove('ring-4', 'ring-yp-lime');
                const targetId = this.getAttribute('data-roster-id');
                if (!draggedRosterId || draggedRosterId === targetId) return;

                const list = getSavedRosterData();
                const fromIdx = list.findIndex(r => String(r.id) === String(draggedRosterId));
                const toIdx = list.findIndex(r => String(r.id) === String(targetId));
                if (fromIdx === -1 || toIdx === -1) return;

                const [movedItem] = list.splice(fromIdx, 1);
                list.splice(toIdx, 0, movedItem);
                localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));

                window.renderRoster();
                if (typeof showToast === 'function') {
                    showToast('✅ 队员档案顺序已调整并永久保存！');
                }
            });
        });
    }

    // =========================================================================
    // 五、重写 renderRoster 与 renderProducts：支持三语自动切换 + 管理员拖拽与删除
    // =========================================================================
    window.renderRoster = function () {
        const rosterData = typeof getSavedRosterData === 'function' ? getSavedRosterData() : [];
        const savedPhotos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
        const isAdmin = isStrictAdmin();
        const lang = window.__ypLang || 'zh';
        const grid = document.getElementById('roster-grid');
        if (!grid) return;

        applyRosterGridCols();
        injectAdminRosterLayoutBar();

        grid.innerHTML = rosterData.map(m => {
            const tr = (lang !== 'zh' && rosterTranslations[m.id] && rosterTranslations[m.id][lang]) ? rosterTranslations[m.id][lang] : null;
            const roleText = tr ? tr.role : (lang === 'en' ? (m.role_en || m.role_zh) : (lang === 'es' ? (m.role_es || m.role_zh) : m.role_zh));
            const ageText = tr ? tr.ageSpec : m.ageSpec;
            const highText = tr ? tr.highlight : m.highlight;
            const bioText = tr ? tr.bio : m.bio;
            const photoUrl = savedPhotos[m.id] || m.photo;

            const slotLabel = lang === 'en' ? '2027 Official Portrait Slot' : (lang === 'es' ? 'Espacio para Foto Oficial 2027' : '2027赛季官方定妆照预留位');
            const viewProfileLabel = lang === 'en' ? 'View Full Profile' : (lang === 'es' ? 'Ver Perfil Individual' : '进入个人独立主页');
            const delLabel = lang === 'en' ? 'Delete' : (lang === 'es' ? 'Eliminar' : '删除队员');

            return `
                <div class="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 flex flex-col justify-between hover:border-yp-lime transition group relative" data-roster-id="${m.id}">
                    <div>
                        <div class="relative h-60 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center overflow-hidden">
                            ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" class="w-full h-full object-cover">` : `
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
                                <div data-no-edit="true" class="absolute bottom-3 left-3 px-2.5 py-1 bg-amber-400 text-gray-900 text-[11px] font-black rounded shadow flex items-center space-x-1">
                                    <i class="fa-solid fa-arrows-up-down-left-right"></i>
                                    <span>按住拖拽排序</span>
                                </div>
                                <button onclick="triggerMemberPhotoUpload('${m.id}')" data-no-edit="true" class="absolute bottom-3 right-3 px-3 py-1.5 bg-yp-red hover:bg-red-700 text-white text-xs font-black rounded-lg shadow-lg flex items-center space-x-1">
                                    <i class="fa-solid fa-camera"></i>
                                    <span>上传/更换照片</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="p-6">
                            <div class="roster-agespec text-xs text-gray-400 mb-1">${ageText}</div>
                            <h3 class="roster-name text-2xl font-black text-white mb-2">${m.name}</h3>
                            <div class="roster-highlight p-2.5 rounded-lg bg-gray-900/80 border border-gray-700 text-xs text-yp-lime font-bold mb-3">${highText}</div>
                            <div class="roster-bio text-xs text-gray-300 leading-relaxed space-y-1.5">${bioText}</div>
                        </div>
                    </div>
                    <div data-no-edit="true" class="px-6 py-3 bg-gray-900/70 border-t border-gray-700 flex items-center justify-between text-xs">
                        <button onclick="openEntitySubpage('rider', '${m.id}')" class="text-yp-lime font-bold hover:underline flex items-center">
                            <span>${viewProfileLabel}</span> <i class="fa-solid fa-arrow-right ml-1"></i>
                        </button>
                        ${isAdmin ? `<button onclick="deleteRosterMember('${m.id}')" class="text-red-400 hover:text-red-300 font-bold"><i class="fa-solid fa-trash mr-1"></i>${delLabel}</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        enableAdminRosterDragAndDrop();

        // 若存在管理员新增的未预置翻译车手，在非中文模式下自动用微软翻译补齐
        if (lang !== 'zh') {
            setTimeout(() => window.translateEntireDOM(lang), 50);
        }
    };

    window.renderProducts = function (filter = 'all') {
        const grid = document.getElementById('product-grid');
        if (!grid || typeof products === 'undefined') return;
        const lang = window.__ypLang || 'zh';
        const list = filter === 'all' ? products : products.filter(p => p.category === filter);

        const priceLabel = lang === 'en' ? 'Official Store Price' : (lang === 'es' ? 'Precio Oficial' : '官方同步售价');
        const buyLabel = lang === 'en' ? 'Add to Cart' : (lang === 'es' ? 'Añadir' : '选购');

        grid.innerHTML = list.map(p => {
            const tr = (lang !== 'zh' && productTranslations[p.id] && productTranslations[p.id][lang]) ? productTranslations[p.id][lang] : null;
            const brand = tr ? tr.brand : p.brand;
            const name = tr ? tr.name : p.name;
            const desc = tr ? tr.desc : p.desc;
            const badge = tr ? tr.badge : p.badge;

            return `
                <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div>
                        <div class="h-36 bg-gradient-to-br from-gray-900 via-gray-800 to-yp-darkGreen relative flex items-center justify-center p-4">
                            <span class="absolute top-3 left-3 px-2.5 py-0.5 bg-yp-lime text-gray-900 text-[11px] font-black rounded">${badge}</span>
                            <span class="absolute top-3 right-3 text-[11px] text-gray-300 font-bold">${brand}</span>
                            <i class="fa-solid ${p.icon} text-5xl text-white/90"></i>
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
    };

    // =========================================================================
    // 六、详情子页面、合集、自定义训练与新页面管理（保持完整兼容）
    // =========================================================================
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
    function getCustomProducts() { try { return JSON.parse(localStorage.getItem('yp_custom_products') || '[]'); } catch (e) { return []; } }
    function getCustomTrainings() { try { return JSON.parse(localStorage.getItem('yp_custom_trainings') || '[]'); } catch (e) { return []; } }
    function getCustomPages() { try { return JSON.parse(localStorage.getItem('yp_custom_pages') || '[]'); } catch (e) { return []; } }

    function initDynamicSubpageContainer() {
        const main = document.getElementById('editable-main');
        if (!main || document.getElementById('page-subdetail')) return;
        const detailSec = document.createElement('div');
        detailSec.id = 'page-subdetail';
        detailSec.className = 'page-section py-14 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8';
        detailSec.innerHTML = `<div id="subdetail-content"></div>`;
        main.appendChild(detailSec);
    }

    window.openEntitySubpage = function (type, id) {
        const container = document.getElementById('subdetail-content');
        if (!container) return;
        const lang = window.__ypLang || 'zh';

        if (type === 'rider' && typeof getSavedRosterData === 'function') {
            const list = getSavedRosterData();
            const photos = typeof getSavedMemberPhotos === 'function' ? getSavedMemberPhotos() : {};
            const m = list.find(r => String(r.id) === String(id));
            if (!m) return;
            const tr = (lang !== 'zh' && rosterTranslations[m.id] && rosterTranslations[m.id][lang]) ? rosterTranslations[m.id][lang] : null;
            const roleText = tr ? tr.role : m.role_zh;
            const ageText = tr ? tr.ageSpec : m.ageSpec;
            const highText = tr ? tr.highlight : m.highlight;
            const bioText = tr ? tr.bio : m.bio;
            const img = photos[m.id] || m.photo || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80';
            container.innerHTML = `
                <button onclick="switchPage('roster')" class="mb-6 inline-flex items-center text-xs font-bold text-yp-darkGreen hover:underline">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> Back to Roster
                </button>
                <div class="bg-gray-900 text-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-12">
                    <div class="md:col-span-5 bg-gray-800 min-h-[320px]"><img src="${img}" alt="${m.name}" class="w-full h-full object-cover"></div>
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
            `;
        } else if (type === 'product' && typeof products !== 'undefined') {
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            const tr = (lang !== 'zh' && productTranslations[p.id] && productTranslations[p.id][lang]) ? productTranslations[p.id][lang] : null;
            container.innerHTML = `
                <button onclick="switchPage('shop')" class="mb-6 inline-flex items-center text-xs font-bold text-yp-darkGreen hover:underline">
                    <i class="fa-solid fa-arrow-left mr-1.5"></i> Back to Official Shop
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
                            <i class="fa-solid fa-cart-plus mr-1.5"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }
        window.switchPage('subdetail');
    };

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
        if (galleryGrid) galleryPage.insertBefore(colWrapper, galleryGrid);
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
            if (col.type === 'video') {
                mediaHtml = `<video src="${col.mediaUrl}" poster="${col.cover || ''}" controls class="w-full h-64 object-cover bg-black"></video>`;
            } else if (col.type === 'bilibili') {
                const match = col.mediaUrl.match(/BV[a-zA-Z0-9]+/);
                const bvid = match ? match[0] : col.mediaUrl;
                mediaHtml = `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0" class="w-full h-64 bg-black" frameborder="0" allowfullscreen></iframe>`;
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
        if (window.__ypLang !== 'zh') setTimeout(() => window.translateEntireDOM(window.__ypLang), 60);
    };

    window.deleteCollectionItem = function (id) {
        if (!isStrictAdmin()) return;
        saveCollections(getCollections().filter(c => String(c.id) !== String(id)));
        window.renderCollectionsGrid('all');
    };

    window.deleteRosterMember = function (id) {
        if (!isStrictAdmin() || !confirm('确定要从车队名单中删除该成员吗？')) return;
        const list = getSavedRosterData().filter(r => String(r.id) !== String(id));
        localStorage.setItem('yp_roster_custom_data', JSON.stringify(list));
        window.renderRoster();
    };

    // 管理员创建工作台注入（严格校验仅限管理员）
    function injectAdminCreatorStudio() {
        const floatBar = document.querySelector('#admin-floating-bar .flex.flex-wrap.items-center.gap-2');
        if (floatBar && !document.getElementById('btn-open-studio')) {
            const studioBtn = document.createElement('button');
            studioBtn.id = 'btn-open-studio';
            studioBtn.setAttribute('onclick', 'openAdminStudioModal()');
            studioBtn.className = 'px-4 py-2 bg-amber-400 text-gray-900 text-xs font-black rounded-lg hover:bg-amber-300 transition flex items-center space-x-1.5 shadow';
            studioBtn.innerHTML = `<i class="fa-solid fa-folder-plus"></i><span>➕ 创建合集 / 队员 / 商品 / 新页面</span>`;
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
                        <h3 class="text-lg font-black mt-1">管理员内容创建与新页面工作台</h3>
                    </div>
                    <button onclick="closeAdminStudioModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="flex overflow-x-auto bg-gray-100 p-2 gap-1.5 text-xs font-bold border-b border-gray-200">
                    <button onclick="switchStudioTab('collection')" id="stab-collection" class="studio-tab px-3 py-2 rounded-lg bg-yp-darkGreen text-white shrink-0">🎬 新增图片/视频合集</button>
                    <button onclick="switchStudioTab('rider')" id="stab-rider" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🚴 新增车队成员</button>
                    <button onclick="switchStudioTab('product')" id="stab-product" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">🛒 上架新商城商品</button>
                    <button onclick="switchStudioTab('newpage')" id="stab-newpage" class="studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0">📄 创建全新独立页面</button>
                </div>
                <div class="p-6 overflow-y-auto space-y-4 text-xs">
                    <form id="sform-collection" onsubmit="handleAddCollection(event)" class="space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">合集名称 *</label><input type="text" id="col-title" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">合集类型 *</label><select id="col-type" class="w-full rounded-xl border border-gray-300 px-3 py-2"><option value="video">🎬 MP4 视频合集</option><option value="bilibili">📺 B站视频 (填BV号)</option><option value="image">📸 图片合集</option></select></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">分类标签</label><input type="text" id="col-cat" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">上传本地文件（可选）</label><input type="file" id="col-file" accept="image/*,video/*" class="w-full text-xs"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">或 填写视频URL / B站BV号 / 图片外链</label><input type="text" id="col-url" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">合集简介说明</label><textarea id="col-desc" rows="2" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即发布到「车队风采 Gallery」</button>
                    </form>

                    <form id="sform-rider" onsubmit="handleAddRider(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">队员姓名 *</label><input type="text" id="nr-name" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">队内角色 *</label><input type="text" id="nr-role" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">国籍旗帜</label><input type="text" id="nr-flag" value="🇨🇳" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">年龄与特点 *</label><input type="text" id="nr-age" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">高光头衔 *</label><input type="text" id="nr-high" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">上传定妆照片（可选）</label><input type="file" id="nr-file" accept="image/*" class="w-full text-xs"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">详细履历介绍 *</label><textarea id="nr-bio" required rows="3" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">添加队员并生成个人主页</button>
                    </form>

                    <form id="sform-product" onsubmit="handleAddProduct(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">品牌名称 *</label><input type="text" id="np-brand" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">分类 *</label><select id="np-cat" class="w-full rounded-xl border border-gray-300 px-3 py-2"><option value="spect">空力公式 (Spect)</option><option value="elves">精灵 (ELVES)</option><option value="helmet">ESSEN头盔</option><option value="pedal">卓锐锁踏/配件</option></select></div>
                            <div><label class="block font-bold text-gray-700 mb-1">售价 (元) *</label><input type="number" id="np-price" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">商品名称 *</label><input type="text" id="np-name" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">商品描述 *</label><textarea id="np-desc" required rows="3" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即上架到官方商城</button>
                    </form>

                    <form id="sform-newpage" onsubmit="handleAddNewPage(event)" class="hidden space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label class="block font-bold text-gray-700 mb-1">顶部导航按钮名 *</label><input type="text" id="npg-nav" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                            <div><label class="block font-bold text-gray-700 mb-1">页面主标题 *</label><input type="text" id="npg-title" required class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        </div>
                        <div><label class="block font-bold text-gray-700 mb-1">配图URL（选填）</label><input type="url" id="npg-img" class="w-full rounded-xl border border-gray-300 px-3 py-2"></div>
                        <div><label class="block font-bold text-gray-700 mb-1">页面正文内容 *</label><textarea id="npg-content" required rows="4" class="w-full rounded-xl border border-gray-300 px-3 py-2"></textarea></div>
                        <button type="submit" class="w-full py-3 bg-yp-darkGreen text-white font-black rounded-xl">立即创建新页面并加入导航栏</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.openAdminStudioModal = function () {
        if (!isStrictAdmin()) return;
        document.getElementById('admin-studio-modal').classList.remove('hidden');
    };
    window.closeAdminStudioModal = function () { document.getElementById('admin-studio-modal').classList.add('hidden'); };
    window.switchStudioTab = function (tab) {
        ['collection', 'rider', 'product', 'newpage'].forEach(t => {
            const f = document.getElementById('sform-' + t);
            const b = document.getElementById('stab-' + t);
            if (f) f.classList.toggle('hidden', t !== tab);
            if (b) b.className = t === tab ? 'studio-tab px-3 py-2 rounded-lg bg-yp-darkGreen text-white shrink-0' : 'studio-tab px-3 py-2 rounded-lg bg-white text-gray-700 shrink-0';
        });
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
        };
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => saveRider(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else saveRider('');
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
    };

    window.renderAllCustomPages = function () {
        const pages = getCustomPages();
        const desktopNav = document.querySelector('header nav.hidden.xl\\:flex');
        const mobileNav = document.querySelector('header div.xl\\:hidden.flex');
        const mainContainer = document.getElementById('editable-main');
        const isAdmin = isStrictAdmin();

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
                        <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">${p.content}</div>
                    </div>
                `;
                mainContainer.appendChild(sec);
            }
        });
    };

    window.deleteCustomPage = function (id) {
        if (!isStrictAdmin() || !confirm('确定要删除这个自定义页面吗？')) return;
        localStorage.setItem('yp_custom_pages', JSON.stringify(getCustomPages().filter(p => String(p.id) !== String(id))));
        window.renderAllCustomPages();
        window.switchPage('home');
    };

    // =========================================================================
    // 七、全局初始化与挂钩
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        safeRemoveQiuHaolin();
        initDynamicSubpageContainer();
        injectGalleryCollectionsUI();
        injectAdminCreatorStudio();
        window.renderAllCustomPages();

        try {
            if (typeof products !== 'undefined') {
                getCustomProducts().forEach(cp => {
                    if (!products.some(p => String(p.id) === String(cp.id))) products.push(cp);
                });
            }
        } catch (e) {}

        window.renderRoster();
        window.renderProducts('all');

        // 钩住语言切换按钮，确保全站所有板块（队员、商业赞助、骑游、商城）瞬间完成英/西切换并启动微软翻译兜底
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
                injectAdminCreatorStudio();
                window.renderRoster();
                window.renderCollectionsGrid('all');
                window.renderAllCustomPages();
                if (window.__ypLang !== 'zh') {
                    setTimeout(() => window.translateEntireDOM(window.__ypLang), 50);
                }
            };
        }
    });
})();
