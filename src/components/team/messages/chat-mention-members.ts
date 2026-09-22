import type { ChatConversation, ChatMember } from "@/lib/api";
import type { TeamMember } from "@/lib/api/types/team";

function mentionMember(
  userId: string,
  name: string,
  avatarUrl?: string,
  joinedAt = "",
): TeamMember {
  return {
    id: userId,
    team_id: "",
    user_id: userId,
    role: "member",
    status: "active",
    joined_at: joinedAt,
    name,
    avatar_url: avatarUrl,
  };
}

/** Mention suggestions belong to the open conversation, never the workspace. */
export function chatMentionMembers(
  conversation: ChatConversation | null,
  roster: ChatMember[],
): TeamMember[] {
  if (!conversation) return [];
  if (conversation.type === "dm") {
    return conversation.peer_user_id
      ? [
          mentionMember(
            conversation.peer_user_id,
            conversation.peer_user_name || "Member",
            conversation.peer_user_avatar,
          ),
        ]
      : [];
  }
  return roster.map((member) =>
    mentionMember(
      member.user_id,
      member.name,
      member.avatar_url,
      member.joined_at,
    ),
  );
}
