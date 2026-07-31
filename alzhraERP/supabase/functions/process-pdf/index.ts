// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { fileUrl, companyId } = await req.json()

        // 1. Validate inputs
        if (!fileUrl || !companyId) {
            return new Response(
                JSON.stringify({ error: 'fileUrl and companyId are required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 2. Initialize Supabase Admin Client
        // This uses the service role key to bypass RLS and interact safely from the edge
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`Processing PDF for company ${companyId} at URL: ${fileUrl}`)

        // 3. Mock OCR Processing (In a real app, send to Document AI or similar)
        // await fetch('https://api.document-ai.com/v1/process', { body: fileUrl })
        const extractedData = {
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            totalAmount: Math.floor(Math.random() * 5000) + 100,
            taxAmount: 0,
        }
        extractedData.taxAmount = extractedData.totalAmount * 0.15

        // 4. Mock AI Validation
        const validatedData = {
            ...extractedData,
            status: "VALIDATED_BY_AI",
            confidenceScore: 0.95
        }

        // 5. Optionally log the processing event to the database
        const { error: logError } = await supabaseClient
            .from('audit_logs')
            .insert({
                action: 'EDGE_FUNCTION_PROCESS_PDF',
                table_name: 'system',
                changes: { status: 'success', companyId, data: validatedData }
            })

        if (logError) {
            console.warn('Failed to insert audit log:', logError)
        }

        return new Response(
            JSON.stringify(validatedData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
