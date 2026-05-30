import ProductExportRequest from '../models/ProductExportRequest.js';
import Product from '../models/Product.js';
import { createSlipService } from './importExportSlipService.js';
import { createNotification } from './notificationService.js';
import {
    REQUISITION_STATUS,
    INVENTORY_IMPORT_EXPORT_SLIP_TYPE,
    INVENTORY_IMPORT_EXPORT_SLIP_STATUS,
    ROLES
} from '../utils/constants.js';
import mongoose from 'mongoose';
import { generateAtomicCode } from '../utils/codeGenerator.js';
import { ServiceResponse } from '../utils/serviceHelper.js';

/**
 * Production Manager creates a product export request
 */
export const createExportRequest = async (requestData, userId) => {
    try {
        const { items, reason, notes } = requestData;

        // 1. Check stock for each product
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) throw new Error(`Sản phẩm ${item.product} không tồn tại.`);

            if (product.currentStock < item.requestedQuantity) {
                throw new Error(`Không đủ tồn kho cho sản phẩm ${product.code}. Hiện có: ${product.currentStock}, Yêu cầu: ${item.requestedQuantity}`);
            }
        }

        const requestCode = await generateAtomicCode('PEX', 'product_export_code');
        const newRequest = new ProductExportRequest({
            requestCode,
            createdBy: userId,
            items,
            reason,
            notes,
            status: REQUISITION_STATUS.PENDING
        });

        await newRequest.save();

        // Notify Admins
        const adminRole = await mongoose.model('Role').findOne({ roleName: ROLES.ADMIN });
        const admins = adminRole ? await mongoose.model('User').find({ role: adminRole._id }) : [];
        for (const admin of admins) {
            await createNotification({
                recipient: admin._id,
                title: 'Yêu cầu xuất sản phẩm mới',
                message: `Quản lý sản xuất vừa tạo yêu cầu xuất sản phẩm mới (${requestCode}).`,
                type: 'INVENTORY',
                priority: 'MEDIUM',
                metaData: { requestId: newRequest._id }
            });
        }

        return ServiceResponse(true, 'Yêu cầu xuất hàng đã được tạo và chờ Admin duyệt.', newRequest);
    } catch (error) {
        console.error('[ProductExportService] createExportRequest error:', error);
        return ServiceResponse(false, error.message);
    }
};

/**
 * Admin approves or rejects the export request
 */
export const updateRequestStatus = async (requestId, status, adminId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const request = await ProductExportRequest.findById(requestId).populate('items.product').session(session);
        if (!request) throw new Error('Yêu cầu xuất hàng không tồn tại.');

        if (request.status !== REQUISITION_STATUS.PENDING) {
            throw new Error(`Không thể cập nhật yêu cầu ở trạng thái ${request.status}.`);
        }

        request.status = status;
        request.adminApprovedBy = adminId;
        request.approvedAt = new Date();

        if (status === REQUISITION_STATUS.APPROVED) {
            // Automatically create an Export Slip
            const slipItems = request.items.map(item => ({
                product: item.product._id,
                itemName: item.product.name,
                itemCode: item.product.code,
                unit: item.product.unit,
                quantity: {
                    requested: item.requestedQuantity,
                    actual: 0 // Will be updated by Kho Manager
                },
                unitPrice: item.product.baseCost || 0,
                amount: 0
            }));

            const slipData = {
                type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT,
                reason: `Xuất hàng theo yêu cầu ${request.requestCode}: ${request.reason || ''}`,
                personName: 'Người vận chuyển/Khách hàng', // Default placeholder
                relatedProductExportRequest: request._id,
                items: slipItems,
                date: new Date(),
                status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
            };

            const slipResult = await createSlipService(slipData, adminId, session);
            if (!slipResult.success) {
                throw new Error(`Lỗi khi tạo phiếu xuất kho: ${slipResult.message}`);
            }

            request.relatedSlip = slipResult.data._id;

            // Notify Production Manager and Kho Managers
            await createNotification({
                recipient: request.createdBy,
                title: 'Yêu cầu xuất hàng đã được duyệt',
                message: `Yêu cầu ${request.requestCode} của bạn đã được Admin phê duyệt.`,
                type: 'INVENTORY',
                priority: 'HIGH',
                metaData: { requestId: request._id, slipId: slipResult.data._id }
            });

            const khoManagerRole = await mongoose.model('Role').findOne({ roleName: ROLES.KHO_MANAGER });
            const khoManagers = khoManagerRole ? await mongoose.model('User').find({ role: khoManagerRole._id }) : [];
            for (const km of khoManagers) {
                await createNotification({
                    recipient: km._id,
                    title: 'Phiếu xuất kho mới cần xử lý',
                    message: `Yêu cầu xuất hàng ${request.requestCode} đã được duyệt. Vui lòng xử lý phiếu xuất ${slipResult.data.slipNumber}.`,
                    type: 'INVENTORY',
                    priority: 'MEDIUM',
                    metaData: { slipId: slipResult.data._id }
                });
            }
        } else if (status === REQUISITION_STATUS.REJECTED) {
            // Notify Production Manager
            await createNotification({
                recipient: request.createdBy,
                title: 'Yêu cầu xuất hàng bị từ chối',
                message: `Yêu cầu ${request.requestCode} của bạn đã bị từ chối.`,
                type: 'INVENTORY',
                priority: 'MEDIUM',
                metaData: { requestId: request._id }
            });
        }

        await request.save({ session });
        await session.commitTransaction();
        return ServiceResponse(true, `Yêu cầu đã được cập nhật trạng thái thành ${status}.`, request);
    } catch (error) {
        await session.abortTransaction();
        console.error('[ProductExportService] updateRequestStatus error:', error);
        return ServiceResponse(false, error.message);
    } finally {
        session.endSession();
    }
};

/**
 * Get all product export requests with filters
 */
export const getAllExportRequests = async (filters = {}, page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;
        const requests = await ProductExportRequest.find(filters)
            .populate('createdBy', 'fullName')
            .populate('adminApprovedBy', 'fullName')
            .populate('items.product', 'name code unit currentStock')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ProductExportRequest.countDocuments(filters);

        return ServiceResponse(true, 'Lấy danh sách yêu cầu thành công.', {
            requests,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ProductExportService] getAllExportRequests error:', error);
        return ServiceResponse(false, error.message);
    }
};

/**
 * Get request by ID
 */
export const getRequestById = async (id) => {
    try {
        const request = await ProductExportRequest.findById(id)
            .populate('createdBy', 'fullName')
            .populate('adminApprovedBy', 'fullName')
            .populate('items.product', 'name code unit currentStock shelf')
            .populate('relatedSlip');

        if (!request) return ServiceResponse(false, 'Yêu cầu không tồn tại.', null, 404);

        return ServiceResponse(true, 'Lấy chi tiết yêu cầu thành công.', request);
    } catch (error) {
        console.error('[ProductExportService] getRequestById error:', error);
        return ServiceResponse(false, error.message);
    }
};
