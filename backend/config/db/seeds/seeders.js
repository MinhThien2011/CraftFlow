import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROLES } from "../../../utils/constants.js";
import Role from "../../../models/Roles.js";
import User from "../../../models/User.js";
import Material from "../../../models/Material.js";
import Product from "../../../models/Product.js";
import Shelf from "../../../models/Shelf.js";
import Bom from "../../../models/BOM.js";
import ProductionOrder from "../../../models/ProductionOrder.js";
import InventoryBatch from "../../../models/InventoryBatch.js";
import ProductExportRequest from "../../../models/ProductExportRequest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.join(__dirname, "..", "..", "..", "seeds");

const readSeedFile = (filename) => {
    const filepath = path.join(SEEDS_DIR, filename);
    if (!fs.existsSync(filepath)) throw new Error(`Seed file not found: ${filepath}`);
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
};

const buildMap = (docs, keyFn, valFn = (d) => d._id) =>
    docs.reduce((acc, d) => { acc[keyFn(d)] = valFn(d); return acc; }, {});

export const seedRoles = async () => {
    if (await Role.countDocuments()) return;

    const docs = Object.values(ROLES).map((roleName) => ({ roleName }));
    await Role.insertMany(docs);
    console.log(`✅ Seeded ${docs.length} roles`);
};

export const seedUsers = async () => {
    if (await User.countDocuments()) return;

    const data = readSeedFile("userSeed.json");
    const roles = await Role.find({}).lean();
    const roleMap = buildMap(roles, (r) => r.roleName);

    const docs = data.map((u) => {
        const roleName = u.role === "user" ? ROLES.STAFF : u.role;
        return { ...u, role: roleMap[roleName] ?? roleMap[ROLES.STAFF] };
    });

    await User.create(docs);
    console.log(`✅ Seeded ${docs.length} users`);
};

export const seedShelves = async () => {
    if (await Shelf.countDocuments()) return;

    const data = readSeedFile("shelfSeed.json");
    await Shelf.insertMany(data);
    console.log(`✅ Seeded ${data.length} shelves`);
};

export const seedMaterials = async () => {
    if (await Material.countDocuments()) return;

    const data = readSeedFile("materialSeed.json");
    const shelves = await Shelf.find({}).lean();
    const shelfMap = buildMap(shelves, (s) => s.shelfCode.toUpperCase());

    const docs = data.map((m) => {
        const shelfId = shelfMap[m.location.toUpperCase()];
        if (!shelfId) throw new Error(`Shelf "${m.location}" not found for material "${m.code}"`);
        return { ...m, shelf: shelfId };
    });

    const createdMaterials = await Material.insertMany(docs);
    console.log(`✅ Seeded ${createdMaterials.length} materials`);

    // Create initial batches for materials with stock
    const batchDocs = createdMaterials
        .filter(m => m.currentStock > 0)
        .map(m => ({
            batchNumber: `BATCH-${m.code}-INIT`,
            material: m._id,
            quantityReceived: m.currentStock,
            quantityRemaining: m.currentStock,
            unit: m.unit,
            unitCost: m.price,
            receivedDate: new Date(),
            shelf: m.shelf,
            isExhausted: false
        }));

    if (batchDocs.length > 0) {
        await InventoryBatch.insertMany(batchDocs);
        console.log(`✅ Seeded ${batchDocs.length} initial material batches`);
    }
};

export const seedProducts = async () => {
    if (await Product.countDocuments()) return;

    const data = readSeedFile("productSeed.json");
    const materials = await Material.find({ isActive: true }).lean();
    const matMap = buildMap(materials, (m) => m.code, (m) => m);
    const shelves = await Shelf.find({}).lean();
    const shelfMap = buildMap(shelves, (s) => s.shelfCode.toUpperCase());

    const docs = data.map((product) => {
        const estimateMaterialCost = product.estimateMaterialCost
            .map((item) => {
                const mat = matMap[item.materialCode];
                if (!mat) {
                    console.warn(`⚠️  Material "${item.materialCode}" not found for product "${product.name}"`);
                    return null;
                }
                return {
                    material: mat._id,
                    materialCode: mat.code,
                    materialName: mat.name,
                    quantity: item.quantity,
                    unit: mat.unit,
                    priceAtTime: mat.price,
                };
            })
            .filter(Boolean);

        const baseCost = estimateMaterialCost.reduce(
            (sum, i) => sum + i.quantity * i.priceAtTime, 0
        );

        const shelfId = shelfMap[product.location.toUpperCase()];
        if (!shelfId) throw new Error(`Shelf "${product.location}" not found for product "${product.code}"`);

        return { ...product, estimateMaterialCost, baseCost, shelf: shelfId };
    });

    const createdProducts = await Product.insertMany(docs);
    console.log(`✅ Seeded ${createdProducts.length} products`);

    // Create initial batches for products with stock
    const batchDocs = createdProducts
        .filter(p => p.currentStock > 0)
        .map(p => ({
            batchNumber: `BATCH-${p.code}-INIT`,
            product: p._id,
            quantityReceived: p.currentStock,
            quantityRemaining: p.currentStock,
            unit: p.unit,
            unitCost: p.baseCost || 0,
            receivedDate: new Date(),
            shelf: p.shelf,
            isExhausted: false
        }));

    if (batchDocs.length > 0) {
        await InventoryBatch.insertMany(batchDocs);
        console.log(`✅ Seeded ${batchDocs.length} initial product batches`);
    }
};

