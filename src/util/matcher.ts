import type { InputFieldResult } from "../schema.js";

export default function matcher(condition: InputFieldResult["type"], value: string, compare: string) {
    switch (condition) {
        case "regex": {
        // input should be trusted
            const r = new RegExp(value);
            return r.test(compare);
        }

        case "eq": {
            return value === compare;
        }

        case "neq": {
            return value !== compare;
        }

        default: {
            const valueN = Number(value), compareN = Number(compare);
            if (isNaN(valueN) || isNaN(compareN)) {
                return false;
            }

            switch (condition) {
                case "lt": {
                    return compareN < valueN;
                }
                case "lte": {
                    return compareN <= valueN;
                }
                case "gt": {
                    return compareN > valueN;
                }
                case "gte": {
                    return compareN >= valueN;
                }
            }
        }
    }

    // @ts-expect-error unreachable
    return false;
}
