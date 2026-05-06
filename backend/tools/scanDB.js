import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { models_list } from "../models/models_list.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ArchitectScanner {
    constructor(models, dbName) {
        this.models = Array.isArray(models)
            ? models.reduce((acc, m) => ({ ...acc, [m.modelName]: m }), {})
            : models;

        this.dbName = dbName;
        this.registry = new Map();
        this.tableNames = new Set(Object.values(this.models).map(m => m.modelName.toUpperCase()));
        this.stats = { totalFields: 0, totalRefs: 0 };
    }

    analyze() {
        const incomingRefs = new Map();
        for (const model of Object.values(this.models)) {
            const tableName = model.modelName.toUpperCase();
            const relations = [];
            const fields = [];

            this._findRefs(model.schema.obj, tableName, relations);

            relations.forEach(rel => {
                incomingRefs.set(rel.to, (incomingRefs.get(rel.to) || 0) + 1);
            });

            for (const [pathName, pathType] of Object.entries(model.schema.paths)) {
                if (pathName === "__v") continue;
                const cleanName = pathName.replace(/\./g, "_");
                fields.push({
                    name: cleanName,
                    type: (pathType.instance || "mixed").toLowerCase(),
                    isPK: pathName === "_id",
                    isFK: relations.some(r => r.field === cleanName)
                });
            }

            this.registry.set(tableName, { fields, relations, weight: 0 });
            this.stats.totalFields += fields.length;
        }

        for (const [name, data] of this.registry) {
            data.weight = (incomingRefs.get(name) || 0) * 2 + data.relations.length;
            this.stats.totalRefs += data.relations.length;
        }
    }

    _findRefs(obj, sourceTable, results, prefix = "") {
        for (const [key, val] of Object.entries(obj)) {
            if (!val) continue;
            const currentPath = prefix + key;
            let target = null;

            if (Array.isArray(val) && val[0]?.ref) target = val[0].ref;
            else if (val.ref) target = val.ref;
            else if (val.type?.ref) target = val.type.ref;
            else if (typeof val === "object" && !val.type && !Array.isArray(val)) {
                this._findRefs(val, sourceTable, results, currentPath + ".");
                continue;
            }

            if (target) {
                const targetUpper = target.toUpperCase();
                if (this.tableNames.has(targetUpper)) {
                    results.push({ from: sourceTable, to: targetUpper, field: currentPath.replace(/\./g, "_") });
                }
            }
        }
    }

    renderDBML() {
        let dbml = `// PROJECT: ${this.dbName}\n// Generated: ${new Date().toLocaleString()}\n\n`;
        const sortedTables = [...this.registry.entries()].sort((a, b) => b[1].weight - a[1].weight);

        for (const [tableName, data] of sortedTables) {
            const sortedFields = data.fields.sort((a, b) => {
                if (a.isPK) return -1;
                if (a.isFK) return -1;
                return a.name.localeCompare(b.name);
            });

            dbml += `Table ${tableName} {\n`;
            sortedFields.forEach(f => {
                const type = f.type === "objectid" ? "uuid" : (f.type === "mixed" ? "json" : f.type);
                dbml += `  ${f.name} ${type}${f.isPK ? " [pk]" : ""}${f.isFK ? " [note: '🔗 Link']" : ""}\n`;
            });
            dbml += `  Note: 'Weight: ${data.weight}'\n}\n\n`;
        }

        const allRefs = [...new Set(
            [...this.registry.values()].flatMap(d => d.relations.map(r => `Ref: ${r.from}.${r.field} > ${r.to}._id`))
        )];

        return dbml + `// RELATIONSHIPS\n${allRefs.join("\n")}\n`;
    }

    renderMermaid() {
        let mmd = "erDiagram\n";
        for (const [tableName, data] of this.registry) {
            mmd += `  ${tableName} {\n`;
            data.fields.forEach(f => mmd += `    ${f.type} ${f.name}\n`);
            mmd += `  }\n`;
            data.relations.forEach(r => mmd += `  ${r.from} ||--o{ ${r.to} : "${r.field}"\n`);
        }
        return mmd;
    }

    // printFancyDashboard(generatedFiles) {
    //     console.log("\n┌────────────────────────────────────────────────────────────┐");
    //     console.log(`│   🚀 ARCHITECT SCHEMA SCANNER - EXPORT COMPLETE            │`);
    //     console.log("├────────────────────────────────────────────────────────────┤");
    //     console.log(`│  📂 Database : ${this.dbName.padEnd(43)} │`);
    //     console.log(`│  📊 Models   : ${String(this.registry.size).padEnd(43)} │`);
    //     console.log(`│  🔑 Fields   : ${String(this.stats.totalFields).padEnd(43)} │`);
    //     console.log(`│  🔗 Links    : ${String(this.stats.totalRefs).padEnd(43)} │`);
    //     console.log("├────────────────────────────────────────────────────────────┤");
    //     console.log(`│  📁 Output đã tạo (ghi đè): ${String(generatedFiles.length + ' files').padEnd(30)} │`);

    //     generatedFiles.forEach(file => {
    //         const label = file.name.endsWith('.dbml') ? "📜 DBML File" : "🧜 Mermaid ";
    //         console.log(`│  > ${label}: ${file.path} │`);
    //     });

    //     console.log("└────────────────────────────────────────────────────────────┘\n");
    // }
    printFancyDashboard(generatedFiles) {
        const line = "────────────────────────────────────────────────────────────";
        console.log(`\n┌${line}┐`);
        console.log(`│   🚀 ARCHITECT SCHEMA SCANNER - EXPORT COMPLETE            │`);
        console.log(`├${line}┤`);
        console.log(`│  📂 Database : ${this.dbName.padEnd(43)} │`);
        console.log(`│  📊 Models   : ${String(this.registry.size).padEnd(43)} │`);
        console.log(`│  🔑 Fields   : ${String(this.stats.totalFields).padEnd(43)} │`);
        console.log(`│  🔗 Links    : ${String(this.stats.totalRefs).padEnd(43)} │`);
        console.log(`├${line}┤`);
        console.log(`│  📁 Output đã tạo (ghi đè): ${String(generatedFiles.length + ' files').padEnd(30)} │`);

        generatedFiles.forEach(file => {
            const label = file.name.endsWith('.dbml') ? "📜 DBML File" : "🧜 Mermaid  ";
            console.log(`│                                                            │`);
            console.log(`│  ${label}: ${file.name.padEnd(43)} │`);
            console.log(`│  🔗 Path: ${file.path.padEnd(48)} │`);
        });

        console.log(`└${line}┘\n`);
    }
}

