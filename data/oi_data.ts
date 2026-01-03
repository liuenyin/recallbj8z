
import { OIProblem } from '../types';

export const OI_PROBLEMS: OIProblem[] = [
    { name: "book", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 0, graph: 0, misc: 1 } },
    { name: "sort", level: 1, difficulty: { dp: 0, ds: 1, math: 0, string: 0, graph: 0, misc: 1 } },
    { name: "sequence", level: 2, difficulty: { dp: 1, ds: 2, math: 0, string: 0, graph: 0, misc: 2 } },
    { name: "tree", level: 2, difficulty: { dp: 0, ds: 2, math: 0, string: 0, graph: 2, misc: 2 } },
    { name: "path", level: 3, difficulty: { dp: 2, ds: 2, math: 0, string: 0, graph: 3, misc: 1 } },
    { name: "game", level: 4, difficulty: { dp: 2, ds: 1, math: 2, string: 0, graph: 1, misc: 3 } },
    { name: "string", level: 5, difficulty: { dp: 0, ds: 0, math: 0, string: 5, graph: 0, misc: 2 } },
    { name: "network", level: 6, difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 6, misc: 4 } },
    { name: "structure", level: 7, difficulty: { dp: 0, ds: 5, math: 0, string: 0, graph: 0, misc: 5 } },
    { name: "dp_opt", level: 8, difficulty: { dp: 8, ds: 3, math: 2, string: 0, graph: 0, misc: 4 } },
    { name: "poly", level: 9, difficulty: { dp: 0, ds: 0, math: 9, string: 0, graph: 0, misc: 5 } },
    { name: "adhoc_hard", level: 10, difficulty: { dp: 0, ds: 0, math: 0, string: 0, graph: 0, misc: 10 } }
];
