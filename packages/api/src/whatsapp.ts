import twilio from 'twilio'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseClient'

interface TwilioConfig {
  accountSid: string
  authToken: string
  whatsappNumber: string
}

let clientCache: Record<string, twilio.Twilio> = {}

function getClient(config: TwilioConfig): twilio.Twilio {
  const key = config.accountSid
  if (!clientCache[key]) {
    clientCache[key] = twilio(config.accountSid, config.authToken)
  }
  return clientCache[key]
}

export async function getWhatsAppConfig(
  organizationId: string,
  supabase: SupabaseClient = supabaseAdmin
): Promise<TwilioConfig | null> {
  const { data } = await supabase
    .from('whatsapp_configs')
    .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .single()

  if (!data) return null
  return {
    accountSid: data.twilio_account_sid,
    authToken: data.twilio_auth_token,
    whatsappNumber: data.twilio_whatsapp_number
  }
}

export async function sendWhatsAppMessage(
  config: TwilioConfig,
  to: string,
  body: string
): Promise<string | null> {
  const client = getClient(config)
  try {
    const msg = await client.messages.create({
      from: `whatsapp:${config.whatsappNumber}`,
      to: `whatsapp:${to}`,
      body
    })
    return msg.sid
  } catch (err: any) {
    console.error('WhatsApp send failed:', err.message)
    return null
  }
}

export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return twilio.validateRequest(authToken, signature, url, params)
}
