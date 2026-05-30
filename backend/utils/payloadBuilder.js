
const hasOwn = Object.prototype.hasOwnProperty

export const buildUpdatePayload = (userdata, updateData) => {
    const updatePayload = {};
    for (const key in updateData) {
        if (hasOwn.call(updateData, key)) {
            const oldValue = userdata[key];
            const newValue = updateData[key];
            if (oldValue instanceof Date && newValue instanceof Date) {
                if (oldValue.getTime() !== newValue.getTime()) {
                    updatePayload[key] = newValue;
                }
            } else if (oldValue instanceof Date || (typeof oldValue === 'string' && !isNaN(Date.parse(oldValue)))) {
                const oldDate = new Date(oldValue).getTime();
                const newDate = new Date(newValue).getTime();
                if (oldDate !== newDate) {
                    updatePayload[key] = newValue;
                }
            } else if (oldValue !== newValue) {
                updatePayload[key] = newValue;
            }
        }
    }
    return updatePayload;
}

export const isMatchOfArrayItems = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    return [...set1].every(item => set2.has(item));
}