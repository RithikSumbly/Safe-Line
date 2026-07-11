import type { ChatMessageType, ThreadMessage } from "@/types/agent";

export const WELCOME_MESSAGE_ID = "welcome";

/** Keep in sync with Backend/agent-service/app/chat/orchestrator.py HELP_TEXT */
export const HELP_TEXT =
  "Hi, I'm the SafeLine chat bot.\n\n" +
  "Worried about a message you received? Maybe a fake bank alert, a job offer " +
  "that seems too good to be true, or a rumour about a dam breaking nearby. " +
  "We're here to help.\n\n" +
  "Just paste or forward what you got. We'll verify it against live sources " +
  "and send you a clear verdict.";

export function createWelcomeMessage(): ThreadMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: "assistant",
    content: HELP_TEXT,
    messageType: "help" as ChatMessageType,
    createdAt: new Date(0).toISOString(),
  };
}

export const CHAT_TAGLINE =
  "Worried about a message you received? Paste it here and we'll verify it against live sources.";

export const CHAT_EMPTY_TITLE = "Paste anything suspicious";

export const CHAT_EMPTY_BLURB =
  "Forward a suspicious SMS, job offer, or rumor.\n" +
  "We check it against live sources and send you a cited verdict.";
