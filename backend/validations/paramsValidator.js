import Joi from 'joi';
import { objectId } from './productionValidation.js';


/**
 * Schema Factory: Tạo ra schema có sẵn ID và cho phép thêm các trường khác
 * @param {Object} extraFields - Các trường bổ sung (Vd: { categoryId: Joi.string() })
 */
export const commonParamsSchema = (extraFields = {}, includeId = true, abortEarly = false, stripUnknown = true) => {
    const shape = { ...extraFields };
    if (includeId) {
        shape.id = objectId.required();
    }
    const schema = Joi.object(shape);

    return (data) => schema.validate(data, { abortEarly, stripUnknown });
};