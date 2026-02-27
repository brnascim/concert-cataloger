export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      erros_processamento: {
        Row: {
          arquivo_nome: string | null
          created_at: string
          descricao: string | null
          id: number
          linha_afetada: string | null
          metodo_tentado: string | null
          processamento_id: string | null
          resolvido: boolean
          tipo_erro: string | null
          user_id: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: never
          linha_afetada?: string | null
          metodo_tentado?: string | null
          processamento_id?: string | null
          resolvido?: boolean
          tipo_erro?: string | null
          user_id?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: never
          linha_afetada?: string | null
          metodo_tentado?: string | null
          processamento_id?: string | null
          resolvido?: boolean
          tipo_erro?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erros_processamento_processamento_id_fkey"
            columns: ["processamento_id"]
            isOneToOne: false
            referencedRelation: "processamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      processamentos: {
        Row: {
          arquivos_com_alerta: number
          arquivos_com_falha: number
          arquivos_recebidos: number
          arquivos_sucesso: number
          created_at: string
          id: string
          linhas_rejeitadas: number
          musicas_catalogadas: number
          relatorio_json: Json | null
          setlists_criados: number
          shows_extraidos: number
          status_geral: string
          user_id: string | null
        }
        Insert: {
          arquivos_com_alerta?: number
          arquivos_com_falha?: number
          arquivos_recebidos?: number
          arquivos_sucesso?: number
          created_at?: string
          id: string
          linhas_rejeitadas?: number
          musicas_catalogadas?: number
          relatorio_json?: Json | null
          setlists_criados?: number
          shows_extraidos?: number
          status_geral?: string
          user_id?: string | null
        }
        Update: {
          arquivos_com_alerta?: number
          arquivos_com_falha?: number
          arquivos_recebidos?: number
          arquivos_sucesso?: number
          created_at?: string
          id?: string
          linhas_rejeitadas?: number
          musicas_catalogadas?: number
          relatorio_json?: Json | null
          setlists_criados?: number
          shows_extraidos?: number
          status_geral?: string
          user_id?: string | null
        }
        Relationships: []
      }
      setlists: {
        Row: {
          bmg_control: string | null
          comments: string | null
          composers: string | null
          created_at: string
          id: number
          imaestro_code: string | null
          ordem: number
          processamento_id: string
          prs_tunecode: string | null
          set_list_number: number
          song_title: string
          user_id: string | null
        }
        Insert: {
          bmg_control?: string | null
          comments?: string | null
          composers?: string | null
          created_at?: string
          id?: never
          imaestro_code?: string | null
          ordem: number
          processamento_id: string
          prs_tunecode?: string | null
          set_list_number: number
          song_title: string
          user_id?: string | null
        }
        Update: {
          bmg_control?: string | null
          comments?: string | null
          composers?: string | null
          created_at?: string
          id?: never
          imaestro_code?: string | null
          ordem?: number
          processamento_id?: string
          prs_tunecode?: string | null
          set_list_number?: number
          song_title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setlists_processamento_id_fkey"
            columns: ["processamento_id"]
            isOneToOne: false
            referencedRelation: "processamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist: string
          city: string | null
          comments: string | null
          created_at: string
          date: string
          headliner_name: string | null
          headliner_yn: string | null
          id: number
          processamento_id: string
          promoter_contact: string | null
          prs_venue_id: string | null
          set_list_number: number | null
          status: string
          territory: string | null
          user_id: string | null
          venue: string | null
          venue_address: string | null
        }
        Insert: {
          artist: string
          city?: string | null
          comments?: string | null
          created_at?: string
          date: string
          headliner_name?: string | null
          headliner_yn?: string | null
          id?: never
          processamento_id: string
          promoter_contact?: string | null
          prs_venue_id?: string | null
          set_list_number?: number | null
          status?: string
          territory?: string | null
          user_id?: string | null
          venue?: string | null
          venue_address?: string | null
        }
        Update: {
          artist?: string
          city?: string | null
          comments?: string | null
          created_at?: string
          date?: string
          headliner_name?: string | null
          headliner_yn?: string | null
          id?: never
          processamento_id?: string
          promoter_contact?: string | null
          prs_venue_id?: string | null
          set_list_number?: number | null
          status?: string
          territory?: string | null
          user_id?: string | null
          venue?: string | null
          venue_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_processamento_id_fkey"
            columns: ["processamento_id"]
            isOneToOne: false
            referencedRelation: "processamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
