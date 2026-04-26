export const validate = (schemaFactory, source = 'params', includeId = true, abortEarly = false, stripUnknown = true) => {
    return (req, res, next) => {
        if (source === 'params' && (!req[source] || Object.keys(req[source]).length === 0)) {
            return next();
        }

        const { error } = schemaFactory(req[source], includeId, abortEarly, stripUnknown);

        if (error) {
            return res.status(400).json({
                status: 'validation failed',
                messages: error.details.map(detail => detail.message.replace(/"/g, ''))
            });
        }

        next();
    };
};