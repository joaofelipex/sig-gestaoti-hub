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
      acoes_economista: {
        Row: {
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          effort: string
          estimated_savings: number
          id: string
          org_id: string
          owner: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          effort?: string
          estimated_savings?: number
          id?: string
          org_id: string
          owner?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          effort?: string
          estimated_savings?: number
          id?: string
          org_id?: string
          owner?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      alertas: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          org_id: string
          severidade: Database["public"]["Enums"]["alerta_severidade"]
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          org_id: string
          severidade?: Database["public"]["Enums"]["alerta_severidade"]
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          org_id?: string
          severidade?: Database["public"]["Enums"]["alerta_severidade"]
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ativos: {
        Row: {
          assigned_to: string | null
          created_at: string
          data_aquisicao: string | null
          departamento_id: string | null
          department_nome: string | null
          id: string
          maintenance_log: Json | null
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          observacoes: string | null
          org_id: string
          patrimonio: string | null
          responsavel_id: string | null
          specs: Json | null
          status: Database["public"]["Enums"]["ativo_status"]
          tipo: string
          updated_at: string
          valor_aquisicao: number | null
          vida_util_meses: number | null
          warranty_end: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          data_aquisicao?: string | null
          departamento_id?: string | null
          department_nome?: string | null
          id?: string
          maintenance_log?: Json | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          org_id: string
          patrimonio?: string | null
          responsavel_id?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["ativo_status"]
          tipo: string
          updated_at?: string
          valor_aquisicao?: number | null
          vida_util_meses?: number | null
          warranty_end?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          data_aquisicao?: string | null
          departamento_id?: string | null
          department_nome?: string | null
          id?: string
          maintenance_log?: Json | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          org_id?: string
          patrimonio?: string | null
          responsavel_id?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["ativo_status"]
          tipo?: string
          updated_at?: string
          valor_aquisicao?: number | null
          vida_util_meses?: number | null
          warranty_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ativos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ativos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ativos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cost_center: string | null
          created_at: string
          end_date: string | null
          id: string
          monthly_cost: number
          object: string
          org_id: string
          status: string
          supplier: string
          type: string
          updated_at: string
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_cost?: number
          object: string
          org_id: string
          status?: string
          supplier: string
          type?: string
          updated_at?: string
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_cost?: number
          object?: string
          org_id?: string
          status?: string
          supplier?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      departamentos: {
        Row: {
          centro_custo: string | null
          created_at: string
          id: string
          nome: string
          org_id: string
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          centro_custo?: string | null
          created_at?: string
          id?: string
          nome: string
          org_id: string
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          centro_custo?: string | null
          created_at?: string
          id?: string
          nome?: string
          org_id?: string
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dominios: {
        Row: {
          auto_renovacao: boolean
          created_at: string
          custo_anual: number | null
          custo_renovacao: number | null
          data_vencimento: string | null
          dns_provider: string | null
          hosting_provider: string | null
          id: string
          nome: string
          observacoes: string | null
          org_id: string
          registrar: string | null
          ssl_vencimento: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auto_renovacao?: boolean
          created_at?: string
          custo_anual?: number | null
          custo_renovacao?: number | null
          data_vencimento?: string | null
          dns_provider?: string | null
          hosting_provider?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          org_id: string
          registrar?: string | null
          ssl_vencimento?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renovacao?: boolean
          created_at?: string
          custo_anual?: number | null
          custo_renovacao?: number | null
          data_vencimento?: string | null
          dns_provider?: string | null
          hosting_provider?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          org_id?: string
          registrar?: string | null
          ssl_vencimento?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dominios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          categoria: string
          created_at: string
          id: string
          location: string | null
          min_quantity: number
          nome: string
          notes: string | null
          org_id: string
          quantity: number
          sku: string | null
          supplier: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          location?: string | null
          min_quantity?: number
          nome: string
          notes?: string | null
          org_id: string
          quantity?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          location?: string | null
          min_quantity?: number
          nome?: string
          notes?: string | null
          org_id?: string
          quantity?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventario_movimentacoes: {
        Row: {
          created_at: string
          data: string
          destination: string | null
          id: string
          invoice: string | null
          item_id: string
          item_name: string | null
          org_id: string
          quantity: number
          reason: string | null
          responsible: string | null
          tipo: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          data?: string
          destination?: string | null
          id?: string
          invoice?: string | null
          item_id: string
          item_name?: string | null
          org_id: string
          quantity: number
          reason?: string | null
          responsible?: string | null
          tipo: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          destination?: string | null
          id?: string
          invoice?: string | null
          item_id?: string
          item_name?: string | null
          org_id?: string
          quantity?: number
          reason?: string | null
          responsible?: string | null
          tipo?: string
          unit_cost?: number | null
        }
        Relationships: []
      }
      licencas: {
        Row: {
          categoria: string
          chave_ativacao: string | null
          created_at: string
          custo_mensal: number | null
          custo_unitario: number
          data_renovacao: string | null
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          org_id: string
          qtd_usuarios: number | null
          responsavel_id: string | null
          tipo: string | null
          total_licencas: number
          updated_at: string
        }
        Insert: {
          categoria?: string
          chave_ativacao?: string | null
          created_at?: string
          custo_mensal?: number | null
          custo_unitario?: number
          data_renovacao?: string | null
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          org_id: string
          qtd_usuarios?: number | null
          responsavel_id?: string | null
          tipo?: string | null
          total_licencas?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          chave_ativacao?: string | null
          created_at?: string
          custo_mensal?: number | null
          custo_unitario?: number
          data_renovacao?: string | null
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          org_id?: string
          qtd_usuarios?: number | null
          responsavel_id?: string | null
          tipo?: string | null
          total_licencas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licencas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licencas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          ativo_id: string
          created_at: string
          custo: number | null
          data_abertura: string
          data_conclusao: string | null
          descricao: string | null
          fornecedor: string | null
          id: string
          org_id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo_id: string
          created_at?: string
          custo?: number | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          org_id: string
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo_id?: string
          created_at?: string
          custo?: number | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          org_id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          ativo_id: string
          ativo_label: string | null
          created_at: string
          data: string
          from_department: string | null
          from_user: string | null
          id: string
          notes: string | null
          org_id: string
          reason: string | null
          recipient: string | null
          responsible: string | null
          term_generated: boolean | null
          tipo: string
          to_department: string | null
          to_user: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          ativo_id: string
          ativo_label?: string | null
          created_at?: string
          data?: string
          from_department?: string | null
          from_user?: string | null
          id?: string
          notes?: string | null
          org_id: string
          reason?: string | null
          recipient?: string | null
          responsible?: string | null
          term_generated?: boolean | null
          tipo: string
          to_department?: string | null
          to_user?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          ativo_id?: string
          ativo_label?: string | null
          created_at?: string
          data?: string
          from_department?: string | null
          from_user?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          reason?: string | null
          recipient?: string | null
          responsible?: string | null
          term_generated?: boolean | null
          tipo?: string
          to_department?: string | null
          to_user?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          annual_budget: number
          category: string
          cost_center: string
          created_at: string
          id: string
          notes: string | null
          org_id: string
          updated_at: string
          year: number
        }
        Insert: {
          annual_budget?: number
          category: string
          cost_center: string
          created_at?: string
          id?: string
          notes?: string | null
          org_id: string
          updated_at?: string
          year: number
        }
        Update: {
          annual_budget?: number
          category?: string
          cost_center?: string
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          categoria: Database["public"]["Enums"]["pagamento_categoria"]
          competencia: string
          created_at: string
          data_pagamento: string | null
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          org_id: string
          referencia_id: string | null
          status: Database["public"]["Enums"]["pagamento_status"]
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["pagamento_categoria"]
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          org_id: string
          referencia_id?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["pagamento_categoria"]
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          org_id?: string
          referencia_id?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          org_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_acesso: {
        Row: {
          ativo: boolean
          created_at: string
          data_concessao: string
          data_revogacao: string | null
          id: string
          nivel_acesso: string | null
          org_id: string
          recurso: string | null
          recurso_tipo: string | null
          sistema: string
          ultimo_acesso: string | null
          updated_at: string
          user_label: string | null
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_concessao?: string
          data_revogacao?: string | null
          id?: string
          nivel_acesso?: string | null
          org_id: string
          recurso?: string | null
          recurso_tipo?: string | null
          sistema: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_label?: string | null
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_concessao?: string
          data_revogacao?: string | null
          id?: string
          nivel_acesso?: string | null
          org_id?: string
          recurso?: string | null
          recurso_tipo?: string | null
          sistema?: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_label?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_acesso_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_acesso_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      riscos: {
        Row: {
          created_at: string
          id: string
          mitigation: string | null
          org_id: string
          owner: string | null
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mitigation?: string | null
          org_id: string
          owner?: string | null
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mitigation?: string | null
          org_id?: string
          owner?: string | null
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      servidores: {
        Row: {
          ambiente: string | null
          armazenamento: string | null
          contrato_fim: string | null
          cpu: string | null
          created_at: string
          custo_mensal: number | null
          equipe_responsavel: string | null
          finalidade: string | null
          id: string
          ip_publico: string | null
          nome: string
          observacoes: string | null
          org_id: string
          provedor: string | null
          ram: string | null
          regiao: string | null
          sistema_operacional: string | null
          ssl_vencimento: string | null
          status: string
          tipo: string | null
          ultimo_backup: string | null
          updated_at: string
          uptime_pct: number | null
          url_monitoramento: string | null
        }
        Insert: {
          ambiente?: string | null
          armazenamento?: string | null
          contrato_fim?: string | null
          cpu?: string | null
          created_at?: string
          custo_mensal?: number | null
          equipe_responsavel?: string | null
          finalidade?: string | null
          id?: string
          ip_publico?: string | null
          nome: string
          observacoes?: string | null
          org_id: string
          provedor?: string | null
          ram?: string | null
          regiao?: string | null
          sistema_operacional?: string | null
          ssl_vencimento?: string | null
          status?: string
          tipo?: string | null
          ultimo_backup?: string | null
          updated_at?: string
          uptime_pct?: number | null
          url_monitoramento?: string | null
        }
        Update: {
          ambiente?: string | null
          armazenamento?: string | null
          contrato_fim?: string | null
          cpu?: string | null
          created_at?: string
          custo_mensal?: number | null
          equipe_responsavel?: string | null
          finalidade?: string | null
          id?: string
          ip_publico?: string | null
          nome?: string
          observacoes?: string | null
          org_id?: string
          provedor?: string | null
          ram?: string | null
          regiao?: string | null
          sistema_operacional?: string | null
          ssl_vencimento?: string | null
          status?: string
          tipo?: string | null
          ultimo_backup?: string | null
          updated_at?: string
          uptime_pct?: number | null
          url_monitoramento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servidores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      termos_responsabilidade: {
        Row: {
          ativo_id: string
          created_at: string
          data_assinatura: string
          data_devolucao: string | null
          id: string
          observacoes: string | null
          org_id: string
          pdf_url: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          ativo_id: string
          created_at?: string
          data_assinatura?: string
          data_devolucao?: string | null
          id?: string
          observacoes?: string | null
          org_id: string
          pdf_url?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          ativo_id?: string
          created_at?: string
          data_assinatura?: string
          data_devolucao?: string | null
          id?: string
          observacoes?: string | null
          org_id?: string
          pdf_url?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "termos_responsabilidade_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_responsabilidade_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_responsabilidade_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          departamento_id: string | null
          email: string | null
          id: string
          nome: string
          org_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          departamento_id?: string | null
          email?: string | null
          id?: string
          nome: string
          org_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          departamento_id?: string | null
          email?: string | null
          id?: string
          nome?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alerta_severidade: "info" | "aviso" | "critico"
      app_role: "admin" | "gestor" | "usuario"
      ativo_status: "ativo" | "manutencao" | "estoque" | "descartado"
      pagamento_categoria:
        | "servidor"
        | "licenca"
        | "dominio"
        | "contrato"
        | "outro"
      pagamento_status: "pendente" | "pago" | "atrasado"
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
    Enums: {
      alerta_severidade: ["info", "aviso", "critico"],
      app_role: ["admin", "gestor", "usuario"],
      ativo_status: ["ativo", "manutencao", "estoque", "descartado"],
      pagamento_categoria: [
        "servidor",
        "licenca",
        "dominio",
        "contrato",
        "outro",
      ],
      pagamento_status: ["pendente", "pago", "atrasado"],
    },
  },
} as const
