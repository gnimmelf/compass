
export const stringToBool = (val: any) => {
    if (typeof val === 'string') {
        if (isNaN(parseInt(val))) {
            // Not a number-string
            return val === 'true'
        }
        // Is a number-string
        return !!parseInt(val)
    }
    return !!val
}

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

export const bearingToRotation = (initBearing: number) => {
    let currentAngle = initBearing
    return (bearing: number) => {
        let delta = (bearing - currentAngle + 180) % 360 - 180;
        currentAngle = currentAngle + delta;
        return 360 - currentAngle
    }
}

export const latLngToPosition = (
    lat: number,
    lng: number,
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    planeWidth: number,
    planeHeight: number,
): {x: number, y: number } => {
    // Normalize the latitude and longitude to the range [0, 1]
    const x = (lng - minLng) / (maxLng - minLng);
    const y = (lat - minLat) / (maxLat - minLat);

    // Scale to the dimensions of the PlaneGeometry
    const posX = x * planeWidth - planeWidth / 2;
    const posY = y * planeHeight - planeHeight / 2;

    return { x: posX, y: posY };
}