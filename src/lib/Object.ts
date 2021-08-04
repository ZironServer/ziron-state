export function buildOptions<T>(defaults: Required<T>, options: Partial<T>): Required<T> {
    for(let k in options) {
        if(options.hasOwnProperty(k) && defaults.hasOwnProperty(k) && options[k] !== undefined) defaults[k] = options[k]!;
    }
    return defaults;
}