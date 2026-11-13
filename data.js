/* 高考数学一轮复习 · 章节数据
 * 来源：课本目录实拍（第一章 ~ 第十章 + 四个进阶篇）
 * tips = 微点延伸，tag = 微重点
 */
const BOOK = [
  {
    id: 'ch1', no: '第一章', title: '集合、常用逻辑用语、不等式', page: 1,
    sections: [
      { id: '1.1', title: '集合', page: 1 },
      { id: '1.2', title: '常用逻辑用语', page: 4 },
      { id: '1.3', title: '等式性质与不等式性质', page: 7 },
      { id: '1.4', title: '基本不等式', page: 9 },
      { id: '1.5', title: '基本不等式的综合应用', page: 12, tips: [{ t: '柯西不等式', p: 13 }, { t: '权方和不等式', p: 14 }] },
      { id: '1.6', title: '一元二次方程、不等式', page: 14 }
    ]
  },
  {
    id: 'ch2', no: '第二章', title: '函数', page: 19,
    sections: [
      { id: '2.1', title: '函数的概念及其表示', page: 19 },
      { id: '2.2', title: '函数的单调性与最值', page: 22, tips: [{ t: '求函数值域(最值)的常用方法', p: 24 }] },
      { id: '2.3', title: '函数的奇偶性', page: 25 },
      { id: '2.4', title: '函数的周期性和对称性', page: 28, tips: [{ t: '抽象函数性质的综合应用', p: 30 }] },
      { id: '2.5', title: '二次函数与幂函数', page: 31 },
      { id: '2.6', title: '指数与指数函数', page: 34, tips: [{ t: '抽象函数', p: 37 }] },
      { id: '2.7', title: '对数与对数函数', page: 37 },
      { id: '2.8', title: '指、对、幂的大小比较', page: 40, tag: '微重点' },
      { id: '2.9', title: '函数的图象', page: 42 },
      { id: '2.10', title: '函数的零点与方程的解', page: 45 },
      { id: '2.11', title: '函数与方程的综合应用', page: 48, tag: '微重点' },
      { id: '2.12', title: '函数模型的应用', page: 49 }
    ]
  },
  {
    id: 'ch3', no: '第三章', title: '一元函数的导数及其应用', page: 53,
    sections: [
      { id: '3.1', title: '导数的概念及其意义、导数的运算', page: 53, tips: [{ t: '洛必达法则', p: 56 }] },
      { id: '3.2', title: '导数与函数的单调性', page: 56 },
      { id: '3.3', title: '导数与函数的极值、最值', page: 59, tips: [{ t: '常见组合函数的图象', p: 62 }] },
      { id: '3.4', title: '三次函数的图象与性质', page: 62 },
      { id: '3.5', title: '函数中的构造问题', page: 65, tag: '微重点', tips: [{ t: '泰勒展开式', p: 66 }] },
      { id: '3.6', title: '同构问题', page: 67, tag: '微重点' }
    ]
  },
  {
    id: 'ch3a', no: '进阶篇', title: '不等式的证明方法', page: 69,
    sections: [
      { id: '3a.1', title: '作差法与双函数构造法', page: 69 },
      { id: '3a.2', title: '指对放缩', page: 71, tips: [{ t: '飘带不等式', p: 73 }] },
      { id: '3a.3', title: '极值点偏移(一)', page: 74 },
      { id: '3a.4', title: '极值点偏移(二)', page: 76 }
    ]
  },
  {
    id: 'ch3b', no: '进阶篇', title: '不等式恒(能)成立问题', page: 78,
    sections: [
      { id: '3b.1', title: '参数全分离', page: 78 },
      { id: '3b.2', title: '参数半分离与主元变换', page: 80 },
      { id: '3b.3', title: '分类讨论', page: 81 },
      { id: '3b.4', title: '端点效应', page: 84 }
    ]
  },
  {
    id: 'ch3c', no: '进阶篇', title: '导数中的零点问题', page: 86,
    sections: [
      { id: '3c.1', title: '零点个数问题', page: 86 },
      { id: '3c.2', title: '隐零点', page: 88 }
    ]
  },
  {
    id: 'ch4', no: '第四章', title: '三角函数与解三角形', page: 90,
    sections: [
      { id: '4.1', title: '三角函数基本公式', page: 90 },
      { id: '4.2', title: '三角恒等变换', page: 93 },
      { id: '4.3', title: '三角函数的图象与性质', page: 96 },
      { id: '4.4', title: '函数 y=Asin(ωx+φ)', page: 100 },
      { id: '4.5', title: '三角函数中有关 ω 的范围问题', page: 103, tag: '微重点' },
      { id: '4.6', title: '正弦定理、余弦定理', page: 104, tips: [{ t: '相关定理在解三角形中的综合应用', p: 107 }] },
      { id: '4.7', title: '解三角形中的最值与范围问题', page: 108, tag: '微重点' },
      { id: '4.8', title: '解三角形应用举例', page: 110 }
    ]
  },
  {
    id: 'ch5', no: '第五章', title: '平面向量与复数', page: 113,
    sections: [
      { id: '5.1', title: '平面向量的概念及线性运算', page: 113, tips: [{ t: '等和(高)线定理', p: 116 }] },
      { id: '5.2', title: '平面向量基本定理及坐标表示', page: 116, tips: [{ t: '定比分点坐标公式', p: 119 }] },
      { id: '5.3', title: '平面向量的数量积', page: 119, tips: [{ t: '极化恒等式', p: 121 }] },
      { id: '5.4', title: '平面向量中的综合问题', page: 123, tag: '微重点', tips: [{ t: '四心问题', p: 124 }] },
      { id: '5.5', title: '复数', page: 125, tips: [{ t: '复数的三角形式', p: 128 }] }
    ]
  },
  {
    id: 'ch6', no: '第六章', title: '数列', page: 129,
    sections: [
      { id: '6.1', title: '数列的概念', page: 129 },
      { id: '6.2', title: '等差数列', page: 132 },
      { id: '6.3', title: '等比数列', page: 135, tips: [{ t: '下标和相等的等差(比)性质的推广', p: 138 }] },
      { id: '6.4', title: '数列中的构造问题', page: 139, tag: '微重点' },
      { id: '6.5', title: '数列求和(一)', page: 140 },
      { id: '6.6', title: '数列求和(二)', page: 144 }
    ]
  },
  {
    id: 'ch7', no: '第七章', title: '立体几何与空间向量', page: 148,
    sections: [
      { id: '7.1', title: '基本立体图形、简单几何体的表面积与体积', page: 148 },
      { id: '7.2', title: '球的切、接问题', page: 151, tag: '微重点', tips: [{ t: '多球堆叠相切问题', p: 153 }] },
      { id: '7.3', title: '空间点、直线、平面之间的位置关系', page: 154 },
      { id: '7.4', title: '空间直线、平面的平行', page: 157 },
      { id: '7.5', title: '空间直线、平面的垂直', page: 161, tips: [{ t: '三余弦定理 cosθ=cosθ₁·cosθ₂ 的应用', p: 165 }] },
      { id: '7.6', title: '空间向量的概念与运算', page: 165 },
      { id: '7.7', title: '向量法求空间角', page: 169, tips: [{ t: '利用法向量的方向判断二面角', p: 171 }] },
      { id: '7.8', title: '空间距离及立体几何中的探索性问题', page: 172 },
      { id: '7.9', title: '立体几何中的截面、交线问题', page: 175, tag: '微重点' },
      { id: '7.10', title: '立体几何中的动态、轨迹问题', page: 177, tag: '微重点' }
    ]
  },
  {
    id: 'ch8', no: '第八章', title: '直线和圆、圆锥曲线', page: 179,
    sections: [
      { id: '8.1', title: '直线的方程', page: 179 },
      { id: '8.2', title: '两条直线的位置关系', page: 182 },
      { id: '8.3', title: '圆的方程', page: 185 },
      { id: '8.4', title: '直线与圆、圆与圆的位置关系', page: 188, tips: [{ t: '圆的曲线系方程', p: 190 }] },
      { id: '8.5', title: '椭圆', page: 192 },
      { id: '8.6', title: '双曲线', page: 195, tips: [{ t: '圆锥曲线的第二定义', p: 196 }] },
      { id: '8.7', title: '离心率的范围问题', page: 198, tag: '微重点' },
      { id: '8.8', title: '抛物线', page: 200, tips: [{ t: '阿基米德三角形', p: 202 }] },
      { id: '8.9', title: '直线与圆锥曲线的位置关系', page: 203 }
    ]
  },
  {
    id: 'ch8a', no: '进阶篇', title: '圆锥曲线中的综合问题', page: 206,
    sections: [
      { id: '8a.1', title: '圆锥曲线中的常见结论及应用', page: 206 },
      { id: '8a.2', title: '求值与证明问题', page: 208 },
      { id: '8a.3', title: '最值与范围问题', page: 210 },
      { id: '8a.4', title: '定点问题', page: 212 },
      { id: '8a.5', title: '定值问题', page: 214 },
      { id: '8a.6', title: '定直线问题', page: 217, tips: [{ t: '极点、极线', p: 219 }] }
    ]
  },
  {
    id: 'ch9', no: '第九章', title: '统计与成对数据的统计分析', page: 220,
    sections: [
      { id: '9.1', title: '随机抽样、统计图表', page: 220 },
      { id: '9.2', title: '用样本估计总体', page: 224 },
      { id: '9.3', title: '成对数据的统计分析', page: 229 }
    ]
  },
  {
    id: 'ch10', no: '第十章', title: '计数原理、概率、随机变量及其分布', page: 235,
    sections: [
      { id: '10.1', title: '计数原理与排列组合', page: 235 },
      { id: '10.2', title: '二项式定理', page: 239 },
      { id: '10.3', title: '随机事件与概率', page: 241 },
      { id: '10.4', title: '事件的相互独立性与条件概率、全概率公式', page: 245, tips: [{ t: '概率问题中的递推数列', p: 247 }] },
      { id: '10.5', title: '离散型随机变量及其分布列、数字特征', page: 248, tips: [{ t: '均值、方差的大小比较、最值(范围)问题', p: 250 }] },
      { id: '10.6', title: '二项分布、超几何分布与正态分布', page: 253 },
      { id: '10.7', title: '概率与统计的综合问题', page: 258 },
      { id: '10.8', title: '概率、统计与其他知识的交汇问题', page: 263, tag: '微重点' }
    ]
  }
];

/* 扁平索引：每节附带所属章节信息 */
const SECTIONS = [];
const SECTION_MAP = {};
BOOK.forEach(function (ch) {
  ch.sections.forEach(function (sec, i) {
    const item = Object.assign({}, sec, {
      chId: ch.id,
      chNo: ch.no,
      chTitle: ch.title,
      order: SECTIONS.length
    });
    SECTIONS.push(item);
    SECTION_MAP[sec.id] = item;
  });
});

const TOTAL_SECTIONS = SECTIONS.length;
