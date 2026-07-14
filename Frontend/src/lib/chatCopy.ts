import type { ChatMessageType, ThreadMessage } from "@/types/agent";

export const WELCOME_MESSAGE_ID = "welcome";

/** Keep in sync with Backend/agent-service/app/chat/orchestrator.py HELP_TEXT */
export const HELP_TEXT =
  "Hi, I'm the SafeLine chat bot.\n\n" +
  "Worried about a message you received? Maybe a fake bank alert, a job offer " +
  "that seems too good to be true, or a rumour about a dam breaking nearby. " +
  "We're here to help.\n\n" +
  "Paste or forward the text, or send a screenshot/photo. We'll read it, " +
  "verify it against live sources, and send you a clear verdict.";

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
  "Paste a suspicious message or screenshot — we'll verify it against live sources.";

export const CHAT_EMPTY_TITLE = "Paste anything suspicious";

export const CHAT_EMPTY_BLURB =
  "Forward a suspicious SMS, job offer, rumor, or screenshot.\n" +
  "We check it against live sources and send you a cited verdict.";