export const seedProductionOrders = async () => {
    if (await ProductionOrder.countDocuments()) return;

    const data = readSeedFile("productionOrderSeed.json");
    const products = await Product.find({}).lean();
    const productMap = buildMap(products, (p) => p.code, (p) => p);
    const users = await User.find({}).lean();
    const userMap = buildMap(users, (u) => u.username);

    const docs = data
        .map((order) => {
            const product = productMap[order.productCode];
            if (!product || !userMap[order.createdByUsername]) return null;

            return {
                ...order,
                products: [{
                    product: product._id,
                    quantity: order.quantity,
                    productName: product.name,
                    productCode: product.code,
                }],
                createdBy: userMap[order.createdByUsername],
            };
        })
        .filter(Boolean);

    await ProductionOrder.insertMany(docs);
    console.log(`✅ Seeded ${docs.length} production orders`);
};

export const seedBoms = async () => {
    if (await Bom.countDocuments()) return;

    const orders = await ProductionOrder.find({}).populate("products.product").lean();

    const docs = orders
        .map((order) => {
            const requirements = new Map();

            for (const { product, quantity } of order.products) {
                if (!product?.estimateMaterialCost) continue;
                for (const { material, quantity: qtyPer } of product.estimateMaterialCost) {
                    const id = material.toString();
                    requirements.set(id, (requirements.get(id) ?? 0) + qtyPer * quantity);
                }
            }

            if (!requirements.size) return null;

            return {
                productionOrder: order._id,
                version: "v1.0-seed",
                isActive: true,
                items: [...requirements.entries()].map(([material, qtyPerUnit]) => ({
                    material,
                    qtyPerUnit,
                    unit: "unit",
                    note: `Seed for order ${order.orderCode}`,
                })),
            };
        })
        .filter(Boolean);

    if (!docs.length) return;

    await Bom.insertMany(docs);
    console.log(`✅ Seeded ${docs.length} BOMs`);
};

export const seedProductExportRequests = async () => {
    if (await ProductExportRequest.countDocuments()) return;

    const data = readSeedFile("productExportRequestSeed.json");
    const products = await Product.find({}).lean();
    const productMap = buildMap(products, (p) => p.code, (p) => p);
    const users = await User.find({}).lean();
    const userMap = buildMap(users, (u) => u.username);

    const docs = data
        .map((request) => {
            if (!userMap[request.createdByUsername]) {
                console.warn(`⚠️  Creator "${request.createdByUsername}" not found for request "${request.requestCode}"`);
                return null;
            }

            const items = request.items.map(item => {
                const product = productMap[item.productCode];
                if (!product) {
                    console.warn(`⚠️  Product "${item.productCode}" not found for request "${request.requestCode}"`);
                    return null;
                }
                return {
                    product: product._id,
                    requestedQuantity: item.requestedQuantity,
                    actualQuantity: item.actualQuantity || 0
                };
            }).filter(Boolean);

            if (items.length === 0) return null;

            return {
                ...request,
                createdBy: userMap[request.createdByUsername],
                adminApprovedBy: request.adminApprovedByUsername ? userMap[request.adminApprovedByUsername] : undefined,
                khoManager: request.khoManagerUsername ? userMap[request.khoManagerUsername] : undefined,
                items
            };
        })
        .filter(Boolean);

    await ProductExportRequest.insertMany(docs);
    console.log(`✅ Seeded ${docs.length} product export requests`);
};