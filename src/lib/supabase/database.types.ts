
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity": string,"entity_id": string | null,"id": number,"meta": NonNullable<Json>,"org_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: never,"meta"?: NonNullable<Json>,"org_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: never,"meta"?: NonNullable<Json>,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string,"org_id": string,"role": Database["public"]['Enums']["user_role"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"email": string,"expires_at": string,"id"?: string,"invited_by": string,"org_id": string,"role": Database["public"]['Enums']["user_role"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"org_id"?: string,"role"?: Database["public"]['Enums']["user_role"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_org_id_invited_by_fkey"
      columns: ["org_id","invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"leases": {
                  Row: {
                    "created_at": string,"deposit_amount_cents": number,"document_path": string | null,"due_day": number,"end_date": string | null,"id": string,"org_id": string,"rent_amount_cents": number,"start_date": string,"status": Database["public"]['Enums']["lease_status"],"tenant_id": string,"unit_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deposit_amount_cents"?: number,"document_path"?: string | null,"due_day": number,"end_date"?: string | null,"id"?: string,"org_id": string,"rent_amount_cents": number,"start_date": string,"status"?: Database["public"]['Enums']["lease_status"],"tenant_id": string,"unit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deposit_amount_cents"?: number,"document_path"?: string | null,"due_day"?: number,"end_date"?: string | null,"id"?: string,"org_id"?: string,"rent_amount_cents"?: number,"start_date"?: string,"status"?: Database["public"]['Enums']["lease_status"],"tenant_id"?: string,"unit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leases_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leases_org_id_tenant_id_fkey"
      columns: ["org_id","tenant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "leases_org_id_unit_id_fkey"
      columns: ["org_id","unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"maintenance_requests": {
                  Row: {
                    "ai_category": Database["public"]['Enums']["request_category"] | null,"ai_priority": Database["public"]['Enums']["request_priority"] | null,"ai_reason": string | null,"assigned_to": string | null,"category": Database["public"]['Enums']["request_category"] | null,"created_at": string,"description": string,"id": string,"org_id": string,"priority": Database["public"]['Enums']["request_priority"] | null,"status": Database["public"]['Enums']["request_status"],"tenant_id": string,"title": string,"unit_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_category"?: Database["public"]['Enums']["request_category"] | null,"ai_priority"?: Database["public"]['Enums']["request_priority"] | null,"ai_reason"?: string | null,"assigned_to"?: string | null,"category"?: Database["public"]['Enums']["request_category"] | null,"created_at"?: string,"description": string,"id"?: string,"org_id": string,"priority"?: Database["public"]['Enums']["request_priority"] | null,"status"?: Database["public"]['Enums']["request_status"],"tenant_id": string,"title": string,"unit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "ai_category"?: Database["public"]['Enums']["request_category"] | null,"ai_priority"?: Database["public"]['Enums']["request_priority"] | null,"ai_reason"?: string | null,"assigned_to"?: string | null,"category"?: Database["public"]['Enums']["request_category"] | null,"created_at"?: string,"description"?: string,"id"?: string,"org_id"?: string,"priority"?: Database["public"]['Enums']["request_priority"] | null,"status"?: Database["public"]['Enums']["request_status"],"tenant_id"?: string,"title"?: string,"unit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_requests_org_id_assigned_to_fkey"
      columns: ["org_id","assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "maintenance_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_requests_org_id_tenant_id_fkey"
      columns: ["org_id","tenant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "maintenance_requests_org_id_unit_id_fkey"
      columns: ["org_id","unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"link": string | null,"org_id": string,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"org_id": string,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"org_id"?: string,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_org_id_user_id_fkey"
      columns: ["org_id","user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"org_id": string,"paid_at": string | null,"rent_charge_id": string,"status": Database["public"]['Enums']["payment_status"],"stripe_payment_intent": string | null,"stripe_session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"org_id": string,"paid_at"?: string | null,"rent_charge_id": string,"status"?: Database["public"]['Enums']["payment_status"],"stripe_payment_intent"?: string | null,"stripe_session_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"org_id"?: string,"paid_at"?: string | null,"rent_charge_id"?: string,"status"?: Database["public"]['Enums']["payment_status"],"stripe_payment_intent"?: string | null,"stripe_session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_org_id_rent_charge_id_fkey"
      columns: ["org_id","rent_charge_id"]
isOneToOne: false
      referencedRelation: "rent_charges"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"org_id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"org_id": string,"phone"?: string | null,"role": Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"org_id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"properties": {
                  Row: {
                    "address_line": string,"city": string,"country": string,"created_at": string,"id": string,"manager_id": string | null,"name": string,"org_id": string,"postcode": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"city": string,"country": string,"created_at"?: string,"id"?: string,"manager_id"?: string | null,"name": string,"org_id": string,"postcode": string,"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string,"city"?: string,"country"?: string,"created_at"?: string,"id"?: string,"manager_id"?: string | null,"name"?: string,"org_id"?: string,"postcode"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_org_id_manager_id_fkey"
      columns: ["org_id","manager_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"rent_charges": {
                  Row: {
                    "amount_cents": number,"created_at": string,"due_date": string,"id": string,"lease_id": string,"org_id": string,"period_month": string,"status": Database["public"]['Enums']["rent_charge_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"due_date": string,"id"?: string,"lease_id": string,"org_id": string,"period_month": string,"status"?: Database["public"]['Enums']["rent_charge_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"due_date"?: string,"id"?: string,"lease_id"?: string,"org_id"?: string,"period_month"?: string,"status"?: Database["public"]['Enums']["rent_charge_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rent_charges_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rent_charges_org_id_lease_id_fkey"
      columns: ["org_id","lease_id"]
isOneToOne: false
      referencedRelation: "leases"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"request_photos": {
                  Row: {
                    "created_at": string,"id": string,"org_id": string,"request_id": string,"storage_path": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"org_id": string,"request_id": string,"storage_path": string,"uploaded_by": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"org_id"?: string,"request_id"?: string,"storage_path"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_photos_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_photos_org_id_request_id_fkey"
      columns: ["org_id","request_id"]
isOneToOne: false
      referencedRelation: "maintenance_requests"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "request_photos_org_id_uploaded_by_fkey"
      columns: ["org_id","uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"request_updates": {
                  Row: {
                    "author_id": string,"created_at": string,"id": string,"note": string | null,"org_id": string,"request_id": string,"status": Database["public"]['Enums']["request_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"created_at"?: string,"id"?: string,"note"?: string | null,"org_id": string,"request_id": string,"status"?: Database["public"]['Enums']["request_status"] | null
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"id"?: string,"note"?: string | null,"org_id"?: string,"request_id"?: string,"status"?: Database["public"]['Enums']["request_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_updates_org_id_author_id_fkey"
      columns: ["org_id","author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["org_id","id"]
    },{
      foreignKeyName: "request_updates_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_updates_org_id_request_id_fkey"
      columns: ["org_id","request_id"]
isOneToOne: false
      referencedRelation: "maintenance_requests"
      referencedColumns: ["org_id","id"]
    }
                  ]
                },"units": {
                  Row: {
                    "bathrooms": number,"bedrooms": number,"created_at": string,"id": string,"label": string,"org_id": string,"property_id": string,"rent_amount_cents": number,"status": Database["public"]['Enums']["unit_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bathrooms"?: number,"bedrooms"?: number,"created_at"?: string,"id"?: string,"label": string,"org_id": string,"property_id": string,"rent_amount_cents": number,"status"?: Database["public"]['Enums']["unit_status"],"updated_at"?: string
                  }
                  Update: {
                    "bathrooms"?: number,"bedrooms"?: number,"created_at"?: string,"id"?: string,"label"?: string,"org_id"?: string,"property_id"?: string,"rent_amount_cents"?: number,"status"?: Database["public"]['Enums']["unit_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "units_org_id_property_id_fkey"
      columns: ["org_id","property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["org_id","id"]
    }
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
            "lease_status": "active"|"ended","payment_status": "pending"|"succeeded"|"failed"|"refunded","rent_charge_status": "due"|"paid"|"overdue","request_category": "plumbing"|"electrical"|"heating"|"appliance"|"pest"|"structural"|"other","request_priority": "emergency"|"high"|"normal"|"low","request_status": "open"|"assigned"|"in_progress"|"done"|"cancelled","unit_status": "vacant"|"occupied","user_role": "admin"|"manager"|"tenant"|"staff"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "lease_status": ["active", "ended"],"payment_status": ["pending", "succeeded", "failed", "refunded"],"rent_charge_status": ["due", "paid", "overdue"],"request_category": ["plumbing", "electrical", "heating", "appliance", "pest", "structural", "other"],"request_priority": ["emergency", "high", "normal", "low"],"request_status": ["open", "assigned", "in_progress", "done", "cancelled"],"unit_status": ["vacant", "occupied"],"user_role": ["admin", "manager", "tenant", "staff"]
          }
        }
} as const
