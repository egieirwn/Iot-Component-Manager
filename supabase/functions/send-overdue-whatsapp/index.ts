// ==============================================================================
// Supabase Edge Function: send-overdue-whatsapp
// Project: IoT Component Manager
// Description: Scheduled or triggered worker that scans for overdue borrowings,
//              respects explicit student consent, formats E.164 phone numbers,
//              dispatches WhatsApp reminders via Meta Business API (or simulation
//              mode when credentials are unconfigured), and records delivery logs.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Standardize phone numbers to international E.164 format (+62...)
 */
export function formatE164Phone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "").trim();

  let formatted = cleaned;
  if (formatted.startsWith("+")) {
    formatted = formatted;
  } else if (formatted.startsWith("08")) {
    formatted = "+62" + formatted.substring(1);
  } else if (formatted.startsWith("628")) {
    formatted = "+" + formatted;
  } else if (formatted.startsWith("8")) {
    formatted = "+62" + formatted;
  }

  // Validate E.164 phone regex (e.g. +628123456789)
  const e164Regex = /^\+[1-9]\d{9,14}$/;
  if (!e164Regex.test(formatted)) {
    return null;
  }
  return formatted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "overdue_borrowing_reminder";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and Service Role Key must be configured in environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch overdue borrowing records that have not been notified
    const { data: overdueItems, error: fetchErr } = await supabase.rpc(
      "get_overdue_borrowings_for_notification"
    );

    if (fetchErr) {
      throw new Error(`Failed to query overdue borrowings: ${fetchErr.message}`);
    }

    const items = overdueItems || [];
    const results = {
      total_eligible: items.length,
      sent: 0,
      skipped_no_consent: 0,
      skipped_no_phone: 0,
      simulated: 0,
      failed: 0,
      is_live_configured: Boolean(whatsappToken && phoneNumberId),
      details: [] as any[]
    };

    const hasLiveCredentials = Boolean(whatsappToken && phoneNumberId);

    // 2. Process each overdue borrowing record
    for (const item of items) {
      // Consent Check
      if (item.whatsapp_opt_in === false) {
        await supabase.rpc("record_overdue_notification_result", {
          p_borrowing_id: item.borrowing_id,
          p_recipient_phone: item.phone_number || "NONE",
          p_recipient_name: item.borrower_name,
          p_status: "SKIPPED_NO_CONSENT",
          p_error_message: "User opted out of WhatsApp reminders."
        });
        results.skipped_no_consent++;
        results.details.push({
          borrowing_id: item.borrowing_id,
          status: "SKIPPED_NO_CONSENT",
          borrower: item.borrower_name
        });
        continue;
      }

      // Phone Number Validation & E.164 Formatting
      const formattedPhone = formatE164Phone(item.phone_number);
      if (!formattedPhone) {
        await supabase.rpc("record_overdue_notification_result", {
          p_borrowing_id: item.borrowing_id,
          p_recipient_phone: item.phone_number || "INVALID",
          p_recipient_name: item.borrower_name,
          p_status: "SKIPPED_NO_PHONE",
          p_error_message: "Phone number is empty or not a valid phone number."
        });
        results.skipped_no_phone++;
        results.details.push({
          borrowing_id: item.borrowing_id,
          status: "SKIPPED_NO_PHONE",
          borrower: item.borrower_name
        });
        continue;
      }

      // Send via WhatsApp Business Platform API if configured
      if (hasLiveCredentials) {
        try {
          const apiResponse = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${whatsappToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone.replace("+", ""),
                type: "template",
                template: {
                  name: templateName,
                  language: { code: "id" },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        { type: "text", text: item.borrower_name },
                        { type: "text", text: item.component_name },
                        { type: "text", text: String(item.days_overdue) },
                        { type: "text", text: item.pickup_lab || "Laboratorium IoT" }
                      ]
                    }
                  ]
                }
              }),
            }
          );

          const payload = await apiResponse.json();

          if (apiResponse.ok && payload.messages?.[0]?.id) {
            await supabase.rpc("record_overdue_notification_result", {
              p_borrowing_id: item.borrowing_id,
              p_recipient_phone: formattedPhone,
              p_recipient_name: item.borrower_name,
              p_status: "SENT",
              p_response_payload: payload
            });
            results.sent++;
            results.details.push({
              borrowing_id: item.borrowing_id,
              status: "SENT",
              phone: formattedPhone
            });
          } else {
            await supabase.rpc("record_overdue_notification_result", {
              p_borrowing_id: item.borrowing_id,
              p_recipient_phone: formattedPhone,
              p_recipient_name: item.borrower_name,
              p_status: "FAILED",
              p_error_message: payload.error?.message || "WhatsApp API error",
              p_response_payload: payload
            });
            results.failed++;
            results.details.push({
              borrowing_id: item.borrowing_id,
              status: "FAILED",
              error: payload.error?.message
            });
          }
        } catch (err: any) {
          await supabase.rpc("record_overdue_notification_result", {
            p_borrowing_id: item.borrowing_id,
            p_recipient_phone: formattedPhone,
            p_recipient_name: item.borrower_name,
            p_status: "FAILED",
            p_error_message: err.message || "Network error dispatching WhatsApp"
          });
          results.failed++;
        }
      } else {
        // Safe Simulation Mode (when live Meta credentials are not configured in secrets)
        await supabase.rpc("record_overdue_notification_result", {
          p_borrowing_id: item.borrowing_id,
          p_recipient_phone: formattedPhone,
          p_recipient_name: item.borrower_name,
          p_status: "SIMULATED",
          p_error_message: null,
          p_response_payload: {
            note: "SIMULATED: Live WhatsApp credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) not yet configured in Supabase Secrets.",
            template: templateName,
            recipient: formattedPhone,
            borrower_name: item.borrower_name,
            component_name: item.component_name,
            days_overdue: item.days_overdue
          }
        });
        results.simulated++;
        results.details.push({
          borrowing_id: item.borrowing_id,
          status: "SIMULATED",
          phone: formattedPhone
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
