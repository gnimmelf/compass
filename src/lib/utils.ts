export const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    //@ts-ignore
    !window.MSStream;

export const throttle = (func: Function, timeFrame: number) => {
    let lastTime = 0;
    return (...args: any[]) => {
        let now = new Date() as unknown as number;
        if (now - lastTime >= timeFrame) {
            func(...args);
            lastTime = now;
        }
    };
}

export const interpolate = (func: Function, timeFrame: number) => {
    let lastTime = 0;
    let values: number[] = []
    let avgValue = NaN
    return (value: number) => {
        let now = new Date() as unknown as number;
        if (now - lastTime < timeFrame) {
            values.push(value)
        }
        else {
            // Time to pass a value
            lastTime = now;
            const newAvg = (values.reduce((acc, val) => (acc + val), 0)) / values.length

            avgValue = isNaN(newAvg)
                ? avgValue
                : newAvg

            values = []
            func(avgValue);
        }
    };
}