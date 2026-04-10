
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
    console.log('userdata', userdata);
    console.log('updateData', updateData);
    console.log('updatePayload', updatePayload);
    return updatePayload;
}