/**
 * Standardize response data format.
 * @param {Array} dataResponse - The response data array.
 * @returns {Array} - The standardized response data array.
 */
export const standardlizeResponseDataHelper = (dataResponse)=>{

    const data = dataResponse.map(item => ({
        ...item,
        createdAt: item.createdAt?.toLocaleString(),
        updatedAt: item.updatedAt?.toLocaleString(),
    }))
    return data
}
