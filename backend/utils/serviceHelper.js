/**
 * Standardize the response from Service layer to Controller layer.
 */
export const ServiceResponse = (success, message, data = null, statusCode = 200) => {
    return {
        success,
        status: success ? 'success' : 'error',
        message,
        data,
        statusCode
    };
};

/**
 * Normalize query parameters to create a consistent and safe Cache Key.
 * Prevents Cache Poisoning and Cache Misses due to parameter ordering.
 */
export const generateNormalizedCacheKey = (prefix, query = {}, allowedParams = []) => {
    if (!allowedParams.length) {
        // If no whitelist, just sort all keys to prevent ordering issues
        allowedParams = Object.keys(query).sort();
    }

    const normalizedQuery = {};
    allowedParams.sort().forEach(key => {
        if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
            normalizedQuery[key] = query[key];
        }
    });

    const queryString = JSON.stringify(normalizedQuery);
    return `${prefix}:${queryString}`;
};
