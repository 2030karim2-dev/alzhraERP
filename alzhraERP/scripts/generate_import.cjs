const fs = require('fs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const companyId = 'c83421a2-a8d7-46ff-886c-a219e75ae1e6';
const warehouseId = 'f7435eb7-3f74-4d10-aa6b-edcf47b2508e';
// Fixed conversion rate based on user prompt (e.g., 1 RMB = 0.52 SAR)
const RMB_TO_SAR = 0.53;

const rawData = [
    { no: 3, oem: "16572-31170", part: "16572-31170", brand: "Nuetral", desc: "Radiator Coolant Hose", model: "Toyota Tacoma FJ Cruiser 4Runner", price_rmb: 15.00, qty: 100 },
    { no: 4, oem: "16571-54490", part: "16571-54490", brand: "Nuetral", desc: "Radiator Coolant Hose", model: "Toyota Hilux 2002-2005", price_rmb: 15.00, qty: 100 },
    { no: 5, oem: "16572-54270", part: "16572-54270", brand: "Nuetral", desc: "Radiator Coolant Hose", model: "Toyota Hilux 1994-2006", price_rmb: 26.00, qty: 10 },
    { no: 6, oem: "25472-26001", part: "25472-26001", brand: "Nuetral", desc: "Radiator Coolant Hose", model: "Hyundai Accent 1994-2011", price_rmb: 13.00, qty: 10 },
    { no: 7, oem: "16571-2B120", part: "16571-2B120", brand: "Nuetral", desc: "Radiator Coolant Hose", model: "Toyota", price_rmb: 26.00, qty: 10 },
    { no: 9, oem: "04111-31B40", part: "04111-31B40", brand: "RAM", desc: "Overhaul Gasket Kit", model: "Toyota LEXUS IS250 4GR-FSE", price_rmb: 175.00, qty: 10 },
    { no: 10, oem: "04111-31B40", part: "04111-31B40", brand: "RAM", desc: "Overhaul Gasket Kit", model: "Toyota LEXUS IS250 4GR-FSE", price_rmb: 168.00, qty: 10 },
    { no: 11, oem: "46420-60090", part: "46420-60090", brand: "Nuetral", desc: "Parking Brake Cable", model: "Toyota Land Cruiser", price_rmb: 68.00, qty: 20 },
    { no: 12, oem: "46430-60030", part: "46430-60030", brand: "Nuetral", desc: "Parking Brake Cable", model: "Toyota Land Cruiser", price_rmb: 68.00, qty: 20 },
    { no: 13, oem: "30304AJR", part: "30304AJR", brand: "EEP", desc: "Bearing", model: "Toyota Land Cruiser 1995", price_rmb: 17.00, qty: 10 },
    { no: 14, oem: "LM104948", part: "LM104948", brand: "EEP", desc: "Bearing", model: "Land Cruiser FZJ100/UZJ100", price_rmb: 21.00, qty: 10 },
    { no: 15, oem: "LM102949", part: "LM102949", brand: "EEP", desc: "Bearing", model: "Land Cruiser FJ80 HDJ80 HZJ80", price_rmb: 19.00, qty: 10 },
    { no: 16, oem: "48702-60050", part: "48702-60050", brand: "EEP", desc: "Arm Bushing", model: "Land Cruiser/FZJ80 1990-1996", price_rmb: 13.00, qty: 20 },
    { no: 17, oem: "48061-60050", part: "48061-60050", brand: "EEP", desc: "Arm Bushing", model: "Land Cruiser", price_rmb: 12.00, qty: 10 },
    { no: 18, oem: "48706-60070", part: "48706-60070", brand: "EEP", desc: "Arm Bushing", model: "Toyota Land Cruiser 4700 FZJ100", price_rmb: 12.00, qty: 10 },
    { no: 19, oem: "48632-0K010", part: "48632-0K010", brand: "EEP", desc: "Arm Bushing", model: "Hilux/KUN15/GGN15/2WD 2004-2011", price_rmb: 12.00, qty: 10 },
    { no: 20, oem: "48702-60060", part: "48702-60060", brand: "EEP", desc: "Arm Bushing/Small", model: "Land Cruiser/FZJ80 1990-1998", price_rmb: 13.00, qty: 10 },
    { no: 21, oem: "48702-60090", part: "48702-60090", brand: "EEP", desc: "Bushing", model: "Land Cruiser/UZJ100 1998-2007", price_rmb: 13.00, qty: 10 },
    { no: 22, oem: "48702-35070", part: "48702-35070", brand: "EEP", desc: "Bushing", model: "Land Cruiser/VZJ95/4Runner", price_rmb: 11.00, qty: 10 },
    { no: 23, oem: "48655-52010", part: "48655-0D060", brand: "EEP", desc: "Arm Bushing/Big", model: "Vios/NCP10 2004-2006", price_rmb: 13.00, qty: 10 },
    { no: 24, oem: "48655-0K040", part: "48655-0K040", brand: "EEP", desc: "Arm Bushing/Big", model: "Hilux 2005-2015", price_rmb: 21.00, qty: 10 },
    { no: 25, "oem": "48654-0K040", part: "48654-0K040", brand: "EEP", desc: "Arm Bushing/Small", model: "Hilux 2005-2015", price_rmb: 21.00, qty: 10 },
    { no: 26, oem: "48632-0K020", part: "48632-0K020", brand: "EEP", desc: "Bushing", model: "Toyota Innova/Kijang", price_rmb: 12.00, qty: 10 },
    { no: 27, oem: "45047-09026", part: "45047-09026", brand: "EEP", desc: "Tie Rod End/L", model: "Vios 02-05", price_rmb: 28.00, qty: 10 },
    { no: 28, oem: "45046-09026", part: "45046-09026", brand: "EEP", desc: "Tie Rod End/R", model: "Vios 02-05", price_rmb: 28.00, qty: 10 },
    { no: 29, oem: "45503-19255", part: "45503-19255", brand: "EEP", desc: "Rack End/L=R", model: "Corolla/YARIS", price_rmb: 23.00, qty: 10 },
    { no: 30, oem: "45503-09031", part: "45503-09331", brand: "EEP", desc: "Rack End/L=R", model: "HILUX VIGO/KUN", price_rmb: 25.00, qty: 10 },
    { no: 31, oem: "48655-12170", part: "48655-05070", brand: "EEP", desc: "Arm Bushing", model: "ACM21/PRIUS", price_rmb: 15.00, qty: 10 },
    { no: 32, oem: "TO-55-A", part: "TO-1-064A", brand: "EEP", desc: "CV Joint", model: "Toyota Corolla 2001-", price_rmb: 55.00, qty: 10 },
    { no: 33, oem: "TO-54-A", part: "TO-1-057A", brand: "EEP", desc: "CV Joint", model: "Toyota Corolla NZE124", price_rmb: 55.00, qty: 10 },
    { no: 34, oem: "TO-57", part: "TO-1-045", brand: "EEP", desc: "CV Joint", model: "Land Cruiser HZJ80", price_rmb: 88.00, qty: 10 },
    { no: 35, oem: "TO-58", part: "TO-1-073", brand: "EEP", desc: "CV Joint", model: "Land Cruiser FZJ105", price_rmb: 90.00, qty: 10 },
    { no: 36, oem: "TO-60", part: "TO-1-071", brand: "EEP", desc: "CV Joint", model: "Hilux Vigo KUN25", price_rmb: 90.00, qty: 10 },
    { no: 37, oem: "04465-60190", part: "04465-60340", brand: "EEP", desc: "Brake Pads/Front", model: "LX470 98-07", price_rmb: 48.00, qty: 10 },
    { no: 38, oem: "04465-35290", part: "D976-7877-GC", brand: "EEP", desc: "Brake Pads/Front", model: "Prado 2003-2010", price_rmb: 48.00, qty: 10 },
    { no: 39, oem: "04465-02220", part: "04465-02220", brand: "EEP", desc: "Brake Pads/Front", model: "COROLLA ZRE150", price_rmb: 42.00, qty: 10 },
    { no: 40, oem: "04465-0K420", part: "D2006-9236-GC", brand: "EEP", desc: "Brake Pads/Front", model: "Innova 2015-", price_rmb: 43.00, qty: 10 }
];

function translateName(desc, model, partNumber) {
    let name_ar = '';

    // 1. Translate Description
    if (desc.includes('Radiator Coolant Hose')) {
        name_ar += 'هوس بيب تبريد ';
        if (partNumber.startsWith('16572')) name_ar += 'فوق ';
        if (partNumber.startsWith('16571')) name_ar += 'تحت ';
    } else if (desc.includes('Overhaul Gasket Kit')) {
        name_ar += 'طقم وجيه كامل ';
    } else if (desc.includes('Parking Brake Cable')) {
        name_ar += 'واير جلنط ';
    } else if (desc === 'Bearing') {
        name_ar += 'رمان بلي ';
    } else if (desc.includes('Arm Bushing/Small')) {
        name_ar += 'جلبة مقص صغير ';
    } else if (desc.includes('Arm Bushing/Big')) {
        name_ar += 'جلبة مقص كبير ';
    } else if (desc.includes('Arm Bushing')) {
        name_ar += 'جلبة مقص ';
    } else if (desc === 'Bushing') {
        name_ar += 'جلبة ';
    } else if (desc.includes('Tie Rod End/L')) {
        name_ar += 'ذراع دركسون خارجي يسار ';
    } else if (desc.includes('Tie Rod End/R')) {
        name_ar += 'ذراع دركسون خارجي يمين ';
    } else if (desc.includes('Rack End/L=R')) {
        name_ar += 'ذراع دركسون داخلي جهتين ';
    } else if (desc.includes('CV Joint')) {
        name_ar += 'رأس عكس خارجي ';
    } else if (desc.includes('Brake Pads/Front')) {
        name_ar += 'قماش فرامل أمامي ';
    } else {
        name_ar += desc + ' ';
    }

    // 2. Translate Car Model
    let mod = model.toLowerCase();
    let modAr = [];

    if (mod.includes('toyota')) modAr.push('تويوتا');
    if (mod.includes('hyundai')) modAr.push('هيونداي');
    if (mod.includes('lexus')) modAr.push('لكزس');

    if (mod.includes('tacoma')) modAr.push('تاكوما');
    if (mod.includes('fj cruiser')) modAr.push('اف جي');
    if (mod.includes('4runner')) modAr.push('فورشنار');
    if (mod.includes('hilux')) modAr.push('هايلوكس');
    if (mod.includes('accent')) modAr.push('اكسنت');
    if (mod.includes('land cruiser')) modAr.push('لاندكروزر');
    if (mod.includes('vios')) modAr.push('فيوس');
    if (mod.includes('innova')) modAr.push('انوفا');
    if (mod.includes('corolla')) modAr.push('كورولا');
    if (mod.includes('yaris')) modAr.push('يارس');
    if (mod.includes('prado')) modAr.push('برادو');
    if (mod.includes('prius')) modAr.push('بريوس');
    if (mod.includes('camry')) modAr.push('كامري');

    // Remove duplicates
    modAr = [...new Set(modAr)];

    name_ar += modAr.join(' ');

    // Fallback if no specific model translated and string doesn't exist
    if (modAr.length === 0) {
        // Just append the raw model info stripped of weird chars
        name_ar += model.replace(/[^a-zA-Z0-9- /]/g, ' ');
    }

    return name_ar.trim().replace(/\s+/g, ' ');
}

let sql = `-- INSERT SCRIPT FOR CHINESE SUPPLIER INVOICE IMPORT\n\n`;

const supplierId = uuidv4();
sql += `INSERT INTO parties (id, company_id, type, name, status, balance, created_at) VALUES ('${supplierId}', '${companyId}', 'supplier', 'المورد الصيني (China Supplier)', 'active', 0, NOW());\n\n`;

const invoiceId = uuidv4();
let invoiceTotalSAR = 0;
let invoiceItemSql = ``;
let productMap = {}; // Deduplicate SKUs

for (const item of rawData) {
    const costSAR = (item.price_rmb * RMB_TO_SAR).toFixed(2);
    const saleSAR = (costSAR * 1.3).toFixed(2);
    invoiceTotalSAR += (costSAR * item.qty);

    let productId;
    if (productMap[item.oem]) {
        productId = productMap[item.oem];
        // Only update stock for duplicates
        sql += `INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES ('${productId}', '${warehouseId}', ${item.qty}) ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = product_stock.quantity + EXCLUDED.quantity;\n`;
    } else {
        productId = uuidv4();
        productMap[item.oem] = productId;
        const productName = translateName(item.desc, item.model, item.oem);
        const safeName = productName.replace(/'/g, "''");
        sql += `INSERT INTO products (id, company_id, name_ar, brand, part_number, alternative_numbers, sku, cost_price, sale_price, min_stock_level, status, created_at) VALUES ('${productId}', '${companyId}', '${safeName}', '${item.brand}', '${item.part}', '${item.oem}', '${item.part}', ${costSAR}, ${saleSAR}, 5, 'active', NOW());\n`;
        sql += `INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES ('${productId}', '${warehouseId}', ${item.qty}) ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = product_stock.quantity + EXCLUDED.quantity;\n`;
    }

    // Add Invoice item (Every line in the invoice gets its own row)
    const iitemId = uuidv4();
    invoiceItemSql += `INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total) VALUES ('${iitemId}', '${invoiceId}', '${productId}', ${item.qty}, ${costSAR}, ${(costSAR * item.qty).toFixed(2)});\n`;
}

// Generate Invoice
const invoiceNumber = `INV-CH-${Date.now()}`;
sql += `\nINSERT INTO invoices (id, company_id, type, invoice_number, party_id, total_amount, status, created_at, date) VALUES ('${invoiceId}', '${companyId}', 'purchase', '${invoiceNumber}', '${supplierId}', ${invoiceTotalSAR.toFixed(2)}, 'paid', NOW(), NOW());\n\n`;

sql += invoiceItemSql;

// Write original script
fs.writeFileSync('import_script.sql', sql);

// Write cleanup script
let cleanupSkus = Object.keys(productMap).map(k => `'${k}'`).join(',');
let cleanupSql = `
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number LIKE 'INV-CH-%');
DELETE FROM invoices WHERE invoice_number LIKE 'INV-CH-%';
DELETE FROM product_stock WHERE product_id IN (SELECT id FROM products WHERE sku IN (${cleanupSkus}));
DELETE FROM products WHERE sku IN (${cleanupSkus});
DELETE FROM parties WHERE name = 'المورد الصيني (China Supplier)';
`;
fs.writeFileSync('cleanup_script.sql', cleanupSql);

console.log('SQL Script generated successfully: import_script.sql and cleanup_script.sql');
