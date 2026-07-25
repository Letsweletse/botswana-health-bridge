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
      admin_notifications: {
        Row: {
          clinic_name: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          profile_id: string | null
          read: boolean
          role: string | null
          title: string
          type: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          profile_id?: string | null
          read?: boolean
          role?: string | null
          title: string
          type?: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          profile_id?: string | null
          read?: boolean
          role?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chekameds_facilities: {
        Row: {
          address: string | null
          area: string | null
          can_receive_reservations: boolean
          checked_by: string | null
          checked_date: string | null
          city_town: string | null
          created_at: string
          disclaimer: string | null
          email: string | null
          facility_name: string
          facility_slug: string
          facility_type: string | null
          geocode_status: string | null
          google_maps_url: string | null
          id: string
          latitude: number | null
          listing_status: string
          longitude: number | null
          map_import_ready: boolean
          notes: string | null
          phone_whatsapp: string | null
          public_note: string | null
          source: string
          stock_visibility: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          can_receive_reservations?: boolean
          checked_by?: string | null
          checked_date?: string | null
          city_town?: string | null
          created_at?: string
          disclaimer?: string | null
          email?: string | null
          facility_name: string
          facility_slug: string
          facility_type?: string | null
          geocode_status?: string | null
          google_maps_url?: string | null
          id?: string
          latitude?: number | null
          listing_status?: string
          longitude?: number | null
          map_import_ready?: boolean
          notes?: string | null
          phone_whatsapp?: string | null
          public_note?: string | null
          source?: string
          stock_visibility?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          can_receive_reservations?: boolean
          checked_by?: string | null
          checked_date?: string | null
          city_town?: string | null
          created_at?: string
          disclaimer?: string | null
          email?: string | null
          facility_name?: string
          facility_slug?: string
          facility_type?: string | null
          geocode_status?: string | null
          google_maps_url?: string | null
          id?: string
          latitude?: number | null
          listing_status?: string
          longitude?: number | null
          map_import_ready?: boolean
          notes?: string | null
          phone_whatsapp?: string | null
          public_note?: string | null
          source?: string
          stock_visibility?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      chekameds_orders: {
        Row: {
          amount: number | null
          checkout_url: string | null
          chekapay_session_id: string | null
          chekapay_signing_secret: string | null
          created_at: string | null
          customer_phone: string
          description: string | null
          id: string
          location: string | null
          medicine_name: string
          paid_at: string | null
          pharmacy_contact: string | null
          pharmacy_name: string | null
          quantity: number | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          checkout_url?: string | null
          chekapay_session_id?: string | null
          chekapay_signing_secret?: string | null
          created_at?: string | null
          customer_phone: string
          description?: string | null
          id?: string
          location?: string | null
          medicine_name: string
          paid_at?: string | null
          pharmacy_contact?: string | null
          pharmacy_name?: string | null
          quantity?: number | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          checkout_url?: string | null
          chekapay_session_id?: string | null
          chekapay_signing_secret?: string | null
          created_at?: string | null
          customer_phone?: string
          description?: string | null
          id?: string
          location?: string | null
          medicine_name?: string
          paid_at?: string | null
          pharmacy_contact?: string | null
          pharmacy_name?: string | null
          quantity?: number | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chekameds_sessions: {
        Row: {
          directions_link: string | null
          phone: string
          search_results: Json | null
          selected_contact: string | null
          selected_location: string | null
          selected_medicine: string | null
          selected_pharmacy: string | null
          selected_price: number | null
          selected_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          directions_link?: string | null
          phone: string
          search_results?: Json | null
          selected_contact?: string | null
          selected_location?: string | null
          selected_medicine?: string | null
          selected_pharmacy?: string | null
          selected_price?: number | null
          selected_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          directions_link?: string | null
          phone?: string
          search_results?: Json | null
          selected_contact?: string | null
          selected_location?: string | null
          selected_medicine?: string | null
          selected_pharmacy?: string | null
          selected_price?: number | null
          selected_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clinic_inventory: {
        Row: {
          atc_code: string | null
          atc_description: string | null
          brand_name: string | null
          category: string | null
          clinic_name: string | null
          contact: string | null
          directions_link: string | null
          dosage_form: string | null
          facility_level: string | null
          generic_name: string | null
          id: string
          last_verified_at: string | null
          location: string | null
          med_name: string | null
          pack_size: string | null
          price_bwp: number | null
          quantity: number | null
          search_tokens: string | null
          strength: string | null
          trend: string | null
          updated_at: string | null
        }
        Insert: {
          atc_code?: string | null
          atc_description?: string | null
          brand_name?: string | null
          category?: string | null
          clinic_name?: string | null
          contact?: string | null
          directions_link?: string | null
          dosage_form?: string | null
          facility_level?: string | null
          generic_name?: string | null
          id?: string
          last_verified_at?: string | null
          location?: string | null
          med_name?: string | null
          pack_size?: string | null
          price_bwp?: number | null
          quantity?: number | null
          search_tokens?: string | null
          strength?: string | null
          trend?: string | null
          updated_at?: string | null
        }
        Update: {
          atc_code?: string | null
          atc_description?: string | null
          brand_name?: string | null
          category?: string | null
          clinic_name?: string | null
          contact?: string | null
          directions_link?: string | null
          dosage_form?: string | null
          facility_level?: string | null
          generic_name?: string | null
          id?: string
          last_verified_at?: string | null
          location?: string | null
          med_name?: string | null
          pack_size?: string | null
          price_bwp?: number | null
          quantity?: number | null
          search_tokens?: string | null
          strength?: string | null
          trend?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consultant_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          facility_id: string | null
          id: string
          note: string
          request_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          facility_id?: string | null
          id?: string
          note: string
          request_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          facility_id?: string | null
          id?: string
          note?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "consultant_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_requests: {
        Row: {
          age_group: string | null
          allergies: string | null
          assigned_facility_id: string | null
          assigned_facility_name: string | null
          consultation_mode: string | null
          consultation_status: string | null
          consultation_type: string | null
          created_at: string | null
          emergency_flags: Json | null
          existing_conditions: string | null
          full_name: string | null
          id: string
          is_emergency: boolean | null
          location: string | null
          phone: string | null
          preferred_facility_id: string | null
          preferred_facility_name: string | null
          pregnancy_status: string | null
          prescription_url: string | null
          request_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          symptom_duration: string | null
          symptoms: string
          updated_at: string | null
          video_room_created_at: string | null
          video_room_expires_at: string | null
          video_room_url: string | null
        }
        Insert: {
          age_group?: string | null
          allergies?: string | null
          assigned_facility_id?: string | null
          assigned_facility_name?: string | null
          consultation_mode?: string | null
          consultation_status?: string | null
          consultation_type?: string | null
          created_at?: string | null
          emergency_flags?: Json | null
          existing_conditions?: string | null
          full_name?: string | null
          id?: string
          is_emergency?: boolean | null
          location?: string | null
          phone?: string | null
          preferred_facility_id?: string | null
          preferred_facility_name?: string | null
          pregnancy_status?: string | null
          prescription_url?: string | null
          request_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          symptom_duration?: string | null
          symptoms: string
          updated_at?: string | null
          video_room_created_at?: string | null
          video_room_expires_at?: string | null
          video_room_url?: string | null
        }
        Update: {
          age_group?: string | null
          allergies?: string | null
          assigned_facility_id?: string | null
          assigned_facility_name?: string | null
          consultation_mode?: string | null
          consultation_status?: string | null
          consultation_type?: string | null
          created_at?: string | null
          emergency_flags?: Json | null
          existing_conditions?: string | null
          full_name?: string | null
          id?: string
          is_emergency?: boolean | null
          location?: string | null
          phone?: string | null
          preferred_facility_id?: string | null
          preferred_facility_name?: string | null
          pregnancy_status?: string | null
          prescription_url?: string | null
          request_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          symptom_duration?: string | null
          symptoms?: string
          updated_at?: string | null
          video_room_created_at?: string | null
          video_room_expires_at?: string | null
          video_room_url?: string | null
        }
        Relationships: []
      }
      corrective_actions: {
        Row: {
          action_title: string
          created_at: string
          department: string
          due_date: string
          id: string
          incident_id: string
          owner: string
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          action_title: string
          created_at?: string
          department: string
          due_date: string
          id?: string
          incident_id: string
          owner: string
          priority: string
          status: string
          updated_at?: string
        }
        Update: {
          action_title?: string
          created_at?: string
          department?: string
          due_date?: string
          id?: string
          incident_id?: string
          owner?: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          area: string | null
          can_receive_reservations: boolean
          city: string | null
          created_at: string | null
          disclaimer: string | null
          email: string | null
          facility_type: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          public_note: string | null
          source: string | null
          status: string
          stock_visibility: boolean
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          can_receive_reservations?: boolean
          city?: string | null
          created_at?: string | null
          disclaimer?: string | null
          email?: string | null
          facility_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          public_note?: string | null
          source?: string | null
          status?: string
          stock_visibility?: boolean
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          can_receive_reservations?: boolean
          city?: string | null
          created_at?: string | null
          disclaimer?: string | null
          email?: string | null
          facility_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          public_note?: string | null
          source?: string | null
          status?: string
          stock_visibility?: boolean
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      facility_requests: {
        Row: {
          city: string | null
          created_at: string | null
          facility_id: string | null
          id: string
          medicine_searched: string | null
          user_phone: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          medicine_searched?: string | null
          user_phone?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          medicine_searched?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_searches: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          query: string
          source: string | null
          user_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          query: string
          source?: string | null
          user_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          query?: string
          source?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      incident_timeline_events: {
        Row: {
          created_at: string
          event_at: string
          event_by: string
          id: string
          incident_id: string
          note: string
        }
        Insert: {
          created_at?: string
          event_at: string
          event_by: string
          id?: string
          incident_id: string
          note: string
        }
        Update: {
          created_at?: string
          event_at?: string
          event_by?: string
          id?: string
          incident_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_timeline_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          ai_recommendation: string | null
          ai_summary: string | null
          assigned_to: string | null
          category: string
          created_at: string
          date_closed: string | null
          date_reported: string
          department: string
          description: string
          id: string
          incident_type: string
          location: string
          reference_no: string
          reporter_name: string
          reporter_phone: string | null
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_recommendation?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          category: string
          created_at?: string
          date_closed?: string | null
          date_reported?: string
          department: string
          description: string
          id?: string
          incident_type: string
          location: string
          reference_no: string
          reporter_name: string
          reporter_phone?: string | null
          severity: string
          source: string
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_recommendation?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          date_closed?: string | null
          date_reported?: string
          department?: string
          description?: string
          id?: string
          incident_type?: string
          location?: string
          reference_no?: string
          reporter_name?: string
          reporter_phone?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      medicine_aliases: {
        Row: {
          alias: string
          canonical_name: string
          created_at: string | null
          id: string
          notes: string | null
        }
        Insert: {
          alias: string
          canonical_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          alias?: string
          canonical_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      medicine_delivery_requests: {
        Row: {
          created_at: string
          delivery_address: string
          delivery_fee_bwp: number | null
          delivery_pin: string | null
          driver_id: string | null
          id: string
          inventory_id: string | null
          medicine_name: string
          notes: string | null
          order_status: string
          patient_name: string
          patient_phone: string
          pharmacy_contact: string | null
          pharmacy_name: string
          proof_of_delivery_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_address: string
          delivery_fee_bwp?: number | null
          delivery_pin?: string | null
          driver_id?: string | null
          id?: string
          inventory_id?: string | null
          medicine_name: string
          notes?: string | null
          order_status?: string
          patient_name: string
          patient_phone: string
          pharmacy_contact?: string | null
          pharmacy_name: string
          proof_of_delivery_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_address?: string
          delivery_fee_bwp?: number | null
          delivery_pin?: string | null
          driver_id?: string | null
          id?: string
          inventory_id?: string | null
          medicine_name?: string
          notes?: string | null
          order_status?: string
          patient_name?: string
          patient_phone?: string
          pharmacy_contact?: string | null
          pharmacy_name?: string
          proof_of_delivery_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_requests: {
        Row: {
          amount: number | null
          created_at: string | null
          from_number: string | null
          id: string
          medicine: string
          notes: string | null
          payment_status: string | null
          pharmacy: string
          pickup_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          from_number?: string | null
          id?: string
          medicine: string
          notes?: string | null
          payment_status?: string | null
          pharmacy: string
          pickup_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          from_number?: string | null
          id?: string
          medicine?: string
          notes?: string | null
          payment_status?: string | null
          pharmacy?: string
          pickup_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          approved_at: string | null
          clinic_name: string | null
          contact: string | null
          created_at: string | null
          email: string | null
          id: string
          payment_required: boolean | null
          status: string | null
          subscription_status: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
          user_id: string | null
          visible_in_search: boolean | null
        }
        Insert: {
          approved_at?: string | null
          clinic_name?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          payment_required?: boolean | null
          status?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible_in_search?: boolean | null
        }
        Update: {
          approved_at?: string | null
          clinic_name?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          payment_required?: boolean | null
          status?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible_in_search?: boolean | null
        }
        Relationships: []
      }
      pharmacy_user_access: {
        Row: {
          created_at: string
          id: string
          pharmacy_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pharmacy_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pharmacy_name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          approved: boolean | null
          approved_at: string | null
          avatar_url: string | null
          business: string | null
          clinic_name: string | null
          contact: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          status: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          approved?: boolean | null
          approved_at?: string | null
          avatar_url?: string | null
          business?: string | null
          clinic_name?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          approved?: boolean | null
          approved_at?: string | null
          avatar_url?: string | null
          business?: string | null
          clinic_name?: string | null
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          from_number: string
          medicine: string | null
          options: Json
          selected: Json | null
          updated_at: string | null
        }
        Insert: {
          from_number: string
          medicine?: string | null
          options?: Json
          selected?: Json | null
          updated_at?: string | null
        }
        Update: {
          from_number?: string
          medicine?: string | null
          options?: Json
          selected?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          from_phone: string | null
          id: string
          message_id: string | null
          message_text: string | null
          message_type: string | null
          provider: string
          raw_payload: Json
          status: string
          to_phone: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          from_phone?: string | null
          id?: string
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          provider?: string
          raw_payload: Json
          status?: string
          to_phone?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          from_phone?: string | null
          id?: string
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          provider?: string
          raw_payload?: Json
          status?: string
          to_phone?: string | null
        }
        Relationships: []
      }
      whatsapp_webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          from_number: string | null
          id: string
          message_body: string | null
          raw_payload: Json | null
          reply_text: string | null
          response_status: number | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          from_number?: string | null
          id?: string
          message_body?: string | null
          raw_payload?: Json | null
          reply_text?: string | null
          response_status?: number | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          from_number?: string | null
          id?: string
          message_body?: string | null
          raw_payload?: Json | null
          reply_text?: string | null
          response_status?: number | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_pharmacy_inventory: {
        Row: {
          atc_code: string | null
          atc_description: string | null
          brand_name: string | null
          category: string | null
          clinic_name: string | null
          contact: string | null
          directions_link: string | null
          dosage_form: string | null
          facility_level: string | null
          generic_name: string | null
          id: string | null
          last_verified_at: string | null
          location: string | null
          med_name: string | null
          pack_size: string | null
          price_bwp: number | null
          quantity: number | null
          search_tokens: string | null
          strength: string | null
          trend: string | null
          updated_at: string | null
        }
        Insert: {
          atc_code?: string | null
          atc_description?: string | null
          brand_name?: string | null
          category?: string | null
          clinic_name?: string | null
          contact?: string | null
          directions_link?: never
          dosage_form?: string | null
          facility_level?: string | null
          generic_name?: string | null
          id?: string | null
          last_verified_at?: string | null
          location?: string | null
          med_name?: string | null
          pack_size?: string | null
          price_bwp?: number | null
          quantity?: number | null
          search_tokens?: string | null
          strength?: string | null
          trend?: string | null
          updated_at?: string | null
        }
        Update: {
          atc_code?: string | null
          atc_description?: string | null
          brand_name?: string | null
          category?: string | null
          clinic_name?: string | null
          contact?: string | null
          directions_link?: never
          dosage_form?: string | null
          facility_level?: string | null
          generic_name?: string | null
          id?: string | null
          last_verified_at?: string | null
          location?: string | null
          med_name?: string | null
          pack_size?: string | null
          price_bwp?: number | null
          quantity?: number | null
          search_tokens?: string | null
          strength?: string | null
          trend?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chekameds_public_facilities_map: {
        Row: {
          address: string | null
          area: string | null
          can_receive_reservations: boolean | null
          city_town: string | null
          disclaimer: string | null
          email: string | null
          facility_name: string | null
          facility_slug: string | null
          facility_type: string | null
          google_maps_url: string | null
          latitude: number | null
          listing_status: string | null
          longitude: number | null
          map_import_ready: boolean | null
          notes: string | null
          phone_whatsapp: string | null
          public_note: string | null
          source: string | null
          stock_visibility: boolean | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          can_receive_reservations?: boolean | null
          city_town?: string | null
          disclaimer?: string | null
          email?: string | null
          facility_name?: string | null
          facility_slug?: string | null
          facility_type?: string | null
          google_maps_url?: string | null
          latitude?: number | null
          listing_status?: string | null
          longitude?: number | null
          map_import_ready?: boolean | null
          notes?: string | null
          phone_whatsapp?: string | null
          public_note?: string | null
          source?: string | null
          stock_visibility?: boolean | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          can_receive_reservations?: boolean | null
          city_town?: string | null
          disclaimer?: string | null
          email?: string | null
          facility_name?: string | null
          facility_slug?: string | null
          facility_type?: string | null
          google_maps_url?: string | null
          latitude?: number | null
          listing_status?: string | null
          longitude?: number | null
          map_import_ready?: boolean | null
          notes?: string | null
          phone_whatsapp?: string | null
          public_note?: string | null
          source?: string | null
          stock_visibility?: boolean | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      search_medicines_smart: {
        Args: { search_term: string }
        Returns: {
          clinic_name: string
          contact: string
          directions_link: string
          dosage_form: string
          id: string
          location: string
          match_type: string
          med_name: string
          pack_size: string
          price_bwp: number
          quantity: number
          similarity_score: number
          strength: string
        }[]
      }
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
