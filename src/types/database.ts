export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          plan: string
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: string
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          tenant_id: string
          full_name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      roles: {
        Row: {
          id: string
          tenant_id: string
          name: string
          permissions: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          permissions?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          tenant_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          tenant_id: string
          assigned_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>
      }
      departments: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['departments']['Insert']>
      }
      doctors: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          department_id: string | null
          specialization: string
          license_number: string
          qualification: string | null
          experience_years: number
          consultation_fee: number
          avg_consultation_min: number
          bio: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          department_id?: string | null
          specialization: string
          license_number: string
          qualification?: string | null
          experience_years?: number
          consultation_fee?: number
          avg_consultation_min?: number
          bio?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['doctors']['Insert']>
      }
      doctor_schedules: {
        Row: {
          id: string
          tenant_id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_min: number
          max_patients: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_min?: number
          max_patients?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['doctor_schedules']['Insert']>
      }
      doctor_leaves: {
        Row: {
          id: string
          tenant_id: string
          doctor_id: string
          leave_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          doctor_id: string
          leave_date: string
          reason?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['doctor_leaves']['Insert']>
      }
      patients: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          patient_code: string
          full_name: string
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          phone: string
          email: string | null
          address: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          allergies: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          patient_code: string
          full_name: string
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          phone: string
          email?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          allergies?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['patients']['Insert']>
      }
      appointments: {
        Row: {
          id: string
          tenant_id: string
          patient_id: string
          doctor_id: string
          department_id: string | null
          appointment_date: string
          slot_start: string
          slot_end: string
          status: string
          type: string
          token_number: number | null
          notes: string | null
          cancellation_reason: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          patient_id: string
          doctor_id: string
          department_id?: string | null
          appointment_date: string
          slot_start: string
          slot_end: string
          status?: string
          type?: string
          token_number?: number | null
          notes?: string | null
          cancellation_reason?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }
      queue_entries: {
        Row: {
          id: string
          tenant_id: string
          appointment_id: string
          patient_id: string
          doctor_id: string
          queue_date: string
          token_number: number
          status: string
          priority: number
          checked_in_at: string | null
          called_at: string | null
          started_at: string | null
          completed_at: string | null
          wait_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          appointment_id: string
          patient_id: string
          doctor_id: string
          queue_date?: string
          token_number: number
          status?: string
          priority?: number
          checked_in_at?: string | null
          called_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          wait_minutes?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['queue_entries']['Insert']>
      }
      billing_invoices: {
        Row: {
          id: string
          tenant_id: string
          patient_id: string
          appointment_id: string | null
          invoice_number: string
          line_items: Json
          subtotal: number
          discount: number
          tax: number
          total: number
          status: string
          payment_method: string | null
          notes: string | null
          due_date: string | null
          paid_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          patient_id: string
          appointment_id?: string | null
          invoice_number: string
          line_items?: Json
          subtotal?: number
          discount?: number
          tax?: number
          total?: number
          status?: string
          payment_method?: string | null
          notes?: string | null
          due_date?: string | null
          paid_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['billing_invoices']['Insert']>
      }
      prescriptions: {
        Row: {
          id: string
          tenant_id: string
          appointment_id: string
          doctor_id: string
          patient_id: string
          diagnosis: string | null
          medicines: Json
          instructions: string | null
          follow_up_date: string | null
          issued_at: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          appointment_id: string
          doctor_id: string
          patient_id: string
          diagnosis?: string | null
          medicines?: Json
          instructions?: string | null
          follow_up_date?: string | null
          issued_at?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['prescriptions']['Insert']>
      }
      medical_records: {
        Row: {
          id: string
          tenant_id: string
          patient_id: string
          appointment_id: string | null
          record_type: string
          title: string
          content: string | null
          attachments: Json
          recorded_by: string | null
          recorded_at: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          patient_id: string
          appointment_id?: string | null
          record_type: string
          title: string
          content?: string | null
          attachments?: Json
          recorded_by?: string | null
          recorded_at?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['medical_records']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          type: string
          title: string
          body: string
          data: Json
          channel: string
          is_read: boolean
          sent_at: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          type: string
          title: string
          body: string
          data?: Json
          channel?: string
          is_read?: boolean
          sent_at?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}