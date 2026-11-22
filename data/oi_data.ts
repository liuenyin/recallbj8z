
import type { OIProblem } from '../types';

export const OI_PROBLEMS: OIProblem[] = [
    { name: "基础模拟", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 1, graph: 0, misc: 2 } },
    { name: "排序与贪心", level: 1, difficulty: { dp: 0, ds: 2, math: 0, string: 0, graph: 0, misc: 2 } },
    { name: "前缀与序列", level: 2, difficulty: { dp: 1, ds: 2, math: 1, string: 0, graph: 0, misc: 2 } },
    { name: "字符串枚举", level: 2, difficulty: { dp: 0, ds: 1, math: 0, string: 3, graph: 0, misc: 2 } },
    { name: "树上遍历", level: 3, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 3, misc: 2 } },
    { name: "线性 DP", level: 3, difficulty: { dp: 4, ds: 1, math: 1, string: 0, graph: 0, misc: 2 } },
    { name: "最短路与拓扑", level: 4, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 4, misc: 2 } },
    { name: "博弈与构造", level: 4, difficulty: { dp: 2, ds: 1, math: 3, string: 0, graph: 0, misc: 4 } },
    { name: "字符串匹配", level: 5, difficulty: { dp: 0, ds: 1, math: 0, string: 5, graph: 0, misc: 3 } },
    { name: "区间与树形 DP", level: 5, difficulty: { dp: 5, ds: 2, math: 0, string: 0, graph: 2, misc: 2 } },
    { name: "树上数据结构", level: 6, difficulty: { dp: 1, ds: 6, math: 0, string: 0, graph: 3, misc: 3 } },
    { name: "计数与期望", level: 6, difficulty: { dp: 3, ds: 0, math: 6, string: 0, graph: 0, misc: 4 } },
    { name: "网络流建模", level: 7, difficulty: { dp: 0, ds: 2, math: 1, string: 0, graph: 7, misc: 4 } },
    { name: "进阶数据结构", level: 7, difficulty: { dp: 1, ds: 8, math: 1, string: 0, graph: 0, misc: 5 } },
    { name: "自动机与后缀结构", level: 8, difficulty: { dp: 1, ds: 2, math: 0, string: 8, graph: 0, misc: 4 } },
    { name: "动态规划优化", level: 8, difficulty: { dp: 9, ds: 4, math: 2, string: 0, graph: 0, misc: 4 } },
    { name: "高阶图论连通", level: 9, difficulty: { dp: 1, ds: 3, math: 1, string: 0, graph: 9, misc: 5 } },
    { name: "多项式与数论", level: 9, difficulty: { dp: 1, ds: 1, math: 10, string: 0, graph: 0, misc: 6 } },
    { name: "压轴综合构造", level: 10, difficulty: { dp: 3, ds: 2, math: 4, string: 0, graph: 2, misc: 10 } },
    { name: "NOI 杂题选讲", level: 10, difficulty: { dp: 5, ds: 5, math: 4, string: 3, graph: 4, misc: 6 } }
];
