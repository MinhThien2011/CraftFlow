import ProductExportRequest from '../models/ProductExportRequest.js';
import Product from '../models/Product.js';
import { createSlipService } from './importExportSlipService.js';
import { 
    REQUISITION_STATUS, 
    INVENTORY_IMPORT_EXPORT_SLIP_TYPE, 
    INVENTORY_IMPORT_EXPORT_SLIP_STATUS 
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
            if (!product) throw new Error(`Product ${item.product} not found.`);
            
            if (product.currentStock < item.requestedQuantity) {
                throw new Error(`Insufficient stock for product ${product.code}. Available: ${product.currentStock}, Requested: ${item.requestedQuantity}`);
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
        return ServiceResponse(true, 'Yêu cầu xuất hàng đã được tạo và chờ Admin duyệt.', newRequest, 201);
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
                relatedRequisition: request._id,
                items: slipItems,
                date: new Date(),
                status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
            };

            // FIX ISSUE 1: Pass session to createSlipService
            const slipResult = await createSlipService(slipData, adminId, session);
            if (!slipResult.success) {
                throw new Error(`Lỗi khi tạo phiếu xuất kho: ${slipResult.message}`);
            }

            request.relatedSlip = slipResult.data._id;
        }

        await request.save({ session });
        await session.commitTransaction();

        return ServiceResponse(true, status === REQUISITION_STATUS.APPROVED ? 'Yêu cầu đã được duyệt và phiếu xuất kho đã được tạo.' : 'Yêu cầu đã bị từ chối.', request);
    } catch (error) {
        await session.abortTransaction();
        console.error('[ProductExportService] updateRequestStatus error:', error);
        return ServiceResponse(false, error.message);
    } finally {
        session.endSession();
    }
};

/**
 * Get export requests with filters
 */
export const getExportRequests = async (filters = {}) => {
    try {
        const requests = await ProductExportRequest.find(filters)
            .populate('items.product', 'name code unit currentStock')
            .populate('createdBy', 'fullName')
            .populate('adminApprovedBy', 'fullName')
            .sort({ createdAt: -1 });
        
        return ServiceResponse(true, 'Danh sách yêu cầu xuất hàng.', requests);
    } catch (error) {
        console.error('[ProductExportService] getExportRequests error:', error);
        return ServiceResponse(false, error.message);
    }
};
