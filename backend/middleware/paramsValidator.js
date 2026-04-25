export const validate = (schema, source = 'params') => {
    return (req, res, next) => {
        if (source === 'params' && (!req[source] || Object.keys(req[source]).length === 0)) {
            return next();
        }

        const { error } = schema(req[source]);

        if (error) {
            return res.status(400).json({
                status: 'fail',
                message: error.details[0].message
            });
        }

        next();
    };
};