async function runScanner({
    models,
    connectionString,
    dbName,
    outputDir = path.join(__dirname, "output"),
    logType = "simple"
}) {
    if (!models) throw new Error("Missing models!");
    if (!connectionString) throw new Error("Missing connectionString!");
    if (!dbName) throw new Error("Missing dbName!");
    if (!outputDir) console.log("outputDir is not set, default to './output'");
    if (!logType) console.log("logType is not set, default to 'simple'");
    if (logType && logType !== "fancy" && logType !== "simple") throw new Error("Invalid logType!");

    try {
        await mongoose.connect(connectionString, { dbName });

        const architect = new ArchitectScanner(models, dbName);
        architect.analyze();

        await fs.mkdir(outputDir, { recursive: true });

        const fileData = [
            { name: `${dbName}.dbml`, content: architect.renderDBML() },
            { name: `${dbName}.mmd`, content: architect.renderMermaid() }
        ];

        const generatedFiles = [];

        for (const file of fileData) {
            const fullPath = path.join(outputDir, file.name);
            await fs.writeFile(fullPath, file.content);
            generatedFiles.push({ name: file.name, path: fullPath });

            if (logType === "simple") {
                console.log(`✅ Generated: ${file.name} -> ${fullPath}`);
            }
        }

        if (logType === "fancy") {
            architect.printFancyDashboard(generatedFiles);
        }

    } catch (err) {
        console.error("❌ [ARCHITECT ERROR]:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

runScanner({
    models: models_list,
    connectionString: process.env.MONGO_URI_ATLAS,
    dbName: process.env.DB_NAME,
    logType: "fancy",
    // outputDir: path.join(__dirname, "output"),
});

// export default runScanner;