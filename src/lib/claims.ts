import { createClient } from '@/lib/supabase/server'

// ─── Mediscor PCN codes for BOMAID Botswana ───────────────────────────────────
export const PCN_CODES = {
  OTC:     'BOT0001O',
  ACUTE:   'BOT0001A',
  CHRONIC: 'BOT0001C',
} as const

export type ClaimType = keyof typeof PCN_CODES
export type ClaimStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'queried'
export type MedicalAidProvider = 'BOMAID' | 'BPOMAS' | 'BDF' | 'PULA'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MemberVerificationResult {
  verified: boolean
  memberName?: string
  plan?: string
  balanceBwp?: number
  error?: string
}

export interface DispensingPayload {
  pharmacyId: string
  inventoryId: string
  patientId: string
  dispensedBy: string
  medicineName: string
  genericName?: string
  nappiCode?: string
  barcode?: string
  dosageForm?: string
  strength?: string
  quantityDispensed: number
  unitPriceBwp: number
  paymentType: 'medical_aid' | 'cash' | 'split'
  claimType: ClaimType
  icd10Code?: string
  prescriptionRequired?: boolean
  prescriptionUrl?: string
  prescriberName?: string
}

export interface ClaimSubmissionResult {
  success: boolean
  claimId?: string
  claimReference?: string
  mediscorClaimId?: string
  error?: string
}

// ─── Member Verification ──────────────────────────────────────────────────────
export async function verifyMedicalAidMember(
  medicalAidNumber: string,
  provider: MedicalAidProvider
): Promise<MemberVerificationResult> {
  try {
    // In production: call Mediscor real-time verification API
    // POST https://api.mediscor.co.za/verify
    // For now: check our local medical_aid_patients table first
    const supabase = await createClient()

    const { data: patient } = await supabase
      .from('medical_aid_patients')
      .select('*')
      .eq('medical_aid_number', medicalAidNumber)
      .eq('medical_aid_provider', provider)
      .eq('verified', true)
      .single()

    if (patient) {
      return {
        verified: true,
        memberName: patient.full_name,
        plan: patient.medical_aid_plan,
        balanceBwp: 2400, // In production: fetch from Mediscor
      }
    }

    // TODO: Replace with real Mediscor API call when credentials obtained
    // const response = await fetch(process.env.MEDISCOR_API_URL + '/verify', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.MEDISCOR_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ memberNumber: medicalAidNumber, provider }),
    // })
    // const data = await response.json()
    // return { verified: data.active, memberName: data.name, plan: data.plan }

    return { verified: false, error: 'Member not found' }
  } catch (err) {
    console.error('Member verification error:', err)
    return { verified: false, error: 'Verification service unavailable' }
  }
}

// ─── Calculate Payment Split ──────────────────────────────────────────────────
export function calculatePaymentSplit(
  unitPriceBwp: number,
  quantity: number,
  claimType: ClaimType,
  plan: string = 'COMPREHENSIVE'
): { total: number; medicalAidPortion: number; patientCopay: number } {
  const total = unitPriceBwp * quantity

  // Coverage percentages by plan — update when BOMAID tariff sheet received
  const coverageRates: Record<string, Record<ClaimType, number>> = {
    PRESTIGE:      { ACUTE: 1.00, CHRONIC: 1.00, OTC: 0.80 },
    EXECUTIVE:     { ACUTE: 0.90, CHRONIC: 1.00, OTC: 0.75 },
    COMPREHENSIVE: { ACUTE: 0.80, CHRONIC: 1.00, OTC: 0.70 },
    ACCESS:        { ACUTE: 0.70, CHRONIC: 0.90, OTC: 0.50 },
  }

  const rate = coverageRates[plan]?.[claimType] ?? 0.80
  const medicalAidPortion = Math.round(total * rate * 100) / 100
  const patientCopay = Math.round((total - medicalAidPortion) * 100) / 100

  return { total, medicalAidPortion, patientCopay }
}

// ─── Create Dispensing Record ─────────────────────────────────────────────────
export async function createDispensingRecord(
  payload: DispensingPayload
): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const { medicalAidPortion, patientCopay, total } = calculatePaymentSplit(
    payload.unitPriceBwp,
    payload.quantityDispensed,
    payload.claimType
  )

  const { data, error } = await supabase
    .from('dispensing_records')
    .insert({
      pharmacy_id:          payload.pharmacyId,
      inventory_id:         payload.inventoryId,
      patient_id:           payload.patientId,
      dispensed_by:         payload.dispensedBy,
      medicine_name:        payload.medicineName,
      generic_name:         payload.genericName,
      nappi_code:           payload.nappiCode,
      barcode:              payload.barcode,
      dosage_form:          payload.dosageForm,
      strength:             payload.strength,
      quantity_dispensed:   payload.quantityDispensed,
      unit_price_bwp:       payload.unitPriceBwp,
      total_price_bwp:      total,
      payment_type:         payload.paymentType,
      medical_aid_portion_bwp: medicalAidPortion,
      patient_copay_bwp:    patientCopay,
      claim_type:           payload.claimType,
      icd10_code:           payload.icd10Code,
      prescription_required: payload.prescriptionRequired ?? false,
      prescription_url:     payload.prescriptionUrl,
      prescriber_name:      payload.prescriberName,
      status:               'dispensed',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Dispensing record error:', error)
    return null
  }

  // Deduct stock from clinic_inventory
  await supabase.rpc('decrement_inventory', {
    p_inventory_id: payload.inventoryId,
    p_quantity:     payload.quantityDispensed,
  })

  return { id: data.id }
}

