export const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    //@ts-ignore
    !window.MSStream;

export const throttle = (func: Function, timeFrame: number) => {
    var lastTime = 0;
    return function (...args: any[]) {
        let now = new Date() as unknown as number;
        if (now - lastTime >= timeFrame) {
            func(...args);
            lastTime = now;
        }
    };
}