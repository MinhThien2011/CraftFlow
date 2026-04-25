import InventoryImportExportSlip from "../models/InventoryImportExportSlip.js";
import { INVENTORY_IMPORT_EXPORT_SLIP_TYPE } from "./constants.js";

// Helper to generate slip number
export const generateSlipNumber = async (type) => {
    const prefix = type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT ? 'PNK' : 'PXK';
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastSlip = await InventoryImportExportSlip.findOne({
        slipNumber: new RegExp(`^${prefix}-${dateStr}`),
    }).sort({ slipNumber: -1 });

    let sequence = '0001';
    if (lastSlip) {
        const lastSeqMatch = lastSlip.slipNumber.match(/(\d{4})$/);
        if (lastSeqMatch) {
            const lastSeq = parseInt(lastSeqMatch[1]);
            sequence = (lastSeq + 1).toString().padStart(4, '0');
        }
    }

    return `${prefix}-${dateStr}-${sequence}`;
};