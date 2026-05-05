import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { models_list } from "../models/models_list.js";

// --- CẤU HÌNH ĐƯỜNG DẪN TUYỆT ĐỐI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, "output");

// Lấy tên DB từ env để đặt tên file
const DB_NAME = process.env.DB_NAME || "test";
const mongoURI = process.env.MONGO_URI_ATLAS || `mongodb://localhost:27017/${DB_NAME}`;

async function run() {
    try {
        console.log("🚀 Đang kết nối MongoDB...");
        await mongoose.connect(mongoURI);

        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const erdLines = ["erDiagram"];
        const dbmlTables = [];
        const dbmlRefs = [];
        const processedRelations = new Set();

        // --- ĐỐI SOÁT MODEL ---
        const scannedTableNames = new Set(
            Object.values(models_list).map(m => m.modelName.toUpperCase())
        );
        const missingTables = new Set(); // Chứa các bảng được ref nhưng không có model

        // Helper: Lấy tên Model an toàn
        const getModelName = (ref) => {
            if (typeof ref === "string") return ref.toUpperCase();
            if (typeof ref === "function" && ref.modelName) return ref.modelName.toUpperCase();
            return null;
        };

        // Helper: Trích xuất quan hệ (Ref) từ Schema
        function extractRelations(schemaObj, modelName, prefix = "") {
            for (const [key, val] of Object.entries(schemaObj)) {
                if (!val) continue;
                const fieldPath = prefix + key;
                const cleanFieldPath = fieldPath.replace(/\./g, "_");
                let targetModel = null;

                if (Array.isArray(val) && val[0]?.ref) {
                    targetModel = getModelName(val[0].ref);
                } else if (val.ref) {
                    targetModel = getModelName(val.ref);
                } else if (val.type && val.type.ref) {
                    targetModel = getModelName(val.type.ref);
                } else if (typeof val === "object" && !val.type && !Array.isArray(val)) {
                    extractRelations(val, modelName, fieldPath + ".");
                    continue;
                }

                if (targetModel) {
                    if (scannedTableNames.has(targetModel)) {
                        const relKey = `${modelName}-${targetModel}-${cleanFieldPath}`;
                        if (!processedRelations.has(relKey)) {
                            erdLines.push(`${modelName} ||--o{ ${targetModel} : "${cleanFieldPath}"`);
                            dbmlRefs.push(`Ref: ${modelName}.${cleanFieldPath} > ${targetModel}._id`);
                            processedRelations.add(relKey);
                        }
                    } else {
                        missingTables.add(targetModel);
                    }
                }
            }
        }

        // --- XỬ LÝ DỮ LIỆU MODELS ---
        for (const [name, model] of Object.entries(models_list)) {
            const upperName = model.modelName.toUpperCase();
            const schemaPaths = model.schema.paths;
            const mermaidFields = [];
            const dbmlFields = [];

            for (const [pathName, pathType] of Object.entries(schemaPaths)) {
                if (pathName === "__v") continue;
                const cleanName = pathName.replace(/\./g, "_");
                let type = pathType.instance ? pathType.instance.toLowerCase() : "mixed";

                let dbmlType = "varchar";
                if (type === "objectid") dbmlType = "uuid";
                else if (type === "number") dbmlType = "number";
                else if (type === "boolean") dbmlType = "boolean";
                else if (type === "date") dbmlType = "datetime";
                else if (["array", "map", "buffer", "mixed"].includes(type)) dbmlType = "json";

                const pk = pathName === "_id" ? " [pk]" : "";
                mermaidFields.push(`    ${type} ${cleanName}`);
                dbmlFields.push(`  ${cleanName} ${dbmlType}${pk}`);
            }

            erdLines.push(`${upperName} {\n${mermaidFields.join("\n")}\n}`);
            dbmlTables.push(`Table ${upperName} {\n${dbmlFields.join("\n")}\n}`);
            extractRelations(model.schema.obj, upperName);
        }

        // --- XUẤT FILE ---
        const mermaidPath = path.join(OUTPUT_DIR, `${DB_NAME}.mmd`);
        const dbmlPath = path.join(OUTPUT_DIR, `${DB_NAME}.dbml`);

        fs.writeFileSync(mermaidPath, erdLines.join("\n"));
        const finalDbml = [
            `// Generated DBML for dbdiagram.io - Database: ${DB_NAME}`,
            ...dbmlTables,
            "",
            "// Relationships",
            ...dbmlRefs
        ].join("\n");
        fs.writeFileSync(dbmlPath, finalDbml);

        // --- BÁO CÁO KẾT QUẢ ---
        console.log(`\n✅ THÀNH CÔNG!`);
        console.log(`📍 Mermaid: ${mermaidPath}`);
        console.log(`📍 DBML:    ${dbmlPath}`);

        if (missingTables.size > 0) {
            console.log(`\n⚠️  CẢNH BÁO: Phát hiện tham chiếu tới các Model chưa được quét:`);
            console.warn(`👉 [ ${Array.from(missingTables).join(", ")} ]`);
            console.log(`💡 Cách sửa: Hãy import và thêm các Model này vào file 'models_list.js' để sơ đồ đầy đủ hơn.`);
        } else {
            console.log(`\n✨ Tuyệt vời: Tất cả các mối quan hệ đều khớp với danh sách Model!`);
        }

        console.log(`\n🚀 Copy nội dung file .dbml dán vào https://dbdiagram.io/ để xem kết quả.`);

    } catch (err) {
        console.error("❌ Lỗi thực thi:", err);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Đã ngắt kết nối database.");
    }
}

run();