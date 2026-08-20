import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Origin allow-list (mirrors ai-proxy). We never echo arbitrary origins — a
// non-listed origin receives the sandbox origin instead of being reflected.
const ALLOWED_ORIGINS = [
    'https://zzthamxjxnxzzpswllid.supabase.co',
    'https://alzhra-erp.vercel.app',
    'https://alzhra-erp.netlify.app',
    'https://alzhra-2030karim2-devs-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

const corsHeaders = (origin: string | null) => ({
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Max-Age': '86400',
})

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });

// ZATCA Fatoora API URLs (Sandbox)
const ZATCA_API_URL = "https://gw-apic-gov.gazt.gov.sa/e-invoicing/developer-portal";

// Helper for TLV Base64 QR Code
function generateTLVQRCodeData(sellerName: string, vatNumber: string, timestamp: string, totalStr: string, vatTotalStr: string): string {
    const toHexLength = (val: string) => {
        const len = new TextEncoder().encode(val).length;
        return String.fromCharCode(len);
    };
    
    const tags = [
        { id: 1, value: sellerName },
        { id: 2, value: vatNumber },
        { id: 3, value: timestamp },
        { id: 4, value: totalStr },
        { id: 5, value: vatTotalStr }
    ];

    let tlvBuffer = new Uint8Array(0);
    for (const tag of tags) {
        const valBytes = new TextEncoder().encode(tag.value);
        const tagBuf = new Uint8Array([tag.id, valBytes.length, ...valBytes]);
        const newBuf = new Uint8Array(tlvBuffer.length + tagBuf.length);
        newBuf.set(tlvBuffer);
        newBuf.set(tagBuf, tlvBuffer.length);
        tlvBuffer = newBuf;
    }
    return base64Encode(tlvBuffer);
}

