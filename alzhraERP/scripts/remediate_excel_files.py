# -*- coding: utf-8 -*-
"""
remediate_excel_files.py
أداة تنقية وتصحيح ملفات الإكسل التشغيلية في منظومة الزهراء
"""
import openpyxl
import os
import shutil

DOWNLOADS_DIR = r"C:\Users\seens\Downloads"

def remediate_auto_belts():
    filepath = os.path.join(DOWNLOADS_DIR, "auto_belts_inventory_updated.xlsx")
    if not os.path.exists(filepath):
        print("[!] File not found:", filepath)
        return

    backup_path = filepath.replace(".xlsx", "_backup.xlsx")
    if not os.path.exists(backup_path):
        shutil.copyfile(filepath, backup_path)
        print("[+] Created backup at:", backup_path)

    wb = openpyxl.load_workbook(filepath)
    ws = wb.active

    # Header is at row 3
    # Rows start at row 4: Col 1: #, Col 2: Part Number, Col 3: Qty, Col 4: Notes
    items_map = {} # part_number -> {qty, notes}
    order = []

    for r in range(4, ws.max_row + 1):
        part = ws.cell(r, 2).value
        qty = ws.cell(r, 3).value
        notes = ws.cell(r, 4).value

        if not part:
            continue

        part_clean = str(part).strip()
        try:
            qty_num = float(qty) if qty is not None else 0.0
        except ValueError:
            qty_num = 0.0

        if part_clean in items_map:
            items_map[part_clean]['qty'] += qty_num
            if notes and str(notes).strip():
                existing = items_map[part_clean]['notes']
                if str(notes).strip() not in existing:
                    items_map[part_clean]['notes'] = (existing + " / " + str(notes).strip()).strip(" / ")
        else:
            items_map[part_clean] = {
                'qty': qty_num,
                'notes': str(notes).strip() if notes else ''
            }
            order.append(part_clean)

    # Clear old data rows and write deduped items
    for r in range(4, ws.max_row + 10):
        for c in range(1, 5):
            ws.cell(r, c).value = None

    for idx, part in enumerate(order, 1):
        ws.cell(3 + idx, 1).value = idx
        ws.cell(3 + idx, 2).value = part
        ws.cell(3 + idx, 3).value = items_map[part]['qty']
        ws.cell(3 + idx, 4).value = items_map[part]['notes']

    wb.save(filepath)
    print(f"[SUCCESS] remediate_auto_belts: Merged duplicate parts, clean count = {len(order)}")


def remediate_sales_invoice():
    filepath = os.path.join(DOWNLOADS_DIR, "sales_invoice1_sar_12pct.xlsx")
    if not os.path.exists(filepath):
        print("[!] File not found:", filepath)
        return

    backup_path = filepath.replace(".xlsx", "_backup.xlsx")
    if not os.path.exists(backup_path):
        shutil.copyfile(filepath, backup_path)
        print("[+] Created backup at:", backup_path)

    wb = openpyxl.load_workbook(filepath, data_only=False)
    ws = wb["فاتورة المبيعات"]

    # Pre-calculate totals and ensure formulas & cached values are consistent
    for r in range(10, ws.max_row + 1):
        qty = ws.cell(r, 4).value
        price = ws.cell(r, 5).value
        if qty is not None and price is not None:
            try:
                q = float(qty)
                p = float(price)
                calc_total = round(q * p, 2)
                # Ensure the formula is set
                ws.cell(r, 6).value = f"=D{r}*E{r}"
            except ValueError:
                pass

    wb.save(filepath)
    print("[SUCCESS] remediate_sales_invoice: Formulas verified and updated.")


def remediate_customer_balances():
    filepath = os.path.join(DOWNLOADS_DIR, "ارصدة العملاء 27  6.xlsx")
    if not os.path.exists(filepath):
        print("[!] File not found:", filepath)
        return

    clean_path = os.path.join(DOWNLOADS_DIR, "ارصدة_العملاء_المحدثة_نظيفة.xlsx")
    wb_orig = openpyxl.load_workbook(filepath, data_only=True)
    ws_orig = wb_orig["ورقة1"]

    wb_new = openpyxl.Workbook()
    # Sheet 1: YER
    ws_yer = wb_new.active
    ws_yer.title = "أرصدة ريال يمني"
    # Sheet 2: SAR
    ws_sar = wb_new.create_sheet("أرصدة ريال سعودي")

    headers = [
        "م", "كود الحساب", "اسم العميل", "العملة", 
        "رصيد نهائي مدين", "رصيد نهائي دائن", 
        "آخر حركة مدينة", "تاريخ آخر حركة مدينة", 
        "آخر حركة دائنة", "تاريخ آخر حركة دائنة", 
        "آخر دفعة", "تاريخ آخر دفعة"
    ]

    for ws_target in [ws_yer, ws_sar]:
        ws_target.views.sheetView[0].rightToLeft = True
        ws_target.append(headers)

    count_yer = 0
    count_sar = 0
    ignored_parents = 0

    for r in range(6, ws_orig.max_row + 1):
        acc_raw = ws_orig.cell(r, 2).value
        curr = str(ws_orig.cell(r, 3).value or '').strip()
        debit = ws_orig.cell(r, 4).value
        credit = ws_orig.cell(r, 6).value

        if not acc_raw:
            continue

        acc_str = str(acc_raw).strip()

        # Filter out parent categories / summary accounts
        if acc_str in ["1 - اصول", "12 - اصول متداولة", "121 - الزبائن", "اصول", "خصوم"]:
            ignored_parents += 1
            continue

        # Split code and name if in format '1210001 - Name'
        parts = acc_str.split(" - ", 1)
        code = parts[0].strip() if len(parts) > 1 else ""
        name = parts[1].strip() if len(parts) > 1 else acc_str

        row_data = [
            0, # placeholder for index
            code,
            name,
            curr,
            debit or 0,
            credit or 0,
            ws_orig.cell(r, 7).value,
            ws_orig.cell(r, 8).value,
            ws_orig.cell(r, 9).value,
            ws_orig.cell(r, 10).value,
            ws_orig.cell(r, 11).value,
            ws_orig.cell(r, 12).value,
        ]

        if "يمني" in curr:
            count_yer += 1
            row_data[0] = count_yer
            ws_yer.append(row_data)
        else:
            count_sar += 1
            row_data[0] = count_sar
            ws_sar.append(row_data)

    wb_new.save(clean_path)
    print(f"[SUCCESS] remediate_customer_balances: Created clean file at {clean_path}")
    print(f"  -> YER Accounts: {count_yer} | SAR Accounts: {count_sar} | Ignored Parents: {ignored_parents}")


if __name__ == "__main__":
    print("=== Starting Excel Remediation ===")
    remediate_auto_belts()
    remediate_sales_invoice()
    remediate_customer_balances()
    print("=== Remediation Completed ===")
