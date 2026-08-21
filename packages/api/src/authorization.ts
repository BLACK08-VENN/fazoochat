import { supabaseAdmin } from './supabaseClient'

export async function isOrganizationMember(userId: string, organizationId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .match({ organization_id: organizationId, user_id: userId })
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

export async function canAccessConversation(userId: string, conversationId: string) {
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('id, organization_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conversation || !(await isOrganizationMember(userId, conversation.organization_id))) return null
  return conversation
}
