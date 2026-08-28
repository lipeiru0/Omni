export type CertificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type PersonalIdType = 'id_card' | 'passport' | 'driver_license'

export interface PersonalCertification {
  id?: string
  user_id?: string
  name?: string
  id_type?: PersonalIdType | string
  nationality?: string | null
  dob?: string | null
  id_image_front?: string | null
  id_image_back?: string | null
  selfie?: string | null
  status: CertificationStatus
  reject_reason?: string | null
  reviewed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface SubmitPersonalCertificationRequest {
  name: string
  id_type: PersonalIdType
  id_number: string
  nationality?: string
  dob?: string
  id_image_front: string
  id_image_back?: string
  selfie: string
}

export interface UploadResponse {
  url?: string
  file_url?: string
  path?: string
}
