
import { OIProblem } from '../types';

export const OI_PROBLEMS: OIProblem[] = [
    { name: "基础阅读", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 0, graph: 0, misc: 1 } },
    { name: "排序", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 0, graph: 0, misc: 1 } },
    { name: "序列", level: 2, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 0, misc: 2 } },
    { name: "树上问题", level: 2, difficulty: { dp: 0, ds: 2, math: 0, string: 0, graph: 2, misc: 2 } },
    { name: "最短路", level: 3, difficulty: { dp: 2, ds: 2, math: 0, string: 0, graph: 3, misc: 1 } },
    { name: "博弈", level: 4, difficulty: { dp: 2, ds: 1, math: 2, string: 0, graph: 1, misc: 3 } },
    { name: "字符串匹配", level: 5, difficulty: { dp: 0, ds: 0, math: 0, string: 5, graph: 0, misc: 2 } },
    { name: "网络流", level: 6, difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 6, misc: 4 } },
    { name: "数据结构", level: 7, difficulty: { dp: 0, ds: 5, math: 0, string: 0, graph: 0, misc: 5 } },
    { name: "动态规划优化", level: 8, difficulty: { dp: 8, ds: 3, math: 2, string: 0, graph: 0, misc: 4 } },
    { name: "多项式", level: 9, difficulty: { dp: 0, ds: 0, math: 9, string: 0, graph: 0, misc: 5 } },
    { name: "综合构造", level: 10, difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 10 } }
];
