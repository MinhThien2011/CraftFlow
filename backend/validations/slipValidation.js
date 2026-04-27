import joi from 'joi';
import { INVENTORY_IMPORT_EXPORT_SLIP_STATUS, INVENTORY_IMPORT_EXPORT_SLIP_TYPE } from '../utils/constants.js';
import { objectId } from './productionValidation.js';

const slipValidationSchema = joi.object({
    type: joi.string().required().valid(INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT, INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT),
    slipNumber: joi.string().optional(), // Can be auto-generated or filled later
    date: joi.date().required(),
    status: joi.string().optional().valid(...Object.values(INVENTORY_IMPORT_EXPORT_SLIP_STATUS)),
    unit: joi.string().optional(),
    department: joi.string().optional(),
    accounting: joi.object({
        debit: joi.string().optional().allow('').trim(),
        credit: joi.string().optional().allow('').trim(),
    }).default({ debit: '', credit: '' }),
    personName: joi.string().optional(),
    addressOrDepartment: joi.string().optional(),
    reason: joi.string().required(),
    warehouse: joi.object({
        name: joi.string().optional().trim(),
        location: joi.string().optional().trim(),
    }).optional(),
    referenceDoc: joi.object({ // "Theo... số... ngày... tháng... năm... của..."
        description: joi.string().optional().trim(), // e.g., "Hóa đơn", "Lệnh điều động"
        number: joi.string().optional().trim(),
        date: joi.date().optional(),
        issuer: joi.string().optional().trim(), // "của..." (Entity that issued the document)
    }).optional(),
    items: joi.array().items({
        material: joi.string().optional(), // ObjectId as string
        product: joi.string().optional(), // ObjectId as string

        // Snapshots to preserve historical data if Material/Product is updated or deleted
        itemName: joi.string().required().trim(), // "Tên, nhãn hiệu, quy cách..."
        itemCode: joi.string().required().trim(), // "Mã số"
        unit: joi.string().required().trim(),     // "Đơn vị tính"

        quantity: joi.object({
            requested: joi.number().required().min(0), // "Theo chứng từ" / "Yêu cầu"
            provisional: joi.number().optional().min(0).default(0), // "Số lượng tạm tính"
            actual: joi.number().optional().min(0).default(0), // "Thực nhập" / "Thực xuất"
        }).required(),
        unitPrice: joi.number().optional().min(0).default(0), // "Đơn giá"
        amount: joi.number().optional().min(0).default(0), // "Thành tiền"

        // Batch tracking
        batchNumber: joi.string().optional().trim(),
        expirationDate: joi.date().optional().allow(null),

        // Storage & Notes
        shelf: joi.string().optional().hex().length(24).allow(null),
        itemNote: joi.string().optional().allow('').trim(),
    }).required(),
    totalAmount: joi.number().optional(), // "Cộng"
    totalAmountInWords: joi.string().optional(), // "Tổng số tiền (viết bằng chữ)"
    originalDocsCount: joi.string().optional().trim(), // "Số lượng chứng từ"
    signatures: joi.object({
        creator: joi.string().optional(), // User ID
        personInOut: joi.string().optional().trim(),
        storekeeper: joi.string().optional(), // User ID
        chiefAccountant: joi.string().optional(), // User ID
        manager: joi.string().optional(), // User ID
    }).optional(),
    images: joi.array().items(joi.string()).optional(),
    notes: joi.string().optional().allow('').trim(),
});

export const slipValidatior = (data) => slipValidationSchema.validate(data, { abortEarly: false, stripUnknown: true });

const updateStatusValidationSchema = joi.object({
    status: joi.string().required().valid(...Object.values(INVENTORY_IMPORT_EXPORT_SLIP_STATUS)),
    items: joi.array().items(joi.object({
        itemCode: joi.string().optional().trim(),
        material: joi.string().optional(),
        product: joi.string().optional(),

        actualQuantity: joi.number().optional().min(0),
        provisionalQuantity: joi.number().optional().min(0),

        itemNote: joi.string().optional().allow('').trim(),
        batchNumber: joi.string().optional().trim(),
        expirationDate: joi.date().optional().allow(null),
        shelf: objectId.allow(null),
    })).optional(),
    scannedItems: joi.array().items(joi.object({
        itemCode: joi.string().optional().trim(),
        actualQuantity: joi.number().optional().min(0),
        provisionalQuantity: joi.number().optional().min(0),
    })).optional(),
    notes: joi.string().optional().allow('').trim(),
    signatures: joi.object().optional(),
});

export const slipUpdateStatusValidator = (data) => updateStatusValidationSchema.validate(data, { abortEarly: false, stripUnknown: true });
