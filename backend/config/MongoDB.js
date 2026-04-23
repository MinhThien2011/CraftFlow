import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { models_list } from "../models/models_list.js";
import { ROLES } from "../utils/constants.js";
import Role from "../models/Roles.js";
import User from "../models/User.js";
import Material from "../models/Material.js";
import Product from "../models/Product.js";
import Shelf from "../models/Shelf.js";
import Bom from "../models/BOM.js";
import ProductionOrder from "../models/ProductionOrder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_ATLAS_URI = process.env.MONGO_URI_ATLAS;
const MONGO_RAILWAY_URI = process.env.MONGO_URI_RAILWAY;
const MONGO_LOCAL_URI = process.env.MONGO_URI_LOCAL;

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000;

// Flag để track connection đang được thiết lập
let isConnecting = false;
let connectionPromise = null;

const checkMongoConnection = () => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const state = mongoose.connection.readyState;
    return {
        isConnected: state === 1,
        isConnecting: state === 2,
        isDisconnecting: state === 3,
        isDisconnected: state === 0
    };
};

export const initializeCollections = async (models) => {
    console.log("🔁 Initializing Mongoose collections...");
    let initializedCount = 0;

    for (const [modelName, model] of Object.entries(models)) {
        try {
            if (model?.prototype instanceof mongoose.Model) {
                await model.init();
                console.log(`✅ Initialized: ${modelName}`);
                initializedCount++;
            } else {
                console.warn(`⚠️ Skipped: ${modelName} is not a valid Mongoose Model`);
            }
        } catch (err) {
            console.log(`❌ Failed to initialize ${modelName}:`, err);
        }
    }

    console.log(
        `🎉 Initialized ${initializedCount} collections of ${mongoose.connection.db.databaseName}.`
    );
};

