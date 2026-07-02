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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
