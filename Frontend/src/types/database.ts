export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      checks: {
        Row: {
          agent: string;
          created_at: string | null;
          id: string;
          input_text: string | null;
          user_id: string;
          verdict: Json;
        };
        Insert: {
          agent: string;
          created_at?: string | null;
          id?: string;
          input_text?: string | null;
          user_id: string;
          verdict: Json;
        };
        Update: {
          agent?: string;
          created_at?: string | null;
          id?: string;
          input_text?: string | null;
          user_id?: string;
          verdict?: Json;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          updated_at: string | null;
          whatsapp_phone: string | null;
        };
        Insert: {
          id: string;
          updated_at?: string | null;
          whatsapp_phone?: string | null;
        };
        Update: {
          id?: string;
          updated_at?: string | null;
          whatsapp_phone?: string | null;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: string;
          content: string | null;
          message_type: string;
          verdict: Json | null;
          agent: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: string;
          content?: string | null;
          message_type?: string;
          verdict?: Json | null;
          agent?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: string;
          content?: string | null;
          message_type?: string;
          verdict?: Json | null;
          agent?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
