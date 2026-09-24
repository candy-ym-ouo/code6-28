export type Actor = { id:string; name:string; role:string; precision:number; acting:number; improvisation:number; stamina:number; trait:string; bio:string };
export type Town = { id:string; name:string; region:string; legend:string; mood:string; audience:string; capacity:number; ticket:number; clues:string[] };
// 旅费唯一口径：前后端展示、后端校验与扣费都必须使用此函数，最低 12
export const travelCost=(town:Pick<Town,'capacity'>):number=>Math.max(12,Math.round(town.capacity/8));
export type Play = { id:string; name:string; blurb:string; tags:string[]; acts:string[]; endings:string[] };
export type Action = { id:string; name:string; category:string; duration:number; stamina:number; tags:string[]; description:string };
export const actors:Actor[] = [
 {id:'mei',name:'梅枝',role:'牵线师',precision:8,acting:6,improvisation:5,stamina:78,trait:'耐力好',bio:'能把最细小的情绪传给最后一排。'},
 {id:'luo',name:'罗盘',role:'即兴演员',precision:5,acting:7,improvisation:9,stamina:72,trait:'现 场救场',bio:'总能在木偶摔倒时把它变成剧情。'},
 {id:'yan',name:'燕尾',role:'武生',precision:7,acting:8,improvisation:4,stamina:64,trait:'擅长英雄',bio:'动作利落，最怕没有掌声。'},
 {id:'qi',name:'漆灯',role:'老戏骨',precision:9,acting:9,improvisation:6,stamina:60,trait:'擅长悲剧',bio:'一盏旧灯下，能让沉默也有重量。'},
 {id:'he',name:'荷叶',role:'新学徒',precision:4,acting:5,improvisation:8,stamina:88,trait:'不惧失败',bio:'第一次上台，但永远愿意再试一次。'}
];
export const towns:Town[] = [
 {id:'lantern',name:'灯笼镇',region:'北岸',legend:'失火的月亮',mood:'焦虑',audience:'孩子与灯匠',capacity:120,ticket:8,clues:['月亮曾落在钟楼','灯匠害怕黑夜','孩子期待勇敢的结尾']},
 {id:'reed',name:'芦花渡',region:'河谷',legend:'不归的摆渡人',mood:'哀思',audience:'船夫与长者',capacity:90,ticket:10,clues:['船票留在旧衣里','渡口不收硬币','有人仍在等船']},
 {id:'stone',name:'石榴村',region:'南坡',legend:'会唱歌的石头',mood:'期待',audience:'工匠与商人',capacity:150,ticket:7,clues:['裂缝里有种子','石匠不许砸碎它','歌声在清晨出现']},
 {id:'moss',name:'苔原镇',region:'西岭',legend:'森林的借火人',mood:'敬畏',audience:'猎人和守林人',capacity:80,ticket:12,clues:['火只能借不能夺','鹿角指向古树','守林人不喜欢英雄']},
 {id:'paper',name:'纸鸢城',region:'东风',legend:'飞不高的风筝',mood:'庆典',audience:'孩子与旅人',capacity:180,ticket:6,clues:['风筝线系着愿望','城墙上有旧风向','最高处不是天空']},
 {id:'well',name:'回声井',region:'旧路',legend:'井底的第二个声音',mood:'好奇',audience:'学者与矿工',capacity:110,ticket:9,clues:['回声会迟到','井水映出陌生脸','不要回答第三次']},
 {id:'red',name:'红伞集',region:'南门',legend:'雨中的客人',mood:'温情',audience:'摊贩与旅人',capacity:140,ticket:8,clues:['红伞从不收起','客人没有脚印','雨停前要留一盏灯']},
 {id:'bell',name:'钟影港',region:'海角',legend:'沉睡的潮汐钟',mood:'沉静',audience:'水手与钟匠',capacity:100,ticket:11,clues:['钟声不能催潮','铜锈里有海图','最后一声留给离人']}
];
export const plays:Play[] = [
 {id:'moon',name:'月亮邮差',blurb:'一封寄往天上的信，最后该由谁签收？',tags:['温情','神秘'],acts:['邮差在夜色中迷路','木偶们追逐落下的月光','信封打开，等待一个选择'],endings:['让月亮留下','把月亮送回天上','把信交给镇上的孩子']},
 {id:'lion',name:'纸狮子的冬天',blurb:'纸做的狮子也能守护一座城吗？',tags:['英雄','滑稽'],acts:['小狮子学会站立','风暴撕开纸做的身体','守护不一定需要利爪'],endings:['狮子留下守城','狮子化作风','孩子们接过鬃毛']},
 {id:'river',name:'河流记得',blurb:'每一条河都替人保管着一个秘密。',tags:['悲剧','哀思'],acts:['摆渡人收下最后一张船票','河水带来旧日回声','有人决定不再等待'],endings:['船驶向雾中','把船票烧掉','在岸边种一棵树']},
 {id:'seed',name:'会唱歌的种子',blurb:'当一颗种子开口，谁会先听见春天？',tags:['庆典','温情'],acts:['石头在夜里发出歌声','工匠争论是否凿开它','歌声落进每个人的掌心'],endings:['保护裂缝','让歌声远行','把石头雕成舞台']},
 {id:'fire',name:'借火的人',blurb:'火焰可以照亮道路，也会留下代价。',tags:['神秘','英雄'],acts:['旅人向森林借火','守林人提出三个问题','归还火焰的时刻到来'],endings:['火还给森林','带火走向黑暗','两人一起守火']},
 {id:'echo',name:'第三次回声',blurb:'井底的声音知道你不愿承认的事。',tags:['神秘','悲剧'],acts:['矿工听见自己的名字','回声比人先做出选择','井口只剩一个声音'],endings:['回答回声','保持沉默','把井填平']}
];
export const actions:Action[] = [
 {id:'enter',name:'入场',category:'位移',duration:1,stamina:2,tags:['开场'],description:'让木偶从幕边走入灯光。'},
 {id:'bow',name:'鞠躬',category:'表演',duration:1,stamina:3,tags:['温情'],description:'把谢意传给观众。'},
 {id:'embrace',name:'拥抱',category:'表演',duration:1,stamina:5,tags:['温情','哀思'],description:'两只木偶在沉默中靠近。'},
 {id:'duel',name:'对决',category:'表演',duration:2,stamina:9,tags:['英雄'],description:'让牵线在冲突中交错。'},
 {id:'cry',name:'哭泣',category:'表演',duration:1,stamina:5,tags:['悲剧','哀思'],description:'一滴木头做的眼泪。'},
 {id:'dance',name:'庆舞',category:'表演',duration:2,stamina:7,tags:['庆典'],description:'让整个舞台一起旋转。'},
 {id:'leap',name:'跃台',category:'技巧',duration:1,stamina:8,tags:['英雄'],description:'高风险的腾跃，需要精准。'},
 {id:'mask',name:'变脸',category:'技巧',duration:1,stamina:6,tags:['神秘'],description:'一张脸藏住另一张脸。'},
 {id:'lift',name:'联合托举',category:'技巧',duration:2,stamina:6,tags:['温情'],description:'至少两名演员共同完成。'},
 {id:'exit',name:'退场',category:'位移',duration:1,stamina:2,tags:['收束'],description:'把故事交还给帷幕。'},
 {id:'chase',name:'追逐',category:'位移',duration:2,stamina:8,tags:['滑稽'],description:'节奏明快的舞台追逐。'},
 {id:'listen',name:'侧耳倾听',category:'表演',duration:1,stamina:2,tags:['神秘','哀思'],description:'让木偶听见传说的回声。'}
];
// 历史存档迁移：资金不允许为负（早期校验口径错误会产生负余额），统一归零
export const migrateLegacyFunds=<T extends {funds:number}>(tours:T[]):number=>{let migrated=0;for(const t of tours){if(!Number.isFinite(t.funds)||t.funds<0){t.funds=0;migrated++}}return migrated};