// Hàm seed roles nếu bảng Role trống
const seedRolesIfEmpty = async () => {
    try {
        const count = await Role.countDocuments();
        if (count === 0) {
            console.log("🛠 Bảng Role trống, đang seed roles mặc định...");
            const roleDocs = Object.values(ROLES).map(roleName => ({ roleName }));
            await Role.insertMany(roleDocs);
            console.log(`✅ Đã seed ${roleDocs.length} roles thành công!`);
        } else {
            console.log(`ℹ️ Bảng Role đã có ${count} bản ghi, bỏ qua seed roles.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed roles:", error);
        throw error;
    }
};

// Hàm seed users nếu bảng User trống
const seedUsersIfEmpty = async () => {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            console.log("👥 Bảng User trống, đang seed users mặc định...");

            // Đọc file seed
            const seedPath = path.join(__dirname, '..', 'seeds', 'userSeed.json');
            if (!fs.existsSync(seedPath)) {
                console.warn(`⚠️ File seed không tồn tại tại: ${seedPath}`);
                return;
            }

            const rawData = fs.readFileSync(seedPath, 'utf8');
            const usersData = JSON.parse(rawData);
            const roles = await Role.find({});
            const roleMap = roles.reduce((acc, role) => {
                acc[role.roleName] = role._id;
                return acc;
            }, {});

            const usersToSeed = usersData.map(userData => {
                let roleName = userData.role;
                if (roleName === 'user') roleName = ROLES.STAFF;

                return {
                    ...userData,
                    role: roleMap[roleName] || roleMap[ROLES.STAFF]
                };
            });

            await User.create(usersToSeed);
            console.log(`✅ Đã seed ${usersToSeed.length} users thành công!`);
        } else {
            console.log(`ℹ️ Bảng User đã có ${count} bản ghi, bỏ qua seed users.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed users:", error);
        throw error;
    }
};

// Hàm seed shelves nếu bảng Shelf trống
const seedShelvesIfEmpty = async () => {
    try {
        const count = await Shelf.countDocuments();
        if (count === 0) {
            console.log("🏪 Bảng Shelf trống, đang seed kệ kho mặc định...");
            const seedPath = path.join(__dirname, '..', 'seeds', 'shelfSeed.json');
            if (!fs.existsSync(seedPath)) {
                console.warn(`⚠️ File seed không tồn tại tại: ${seedPath}`);
                return;
            }
            const rawData = fs.readFileSync(seedPath, 'utf8');
            const shelvesData = JSON.parse(rawData);
            await Shelf.insertMany(shelvesData);
            console.log(`✅ Đã seed ${shelvesData.length} kệ kho thành công!`);
        } else {
            console.log(`ℹ️ Bảng Shelf đã có ${count} bản ghi, bỏ qua seed shelves.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed shelves:", error);
        throw error;
    }
};

// Hàm seed materials nếu bảng Material trống
const seedMaterialsIfEmpty = async () => {
    try {
        const count = await Material.countDocuments();
        if (count === 0) {
            console.log("📦 Bảng Material trống, đang seed nguyên vật liệu mặc định...");

            const seedPath = path.join(__dirname, '..', 'seeds', 'materialSeed.json');
            if (!fs.existsSync(seedPath)) {
                console.warn(`⚠️ File seed không tồn tại tại: ${seedPath}`);
                return;
            }

            const rawData = fs.readFileSync(seedPath, 'utf8');
            const materialsData = JSON.parse(rawData);
            const shelves = await Shelf.find({});
            const shelfMap = shelves.reduce((acc, shelf) => {
                acc[shelf.shelfCode] = shelf._id;
                return acc;
            }, {});

            const materialsToSeed = materialsData.map(material => ({
                ...material,
                shelf: shelfMap[material.location] || null
            }));

            await Material.insertMany(materialsToSeed);
            console.log(`✅ Đã seed ${materialsToSeed.length} nguyên vật liệu thành công!`);
        } else {
            console.log(`ℹ️ Bảng Material đã có ${count} bản ghi, bỏ qua seed materials.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed materials:", error);
        throw error;
    }
};

// Hàm seed products nếu bảng Product trống
const seedProductsIfEmpty = async () => {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            console.log("🎁 Bảng Product trống, đang seed sản phẩm handmade mặc định...");

            const seedPath = path.join(__dirname, '..', 'seeds', 'productSeed.json');
            if (!fs.existsSync(seedPath)) {
                console.warn(`⚠️ File seed không tồn tại tại: ${seedPath}`);
                return;
            }

            const rawData = fs.readFileSync(seedPath, 'utf8');
            const productsData = JSON.parse(rawData);
            const materials = await Material.find({ isActive: true }).lean();
            const materialMap = materials.reduce((acc, m) => {
                acc[m.code] = m;
                return acc;
            }, {});

            // Mapping shelves
            const shelves = await Shelf.find({});
            const shelfMap = shelves.reduce((acc, shelf) => {
                acc[shelf.shelfCode] = shelf._id;
                return acc;
            }, {});

            const productsToSeed = productsData.map(product => {
                const updatedEstimate = product.estimateMaterialCost.map(item => {
                    const material = materialMap[item.materialCode];
                    if (!material) {
                        console.warn(`⚠️ Material code ${item.materialCode} not found for product ${product.name}`);
                        return null;
                    }
                    return {
                        material: material._id,
                        materialCode: material.code,
                        materialName: material.name,
                        quantity: item.quantity,
                        unit: material.unit,
                        priceAtTime: material.price
                    };
                }).filter(item => item !== null);

                // Calculate baseCost automatically from estimated materials
                const baseCost = updatedEstimate.reduce((sum, item) => sum + (item.quantity * item.priceAtTime), 0);

                return {
                    ...product,
                    estimateMaterialCost: updatedEstimate,
                    baseCost,
                    shelf: shelfMap[product.location] || null
                };
            });

            await Product.insertMany(productsToSeed);
            console.log(`✅ Đã seed ${productsToSeed.length} sản phẩm thành công!`);
        } else {
            console.log(`ℹ️ Bảng Product đã có ${count} bản ghi, bỏ qua seed products.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed products:", error);
        throw error;
    }
};

// Hàm seed BOMs nếu bảng Bom trống
const seedBomsIfEmpty = async () => {
    try {
        const count = await Bom.countDocuments();
        if (count === 0) {
            console.log("📜 Bảng BOM trống, đang seed định mức nguyên vật liệu...");
            const seedPath = path.join(__dirname, '..', 'seeds', 'bomSeed.json');
            if (!fs.existsSync(seedPath)) {
                console.warn(`⚠️ File seed không tồn tại tại: ${seedPath}`);
                return;
            }
            const rawData = fs.readFileSync(seedPath, 'utf8');
            const bomsData = JSON.parse(rawData);

            const products = await Product.find({}).lean();
            const productMap = products.reduce((acc, p) => { acc[p.code] = p._id; return acc; }, {});

            const materials = await Material.find({}).lean();
            const materialMap = materials.reduce((acc, m) => { acc[m.code] = m._id; return acc; }, {});

            const bomsToSeed = bomsData.map(bom => ({
                product: productMap[bom.productCode],
                items: bom.items.map(item => ({
                    material: materialMap[item.materialCode],
                    qtyPerUnit: item.qtyPerUnit,
                    unit: item.unit,
                    note: item.note
                })).filter(item => item.material),
                version: bom.version,
                isActive: bom.isActive
            })).filter(bom => bom.product);

            await Bom.insertMany(bomsToSeed);
            console.log(`✅ Đã seed ${bomsToSeed.length} BOM thành công!`);
        } else {
            console.log(`ℹ️ Bảng BOM đã có ${count} bản ghi, bỏ qua seed BOMs.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed BOMs:", error);
        throw error;
    }
};

// Hàm seed ProductionOrders nếu bảng ProductionOrder trống
const seedProductionOrdersIfEmpty = async () => {
    try {
        const count = await ProductionOrder.countDocuments();
        if (count === 0) {
            console.log("📝 Bảng ProductionOrder trống, đang seed lệnh sản xuất...");
            const seedPath = path.join(__dirname, '..', 'seeds', 'productionOrderSeed.json');
            if (!fs.existsSync(seedPath)) {
                console.warn(`⚠️ File seed không tồn tại tại: ${seedPath}`);
                return;
            }
            const rawData = fs.readFileSync(seedPath, 'utf8');
            const ordersData = JSON.parse(rawData);

            const products = await Product.find({}).lean();
            const productMap = products.reduce((acc, p) => { acc[p.code] = p._id; return acc; }, {});

            const users = await User.find({}).lean();
            const userMap = users.reduce((acc, u) => { acc[u.username] = u._id; return acc; }, {});

            const ordersToSeed = ordersData.map(order => ({
                ...order,
                productId: productMap[order.productCode],
                createdBy: userMap[order.createdByUsername]
            })).filter(order => order.productId && order.createdBy);

            await ProductionOrder.insertMany(ordersToSeed);
            console.log(`✅ Đã seed ${ordersToSeed.length} lệnh sản xuất thành công!`);
        } else {
            console.log(`ℹ️ Bảng ProductionOrder đã có ${count} bản ghi, bỏ qua seed production orders.`);
        }
    } catch (error) {
        console.log("❌ Lỗi khi seed production orders:", error);
        throw error;
    }
};

const closeExistingConnection = async () => {
    const { isConnected, isConnecting } = checkMongoConnection();

    if (isConnected || isConnecting) {
        console.log("🔌 Đóng connection hiện tại...");
        try {
            await mongoose.connection.close(false); // false = không force close
            console.log("✅ Đã đóng connection cũ");
        } catch (error) {
            console.log("❌ Lỗi khi đóng connection:", error);
            // Force close nếu close bình thường thất bại
            await mongoose.connection.close(true);
        }
    }
};

const tryConnectToMongo = async (uri, label) => {
    try {
        console.log(`📡 Đang thử kết nối ${label}...`);

        // Đảm bảo không có connection cũ
        await closeExistingConnection();

        const connectionOptions = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            dbName: process.env.DB_NAME,
            maxPoolSize: 10, // Giới hạn số connection trong pool
            minPoolSize: 2,  // Số connection tối thiểu
            maxIdleTimeMS: 30000, // Đóng connection idle sau 30s
        };

        if (label === "MongoDB Atlas") {
            connectionOptions.serverApi = {
                version: '1',
                strict: true,
                deprecationErrors: true,
            };
        }

        await mongoose.connect(uri, connectionOptions);
        await mongoose.connection.db.admin().command({ ping: 1 });

        console.log(`✅ Kết nối ${label} thành công! Đã ping database thành công.`);
        console.log(`Database Name: ${mongoose.connection.db.databaseName}`);
        return true;
    } catch (error) {
        console.log(`❌ Kết nối ${label} thất bại:`, error.message);

        await closeExistingConnection();

        return false;
    }
};

const connectWithFallback = async () => {
    // Thử MongoDB Atlas trước (ưu tiên cao nhất)
    if (MONGO_ATLAS_URI) {
        const atlasConnected = await tryConnectToMongo(MONGO_ATLAS_URI, "MongoDB Atlas");
        if (atlasConnected) return true;
    } else {
        console.log("⚠️ MongoDB Atlas URI không được cấu hình (MONGO_URI_ATLAS)");
    }

    // Fallback sang Railway
    if (MONGO_RAILWAY_URI) {
        const railwayConnected = await tryConnectToMongo(MONGO_RAILWAY_URI, "Railway MongoDB");
        if (railwayConnected) return true;
    } else {
        console.log("⚠️ Railway MongoDB URI không được cấu hình (MONGO_URI_RAILWAY)");
    }

    // Fallback cuối cùng sang Local
    if (MONGO_LOCAL_URI) {
        console.log("⚠️ Đang fallback sang MongoDB Local...");
        const localConnected = await tryConnectToMongo(MONGO_LOCAL_URI, "MongoDB Local");
        if (localConnected) return true;
    } else {
        console.log("⚠️ MongoDB Local URI không được cấu hình (MONGO_URI_LOCAL)");
        return false;
    }
};

const reconnectWithRetry = async (retryCount = 0) => {
    // Nếu đang connecting, đợi thay vì tạo connection mới
    if (isConnecting && connectionPromise) {
        console.log("⏳ Connection đang được thiết lập, đang đợi...");
        return connectionPromise;
    }

    try {
        isConnecting = true;
        const connected = await connectWithFallback();

        if (connected) {
            isConnecting = false;
            return true;
        }

        throw new Error("Tất cả các MongoDB URIs đều thất bại");
    } catch (error) {
        console.log(
            `❌ Lỗi kết nối MongoDB (Lần thử ${retryCount + 1}/${MAX_RETRIES}):`,
            error.message
        );

        if (retryCount < MAX_RETRIES) {
            console.log(
                `⏳ Đang thử kết nối lại sau ${RETRY_INTERVAL / 1000} giây...`
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
            return reconnectWithRetry(retryCount + 1);
        } else {
            console.log("❌ Đã vượt quá số lần thử kết nối tối đa!");
            isConnecting = false;
            return false;
        }
    }
};

export const connectToDatabase = async () => {
    // Nếu đang có connection hoạt động, return luôn
    const { isConnected, isConnecting: currentlyConnecting } = checkMongoConnection();
    if (isConnected) {
        console.log("✅ MongoDB đã được kết nối sẵn");
        return;
    }

    // Nếu đang connecting, đợi connection hiện tại hoàn thành
    if (currentlyConnecting || isConnecting) {
        console.log("⏳ Đang có connection đang được thiết lập, đợi hoàn thành...");
        if (connectionPromise) {
            await connectionPromise;
            return;
        }
    }

    try {
        console.log("🔄 Đang kiểm tra kết nối MongoDB...");
        console.log("📋 Fallback chain: Atlas → Railway → Local");

        // Tạo promise mới cho connection
        connectionPromise = reconnectWithRetry();
        const connectionSuccess = await connectionPromise;

        if (!connectionSuccess) {
            throw new Error("Không thể kết nối đến MongoDB sau nhiều lần thử");
        }

        await initializeCollections(models_list);

        // Seed data mặc định
        await seedRolesIfEmpty();
        await seedUsersIfEmpty();
        await seedShelvesIfEmpty();
        await seedMaterialsIfEmpty();
        await seedProductsIfEmpty();
        await seedBomsIfEmpty();
        await seedProductionOrdersIfEmpty();

        // Setup event handlers (chỉ setup 1 lần)
        setupConnectionHandlers();

        connectionPromise = null;
    } catch (err) {
        console.log("❌ Lỗi trong quá trình kết nối database:", err);
        connectionPromise = null;
        isConnecting = false;
        throw err;
    }
};

// Tách riêng event handlers để tránh đăng ký nhiều lần
let handlersSetup = false;

const setupConnectionHandlers = () => {
    if (handlersSetup) return;

    mongoose.connection.on("disconnected", async () => {
        console.log("⚠️ MongoDB đã ngắt kết nối! Đang thử kết nối lại...");
        isConnecting = false;
        connectionPromise = null;
        await reconnectWithRetry();
    });

    mongoose.connection.on("error", (error) => {
        console.log("❌ Lỗi kết nối MongoDB:", error);
    });

    handlersSetup = true;
};

// process.on("SIGINT", async () => {
//     try {
//         isConnecting = false;
//         connectionPromise = null;
//         await mongoose.connection.close();
//         console.log("📴 Đã đóng kết nối MongoDB an toàn");
//         process.exit(0);
//     } catch (err) {
//         console.log("❌ Lỗi khi đóng kết nối MongoDB:", err);
//         process.exit(1);
//     }
// });