// Helper for generating simplified UBL XML (Standard ZATCA Invoice)
// NOTE: Phase-one template. Full ZATCA production compliance additionally needs
// the onboarding CSR / compliance certificate + EInvoice signing — see docs.
function generateUBLXML(invoice: any, company: any, party: any): string {
    const supplierName = company?.name_ar || company?.name_en || 'Al-Zahra Auto Parts';
    const supplierVat = company?.tax_number || '';
    const buyerName = party?.name || '';
    const buyerVat = party?.tax_number || '';
    const issueDate = invoice?.issue_date || new Date().toISOString().split('T')[0];
    const issueTime = new Date().toISOString().split('T')[1]?.substring(0, 8) || '00:00:00';
    const taxExclusive = Number(invoice?.total_amount || 0).toFixed(2);
    const taxAmount = Number(invoice?.tax_amount || 0).toFixed(2);
    const taxInclusive = (Number(invoice?.total_amount || 0) + Number(invoice?.tax_amount || 0)).toFixed(2);

    // B2B (buyer has a VAT number) → clearance endpoint; otherwise B2C → reporting.
    const supplierEndpoint = supplierVat
        ? `<cbc:EndpointID schemeID="VAT">${supplierVat}</cbc:EndpointID>`
        : '';
    const buyerEndpoint = buyerVat
        ? `<cbc:EndpointID schemeID="VAT">${buyerVat}</cbc:EndpointID>`
        : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoice?.invoice_number || invoice?.id}</cbc:ID>
    <cbc:UUID>${invoice?.id}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    <cac:AccountingSupplierParty>
        <cac:Party>
            ${supplierEndpoint}
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${supplierName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            ${buyerEndpoint}
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${buyerName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${taxAmount}</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:TaxExclusiveAmount currencyID="SAR">${taxExclusive}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${taxInclusive}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">${taxInclusive}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;
}

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const headers = corsHeaders(origin);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, headers);
    }

    try {
        // 1. Authentication — a valid Supabase user JWT is REQUIRED.
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return json({ error: 'Unauthorized: Missing Authorization header', code: 'AUTH_MISSING' }, 401, headers);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) {
            return json({ error: 'Server Error: Supabase configuration missing', code: 'CONFIG_ERROR' }, 500, headers);
        }

        // User-scoped client: every DB read/write below is filtered by RLS.
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return json({ error: 'Unauthorized: Invalid token', code: 'AUTH_INVALID' }, 401, headers);
        }

        // 2. Parse body — only the invoice id is trusted from the client.
        let invoiceId: unknown;
        try {
            const body = await req.json();
            invoiceId = body?.invoiceData?.id;
        } catch {
            return json({ error: 'Invalid JSON in request body', code: 'INVALID_BODY' }, 400, headers);
        }
        if (typeof invoiceId !== 'string' || invoiceId.length === 0) {
            return json({ error: 'Valid invoiceData.id (uuid string) is required', code: 'VALIDATION_ERROR' }, 400, headers);
        }

        // 3. Load the invoice from the DB (RLS-scoped) — never trust client amounts.
        const { data: invoice, error: invErr } = await supabase
            .from('invoices')
            .select('id, company_id, party_id, invoice_number, issue_date, total_amount, tax_amount, currency_code, exchange_rate')
            .eq('id', invoiceId)
            .maybeSingle();

        if (invErr) {
            return json({ error: 'Failed to load invoice', code: 'DB_ERROR' }, 500, headers);
        }
        if (!invoice) {
            return json({ error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' }, 404, headers);
        }

        const { data: company, error: compErr } = await supabase
            .from('companies')
            .select('id, name_ar, name_en, tax_number')
            .eq('id', invoice.company_id)
            .maybeSingle();
        if (compErr || !company) {
            return json({ error: 'Company not found', code: 'COMPANY_NOT_FOUND' }, 500, headers);
        }

        // Optional buyer info — decides B2B (clearance) vs B2C (reporting).
        let party: { name?: string; tax_number?: string } | null = null;
        if (invoice.party_id) {
            const { data: partyRow } = await supabase
                .from('parties')
                .select('name, tax_number')
                .eq('id', invoice.party_id)
                .maybeSingle();
            party = partyRow ?? null;
        }

        // 4. ZATCA must be configured — fail CLOSED, never simulate success.
        const zatcaAuthToken = Deno.env.get('ZATCA_AUTH_TOKEN');
        if (!zatcaAuthToken) {
            return json({
                error: 'ZATCA is not configured on the server. No invoice was submitted.',
                code: 'ZATCA_NOT_CONFIGURED',
            }, 503, headers);
        }

        const sellerName = company?.name_ar || company?.name_en || 'Al-Zahra Auto Parts';
        const vatNumber = company?.tax_number || '';
        const timestamp = new Date().toISOString();
        const totalInclVat = (Number(invoice.total_amount) || 0).toFixed(2);
        const vatTotal = (Number(invoice.tax_amount) || 0).toFixed(2);

        // 5. Build QR + XML + hash from DB-sourced values.
        const qrCodeData = generateTLVQRCodeData(sellerName, vatNumber, timestamp, totalInclVat, vatTotal);
        const xmlContent = generateUBLXML(invoice, company, party);
        const base64XML = base64Encode(new TextEncoder().encode(xmlContent));
        const invoiceHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(xmlContent));
        const base64Hash = base64Encode(new Uint8Array(invoiceHash));

        const zatcaPayload = {
            invoiceHash: base64Hash,
            uuid: invoice.id,
            invoice: base64XML,
        };

        const isB2B = Boolean(party?.tax_number);
        const zatcaSubmitType = isB2B
            ? 'invoices/clearance/single'
            : 'invoices/reporting/single';

        // 6. Submit to ZATCA.
        let zatcaResponse: unknown;
        try {
            const apiRes = await fetch(`${ZATCA_API_URL}/${zatcaSubmitType}`, {
                method: 'POST',
                headers: {
                    'Accept-Version': 'V2',
                    'Authorization': `Basic ${zatcaAuthToken}`,
                    'Accept-Language': 'en',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(zatcaPayload),
            });
            zatcaResponse = await apiRes.json().catch(() => ({}));
            if (!apiRes.ok) {
                return json({
                    error: 'ZATCA upstream returned an error. No invoice was accepted.',
                    code: 'ZATCA_UPSTREAM_ERROR',
                    statusCode: apiRes.status,
                }, 502, headers);
            }
        } catch {
            return json({
                error: 'Failed to reach ZATCA upstream. No invoice was accepted.',
                code: 'ZATCA_NETWORK_ERROR',
            }, 502, headers);
        }

        const finalResult = {
            ...(zatcaResponse as Record<string, unknown>),
            qrCodeData,
            submissionTime: new Date().toISOString(),
        };

        // 7. Best-effort audit log (RLS-scoped insert using the real schema columns).
        const { error: logError } = await supabase
            .from('audit_logs')
            .insert({
                company_id: invoice.company_id,
                user_id: user.id,
                action: 'ZATCA_SUBMISSION',
                entity: 'invoices',
                entity_id: invoice.id,
                details: finalResult,
            });
        if (logError) {
            console.warn('Failed to insert ZATCA audit log:', logError.message);
        }

        // 8. Return response to client
        return json(finalResult, 200, headers);
    } catch (error) {
        console.error('ZATCA Integration Error:', error);
        return json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500, headers);
    }
})
