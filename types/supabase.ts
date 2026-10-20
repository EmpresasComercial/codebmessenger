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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_gruop: {
        Row: {
          data_registrada: string
          detalhes: Json
          id: number
          mensagem: string
          uid_emissor: string
        }
        Insert: {
          data_registrada?: string
          detalhes?: Json
          id?: number
          mensagem: string
          uid_emissor: string
        }
        Update: {
          data_registrada?: string
          detalhes?: Json
          id?: number
          mensagem?: string
          uid_emissor?: string
        }
        Relationships: []
      }
      cupons: {
        Row: {
          ativo: boolean
          codigo_cupom: string
          created_at: string
          id: string
          resgates: Json
          usos_restantes: number | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo_cupom: string
          created_at?: string
          id?: string
          resgates?: Json
          usos_restantes?: number | null
          valor: number
        }
        Update: {
          ativo?: boolean
          codigo_cupom?: string
          created_at?: string
          id?: string
          resgates?: Json
          usos_restantes?: number | null
          valor?: number
        }
        Relationships: []
      }
      equipe_mcpn: {
        Row: {
          created_at: string | null
          id: number
          nivel_direto: number | null
          patrocinador_id: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nivel_direto?: number | null
          patrocinador_id?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nivel_direto?: number | null
          patrocinador_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_equipe_patrocinador"
            columns: ["patrocinador_id"]
            isOneToOne: false
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipe_patrocinador"
            columns: ["patrocinador_id"]
            isOneToOne: false
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipe_user"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipe_user"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
        ]
      }
      extrato_mcpn: {
        Row: {
          created_at: string
          detalhes: Json | null
          from_user_id: string | null
          id: string
          nivel: number | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          from_user_id?: string | null
          id?: string
          nivel?: number | null
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          from_user_id?: string | null
          id?: string
          nivel?: number | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_mcpn_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_mcpn_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_audit_mcpn: {
        Row: {
          action_type: string | null
          created_at: string | null
          details: Json | null
          id: number
          ip_address: unknown
          success: boolean | null
          usuario_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address: unknown
          success?: boolean | null
          usuario_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: unknown
          success?: boolean | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_audit_mcpn_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_audit_mcpn_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
        ]
      }
      nucleo: {
        Row: {
          avatar_url: string | null
          bio: string | null
          codigo_convite_ref: string | null
          codigo_meu_refferal: string | null
          dados_bancarios: Json | null
          device_id: string | null
          id: string
          nome_exibicao: string | null
          saldo_disponivel: number
          telefone: string
          total_recarregado: number
          total_retirado: number
          updated_at: string
          webpush_subscription: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          codigo_convite_ref?: string | null
          codigo_meu_refferal?: string | null
          dados_bancarios?: Json | null
          device_id?: string | null
          id: string
          nome_exibicao?: string | null
          saldo_disponivel?: number
          telefone?: string
          total_recarregado?: number
          total_retirado?: number
          updated_at?: string
          webpush_subscription?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          codigo_convite_ref?: string | null
          codigo_meu_refferal?: string | null
          dados_bancarios?: Json | null
          device_id?: string | null
          id?: string
          nome_exibicao?: string | null
          saldo_disponivel?: number
          telefone?: string
          total_recarregado?: number
          total_retirado?: number
          updated_at?: string
          webpush_subscription?: Json | null
        }
        Relationships: []
      }
      pasta: {
        Row: {
          contas: Json
          id: string
          updated_at: string
        }
        Insert: {
          contas?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          contas?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      paymentbot: {
        Row: {
          created_at: string
          detalhes_transacao: Json | null
          id: string
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          detalhes_transacao?: Json | null
          id?: string
          status?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          detalhes_transacao?: Json | null
          id?: string
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recargas_mcpn_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recargas_mcpn_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          duracao_dias: number
          id: string
          limite_compra: number | null
          nome: string
          preco: number
          renda_diaria: number
        }
        Insert: {
          ativo?: boolean
          duracao_dias: number
          id?: string
          limite_compra?: number | null
          nome: string
          preco: number
          renda_diaria: number
        }
        Update: {
          ativo?: boolean
          duracao_dias?: number
          id?: string
          limite_compra?: number | null
          nome?: string
          preco?: number
          renda_diaria?: number
        }
        Relationships: []
      }
      retiradas_mcpn: {
        Row: {
          created_at: string
          dados_bancarios_snapshot: Json
          id: string
          status: string
          user_id: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          created_at?: string
          dados_bancarios_snapshot: Json
          id?: string
          status?: string
          user_id: string
          valor_bruto: number
          valor_liquido?: number | null
        }
        Update: {
          created_at?: string
          dados_bancarios_snapshot?: Json
          id?: string
          status?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_retiradas_user_final"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_user_final"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
        ]
      }
      sacola: {
        Row: {
          body: string
          id: string
          payload: Json | null
          sent_at: string
          status: string
          title: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          id?: string
          payload?: Json | null
          sent_at?: string
          status?: string
          title: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          id?: string
          payload?: Json | null
          sent_at?: string
          status?: string
          title?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sys_600: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          dias_restantes: number | null
          id: string
          preco_pago: number
          produto_id: string | null
          renda_diaria: number
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim: string
          data_inicio?: string
          dias_restantes?: number | null
          id?: string
          preco_pago: number
          produto_id?: string | null
          renda_diaria: number
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias_restantes?: number | null
          id?: string
          preco_pago?: number
          produto_id?: string | null
          renda_diaria?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_produtos_account_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nucleo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_produtos_account_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sys_t500"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      sys_t110: {
        Row: {
          created_at: string
          destinatario_id: string
          detalhes: Json
          id: string
          mensagem: string
          remetente_id: string
        }
        Insert: {
          created_at?: string
          destinatario_id: string
          detalhes?: Json
          id?: string
          mensagem: string
          remetente_id: string
        }
        Update: {
          created_at?: string
          destinatario_id?: string
          detalhes?: Json
          id?: string
          mensagem?: string
          remetente_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sys_t500: {
        Row: {
          avatar_url: string | null
          bio: string | null
          codigo_convite_ref: string | null
          codigo_meu_refferal: string | null
          dados_bancarios: Json | null
          device_id: string | null
          id: string | null
          nome_exibicao: string | null
          saldo_disponivel: number | null
          telefone: string | null
          total_recarregado: number | null
          total_retirado: number | null
          updated_at: string | null
          webpush_subscription: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          codigo_convite_ref?: string | null
          codigo_meu_refferal?: string | null
          dados_bancarios?: Json | null
          device_id?: string | null
          id?: string | null
          nome_exibicao?: string | null
          saldo_disponivel?: number | null
          telefone?: string | null
          total_recarregado?: number | null
          total_retirado?: number | null
          updated_at?: string | null
          webpush_subscription?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          codigo_convite_ref?: string | null
          codigo_meu_refferal?: string | null
          dados_bancarios?: Json | null
          device_id?: string | null
          id?: string | null
          nome_exibicao?: string | null
          saldo_disponivel?: number | null
          telefone?: string | null
          total_recarregado?: number | null
          total_retirado?: number | null
          updated_at?: string | null
          webpush_subscription?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      buy_product_mcpn: { Args: { p_product_id: string }; Returns: Json }
      confirm_recharge_mcpn: {
        Args: {
          p_bank_name: string
          p_image_path: string
          p_recharge_id: string
        }
        Returns: Json
      }
      create_coupon_mcpn: {
        Args: {
          p_admin_secret?: string
          p_codigo: string
          p_usos_max?: number
          p_valor: number
        }
        Returns: Json
      }
      get_available_products_mcpn: {
        Args: never
        Returns: {
          descricao: string
          duracao_dias: number
          id: string
          imagem_url: string
          limite_compra: number
          nome: string
          preco: number
          renda_diaria: number
          size: string
        }[]
      }
      get_chat_messages_mcpn:
        | {
            Args: {
              p_delete_id?: number
              p_detalhes?: Json
              p_edit_id?: number
              p_group: string
              p_limit?: number
              p_send_message?: string
            }
            Returns: {
              data_registrada: string
              detalhes: Json
              id: number
              mensagem: string
              nome_exibicao: string
              telefone: string
              uid_emissor: string
            }[]
          }
        | {
            Args: {
              p_detalhes?: Json
              p_limit?: number
              p_mark_as_read?: boolean
              p_offset?: number
              p_send_message?: string
              p_user1: string
              p_user2: string
            }
            Returns: {
              created_at: string
              destinatario_id: string
              detalhes: Json
              id: string
              mensagem: string
              remetente_id: string
            }[]
          }
      get_collection_bank_details_mcpn: {
        Args: { p_bank_id: string }
        Returns: {
          iban: string
          id: string
          nome_banco: string
          nome_proprietario: string
        }[]
      }
      get_collection_banks_mcpn: {
        Args: never
        Returns: {
          created_at: string
          iban: string
          id: string
          nome_banco: string
          nome_proprietario: string
        }[]
      }
      get_general_history_mcpn: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          status: string
          type: string
        }[]
      }
      get_invite_page_data_mcpn: { Args: never; Returns: Json }
      get_my_account_data: {
        Args: never
        Returns: {
          codigo_meu_refferal: string
          lucro_acumulado: number
          nome_exibicao: string
          saldo_disponivel: number
          tarefas_hoje: number
          telefone: string
          total_comissao_equipe: number
          total_recarregado: number
          total_retirado: number
        }[]
      }
      get_my_bank_accounts_mcpn: {
        Args: never
        Returns: {
          bank_name: string
          created_at: string
          iban: string
          id: string
          owner_name: string
        }[]
      }
      get_my_purchased_products_mcpn: {
        Args: never
        Returns: {
          ativo: boolean
          data_fim: string
          data_inicio: string
          dias_restantes: number
          id: string
          preco_pago: number
          produto_imagem: string
          produto_nome: string
          renda_diaria: number
          storage_size: string
          url_download_setup: string
        }[]
      }
      get_my_recharges_mcpn: {
        Args: never
        Returns: {
          banco_origem: string
          chave_transacao: string
          created_at: string
          id: string
          status: string
          valor: number
        }[]
      }
      get_my_recharges_summary_mcpn: { Args: never; Returns: Json }
      get_my_settings_data_mcpn: {
        Args: never
        Returns: {
          invite_code: string
          phone: string
        }[]
      }
      get_my_subordinates_chat: {
        Args: { p_user_id?: string }
        Returns: {
          codigo_meu_refferal: string
          data_registro: string
          membro_id: string
          nivel: number
          nome_exibicao: string
          patrocinador_id: string
          patrocinador_telefone: string
          telefone: string
          total_recarregado: number
        }[]
      }
      get_my_withdrawals_mcpn: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          banco_destino: string
          created_at: string
          iban_snapshot: string
          id: string
          status: string
          valor_bruto: number
          valor_liquido: number
        }[]
      }
      get_sender_phone_mcpn: {
        Args: { p_detailed?: boolean; p_get_count?: boolean; p_uid?: string }
        Returns: Json
      }
      get_withdraw_info_mcpn: {
        Args: never
        Returns: {
          balance: number
          bank_id: string
          bank_name: string
          has_bank: boolean
          has_bots: boolean
          has_pending: boolean
          iban: string
          is_verified: boolean
          total_daily_income: number
        }[]
      }
      getpay: { Args: never; Returns: Json }
      getvoice_mcpn: { Args: { p_path: string }; Returns: Json }
      getwallet: { Args: never; Returns: Json }
      process_withdrawal_request: {
        Args: { p_amount: number; p_bank_id?: string; p_password?: string }
        Returns: Json
      }
      redeem_coupon_mcpn: {
        Args: { p_action?: string; p_code?: string }
        Returns: Json
      }
      remove_bank_account_mcpn: { Args: { p_id: string }; Returns: Json }
      request_recharge_kz_mcpn: {
        Args: { p_amount: number; p_bank_id?: string }
        Returns: Json
      }
      save_bank_data_mcpn: {
        Args: { p_bank_name: string; p_holder_name: string; p_iban: string }
        Returns: Json
      }
      save_webpush_subscription_mcpn: {
        Args: {
          p_endpoint: string
          p_keys_auth: string
          p_keys_p256dh: string
          p_user_agent?: string
        }
        Returns: Json
      }
      secure_registration_mcpn: {
        Args: { p_device_id?: string; p_invite_code: string; p_phone: string }
        Returns: Json
      }
      toggle_chat_message_reaction_mcpn: {
        Args: { p_emoji: string; p_message_id: number }
        Returns: Json
      }
      update_my_profile_mcpn: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_nome_exibicao?: string
        }
        Returns: Json
      }
    }
    Enums: {
      status_verificacao_type: "pendente" | "aprovado" | "rejeitado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_verificacao_type: ["pendente", "aprovado", "rejeitado"],
    },
  },
} as const
