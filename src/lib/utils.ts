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

export const getShortestRotation = (initAngle: number) => {
    let currentAngle = initAngle
    return (bearing: number) => {
        let delta = (bearing - currentAngle + 180) % 360 - 180;
        currentAngle = currentAngle + delta;
        return currentAngle
    }
}