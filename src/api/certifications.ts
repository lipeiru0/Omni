import { apiClient } from './client'

import type {
  PersonalCertification,
  SubmitPersonalCertificationRequest,
  UploadResponse,
} from '@/types/certification'

export async function getPersonalCertification(): Promise<PersonalCertification> {
  const { data } = await apiClient.get<PersonalCertification>('/api/v1/certifications/personal')
  return data
}

export async function submitPersonalCertification(
  payload: SubmitPersonalCertificationRequest,
): Promise<PersonalCertification> {
  const { data } = await apiClient.post<PersonalCertification>(
    '/api/v1/certifications/personal',
    payload,
  )
  return data
}

export async function uploadCertificationImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<UploadResponse | string>('/api/v1/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (typeof data === 'string' && data) return data
  if (typeof data === 'object' && data) {
    const url = data.url || data.file_url || data.path
    if (url) return url
  }
  throw new Error('上传成功，但服务端未返回文件地址。')
}