// ─── Build Mediscor Claim Payload ─────────────────────────────────────────────
function buildMediscorPayload(
  dispensingId: string,
  patient: { medical_aid_number: string; full_name: string; medical_aid_plan: string },
  pharmacy: { clinic_name: string; contact: string },
  dispensing: DispensingPayload,
  claimReference: string
) {
  return {
    claimReference,
    pcnCode:          PCN_CODES[dispensing.claimType],
    providerCode:     process.env.MEDISCOR_PROVIDER_CODE ?? 'BW-PROV-001',
    memberNumber:     patient.medical_aid_number,
    memberName:       patient.full_name,
    dispensingDate:   new Date().toISOString().split('T')[0],
    medicines: [
      {
        nappiCode:    dispensing.nappiCode ?? 'UNKNOWN',
        medicineName: dispensing.medicineName,
        quantity:     dispensing.quantityDispensed,
        unitPrice:    dispensing.unitPriceBwp,
        icd10Code:    dispensing.icd10Code ?? 'Z00.0',
        claimType:    PCN_CODES[dispensing.claimType],
      },
    ],
    pharmacy: {
      name:  pharmacy.clinic_name,
      phone: pharmacy.contact,
    },
  }
}

// ─── Submit Claim to Mediscor ─────────────────────────────────────────────────
export async function submitClaimToMediscor(
  dispensingId: string,
  pharmacyId: string,
  patientId: string,
  dispensing: DispensingPayload
): Promise<ClaimSubmissionResult> {
  const supabase = await createClient()

  // Fetch pharmacy and patient details
  const [{ data: pharmacy }, { data: patient }] = await Promise.all([
    supabase.from('pharmacies').select('clinic_name, contact').eq('id', pharmacyId).single(),
    supabase.from('medical_aid_patients').select('medical_aid_number, full_name, medical_aid_plan').eq('id', patientId).single(),
  ])

  if (!pharmacy || !patient) {
    return { success: false, error: 'Pharmacy or patient not found' }
  }

  const { medicalAidPortion } = calculatePaymentSplit(
    dispensing.unitPriceBwp,
    dispensing.quantityDispensed,
    dispensing.claimType,
    patient.medical_aid_plan
  )

  const claimReference = `CK-${Date.now()}-${dispensingId.slice(0, 8).toUpperCase()}`
  const payload = buildMediscorPayload(dispensingId, patient, pharmacy, dispensing, claimReference)

  // Insert claim record as pending
  const { data: claim, error: claimError } = await supabase
    .from('medical_claims')
    .insert({
      dispensing_id:       dispensingId,
      pharmacy_id:         pharmacyId,
      patient_id:          patientId,
      claim_reference:     claimReference,
      pcn_code:            PCN_CODES[dispensing.claimType],
      claimed_amount_bwp:  medicalAidPortion,
      submitted_to:        'MEDISCOR',
      submission_payload:  payload,
      status:              'pending',
    })
    .select('id')
    .single()

  if (claimError || !claim) {
    return { success: false, error: 'Failed to create claim record' }
  }

  // TODO: Replace with real Mediscor API submission when credentials ready
  // const response = await fetch(process.env.MEDISCOR_CLAIMS_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.MEDISCOR_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(payload),
  // })
  // const result = await response.json()
  // const mediscorClaimId = result.claimId
  // const status = result.status === 'ACCEPTED' ? 'submitted' : 'rejected'

  // Simulate successful submission for now
  const mediscorClaimId = `MED-${Date.now()}`
  const status = 'submitted'

  // Update claim with submission response
  await supabase
    .from('medical_claims')
    .update({
      mediscor_claim_id:   mediscorClaimId,
      submitted_at:        new Date().toISOString(),
      submission_response: { status, mediscorClaimId },
      status,
    })
    .eq('id', claim.id)

  // Update dispensing record status
  await supabase
    .from('dispensing_records')
    .update({ status: 'claimed' })
    .eq('id', dispensingId)

  return {
    success:        true,
    claimId:        claim.id,
    claimReference,
    mediscorClaimId,
  }
}

// ─── Get Pharmacy Claims Summary ──────────────────────────────────────────────
export async function getPharmacyClaimsSummary(pharmacyId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('medical_claims')
    .select('status, claimed_amount_bwp, approved_amount_bwp, paid_at')
    .eq('pharmacy_id', pharmacyId)

  if (!data) return null

  return {
    total:     data.length,
    pending:   data.filter(c => c.status === 'pending').length,
    submitted: data.filter(c => c.status === 'submitted').length,
    approved:  data.filter(c => c.status === 'approved').length,
    rejected:  data.filter(c => c.status === 'rejected').length,
    paid:      data.filter(c => c.status === 'paid').length,
    totalClaimed: data.reduce((sum, c) => sum + (c.claimed_amount_bwp ?? 0), 0),
    totalPaid:    data.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.approved_amount_bwp ?? 0), 0),
  }
}
