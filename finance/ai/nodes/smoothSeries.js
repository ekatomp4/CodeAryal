
/**
 * Smooth a series of numbers with simple exponential smoothing.
 * @param {number[]} data - array of numbers to smooth
 * @param {number} smoothPercent - how much to weight previous value (0-1)
 * @returns {number[]} smoothed array
 */
function smoothSeries(data, smoothPercent = 0.6) {
    if (data.length === 0) return [];
    const smoothed = [data[0]]; // first value stays the same

    for (let i = 1; i < data.length; i++) {
        const prev = smoothed[i - 1];
        smoothed.push(prev * smoothPercent + data[i] * (1 - smoothPercent));
    }

    return smoothed;
}
 

export default smoothSeries;