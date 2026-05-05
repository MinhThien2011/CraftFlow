import ProductExportRequest from '../models/ProductExportRequest.js';
import Product from '../models/Product.js';
import { createSlipService } from './importExportSlipService.js';
import { 
    REQUISITION_STATUS, 
    INVENTORY_IMPORT_EXPORT_SLIP_TYPE, 
    INVENTORY_IMPORT_EXPORT_SLIP_STATUS 
} from '../utils/constants.js';
import mongoose from 'mongoose';

/**
 * Generate a unique request code for product export
 */
const generateRequestCode = async () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PEX-${dateStr}-`;
    
    const count = await ProductExportRequest.countDocuments({
        requestCode: { $regex: `^${prefix}` }
    });
    
    return `${prefix}${(count + 1).toString().padStart(3, '0')}`;
};

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

        const requestCode = await generateRequestCode();
        const newRequest = new ProductExportRequest({
            requestCode,
            createdBy: userId,
            items,
            reason,
            notes,
            status: REQUISITION_STATUS.PENDING
        });

        await newRequest.save();
        return { status: 'success', message: 'Export request created and waiting for Admin approval.', data: newRequest };
    } catch (error) {
        console.error('[ProductExportService] createExportRequest error:', error);
        return { status: 'error', message: error.message, data: null };
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
        if (!request) throw new Error('Export request not found.');

        if (request.status !== REQUISITION_STATUS.PENDING) {
            throw new Error(`Cannot update request status ${request.status}.`);
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

            const slipResult = await createSlipService(slipData, adminId);
            if (!slipResult.success) {
                throw new Error(`Lỗi khi tạo phiếu xuất kho: ${slipResult.message}`);
            }

            request.relatedSlip = slipResult.data._id;
        }

        await request.save({ session });
        await session.commitTransaction();

        return { 
            status: 'success', 
            message: status === REQUISITION_STATUS.APPROVED ? 'Export request approved and export slip created.' : 'Export request rejected.',
            data: request 
        };
    } catch (error) {
        await session.abortTransaction();
        console.error('[ProductExportService] updateRequestStatus error:', error);
        return { status: 'error', message: error.message, data: null };
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
        
        return { status: 'success', data: requests };
    } catch (error) {
        console.error('[ProductExportService] getExportRequests error:', error);
        return { status: 'error', message: error.message, data: null };
    }
};
