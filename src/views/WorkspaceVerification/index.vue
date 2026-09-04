<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import {
  getPersonalCertification,
  submitPersonalCertification,
  uploadCertificationImage,
} from '@/api/certifications'
import { getErrorMessage } from '@/api/errors'
import SiteHeader from '@/components/SiteHeader.vue'
import { useAuthStore } from '@/stores/auth'
import type {
  CertificationStatus,
  PersonalCertification,
  PersonalIdType,
  SubmitPersonalCertificationRequest,
} from '@/types/certification'

type UploadKey = 'id_image_front' | 'id_image_back' | 'selfie'

interface UploadSlot {
  url: string
  preview: string
  filename: string
  uploading: boolean
}

const authStore = useAuthStore()
const loading = ref(true)
const submitting = ref(false)
const mobileMenuOpen = ref(false)
const certification = ref<PersonalCertification>({ status: 'unverified' })

const form = reactive({
  name: '',
  id_type: 'id_card' as PersonalIdType,
  id_number: '',
  nationality: '',
  dob: '',
})

const uploads = reactive<Record<UploadKey, UploadSlot>>({
  id_image_front: { url: '', preview: '', filename: '', uploading: false },
  id_image_back: { url: '', preview: '', filename: '', uploading: false },
  selfie: { url: '', preview: '', filename: '', uploading: false },
})

const primaryNav = [
  ['▦', '概览'],
  ['⌁', 'API 密钥'],
  ['▧', '素材库'],
  ['▣', '钱包'],
  ['⌗', '用量'],
  ['◴', '限流状态'],
  ['⌘', '路由设置'],
  ['↶', '退款'],
  ['▥', '组织'],
]

const idTypeOptions: { value: PersonalIdType; label: string }[] = [
  { value: 'id_card', label: '身份证' },
  { value: 'passport', label: '护照' },
  { value: 'driver_license', label: '驾驶证' },
]

const countryOptions = [
  ['CN', '中国大陆'],
  ['HK', '中国香港'],
  ['MO', '中国澳门'],
  ['TW', '中国台湾'],
  ['US', '美国'],
  ['CA', '加拿大'],
  ['GB', '英国'],
  ['AU', '澳大利亚'],
  ['JP', '日本'],
  ['KR', '韩国'],
  ['SG', '新加坡'],
  ['DE', '德国'],
  ['FR', '法国'],
]

const statusMeta = computed(() => {
  const values: Record<CertificationStatus, { label: string; note: string }> = {
    unverified: { label: '未认证', note: '提交资料后将进入人工审核' },
    pending: { label: '审核中', note: '资料已提交，请耐心等待审核结果' },
    verified: { label: '已认证', note: '你的个人实名认证已通过' },
    rejected: { label: '未通过', note: '请根据驳回原因修改资料后重新提交' },
  }
  return values[certification.value.status] || values.unverified
})

const canEdit = computed(() => ['unverified', 'rejected'].includes(certification.value.status))
const anyUploading = computed(() => Object.values(uploads).some((item) => item.uploading))
const maxDob = new Date().toISOString().slice(0, 10)

function hydrateForm(data: PersonalCertification): void {
  if (data.name) form.name = data.name
  if (idTypeOptions.some((item) => item.value === data.id_type)) {
    form.id_type = data.id_type as PersonalIdType
  }
  form.nationality = data.nationality || ''
  form.dob = data.dob || ''
  for (const key of Object.keys(uploads) as UploadKey[]) {
    const url = data[key]
    if (typeof url === 'string' && url) {
      uploads[key].url = url
      uploads[key].filename = '已上传材料'
    }
  }
}

async function loadCertification(): Promise<void> {
  loading.value = true
  try {
    const data = await getPersonalCertification()
    certification.value = data
    hydrateForm(data)
  } catch (error) {
    ElMessage.error(`无法读取认证状态：${getErrorMessage(error)}`)
  } finally {
    loading.value = false
  }
}

async function handleFileChange(key: UploadKey, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    ElMessage.warning('仅支持 JPEG、PNG 或 WebP 图片')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('单张图片不能超过 5 MB')
    return
  }

  const slot = uploads[key]
  if (slot.preview.startsWith('blob:')) URL.revokeObjectURL(slot.preview)
  slot.preview = URL.createObjectURL(file)
  slot.filename = file.name
  slot.url = ''
  slot.uploading = true
  try {
    slot.url = await uploadCertificationImage(file)
    ElMessage.success(`${file.name} 上传成功`)
  } catch (error) {
    slot.url = ''
    ElMessage.error(`图片上传失败：${getErrorMessage(error)}`)
  } finally {
    slot.uploading = false
  }
}

function validateForm(): string | null {
  if (!form.name.trim()) return '请填写与证件一致的真实姓名'
  if (!form.id_number.trim()) return '请填写证件号码'
  if (!uploads.id_image_front.url) return '请上传证件正面照片'
  if (!uploads.selfie.url) return '请上传本人自拍照片'
  if (anyUploading.value) return '请等待图片上传完成'
  return null
}

async function submit(): Promise<void> {
  const validationMessage = validateForm()
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }

  submitting.value = true
  try {
    const payload: SubmitPersonalCertificationRequest = {
      name: form.name.trim(),
      id_type: form.id_type,
      id_number: form.id_number.trim(),
      id_image_front: uploads.id_image_front.url,
      selfie: uploads.selfie.url,
      ...(form.nationality ? { nationality: form.nationality } : {}),
      ...(form.dob ? { dob: form.dob } : {}),
      ...(uploads.id_image_back.url ? { id_image_back: uploads.id_image_back.url } : {}),
    }
    certification.value = await submitPersonalCertification(payload)
    ElMessage.success('认证资料已提交，请等待审核')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadCertification()
})

onBeforeUnmount(() => {
  Object.values(uploads).forEach((item) => {
    if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview)
  })
})
</script>

<template>
  <div class="workspace-shell">
    <SiteHeader show-mobile-menu @toggle-menu="mobileMenuOpen = !mobileMenuOpen" />

    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-scroll">
        <p class="nav-heading">开发</p>
        <template v-for="item in primaryNav" :key="item[1]">
          <RouterLink v-if="item[1] === '概览'" class="side-item" to="/workspace/overview">
            <span>{{ item[0] }}</span
            >{{ item[1] }}
          </RouterLink>
          <button v-else type="button" class="side-item">
            <span>{{ item[0] }}</span
            >{{ item[1] }}
          </button>
        </template>
        <div class="nav-divider"></div>
        <p class="nav-heading">账号</p>
        <RouterLink class="side-item" to="/workspace/account"><span>◎</span>账户</RouterLink>
        <RouterLink class="side-item active" to="/workspace/verification"
          ><span>♢</span>实名认证</RouterLink
        >
        <button type="button" class="side-item"><span>♧</span>通知</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">供应商</p>
        <button type="button" class="side-item"><span>✣</span>申请成为供应商</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">分销商</p>
        <button type="button" class="side-item"><span>⌯</span>申请成为分销商</button>
      </div>
      <div class="balance-card">
        <span>可用余额</span><strong>$1.00</strong><small>含赠送额度</small><em>$1.00</em>
      </div>
    </aside>

    <main class="workspace-main" :class="{ loading }">
      <div class="breadcrumb">工作台 <span>›</span></div>
      <h1>实名认证</h1>

      <section class="content-card status-card" :class="`status-${certification.status}`">
        <div>
          <h2>认证状态</h2>
          <span class="status-value"><i></i>{{ loading ? '读取中…' : statusMeta.label }}</span>
          <p>{{ statusMeta.note }}</p>
        </div>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 4.5 6v5.2c0 4.6 3.2 8.7 7.5 9.8 4.3-1.1 7.5-5.2 7.5-9.8V6L12 3Z" />
          <path d="m8.8 12 2.1 2.1 4.4-4.5" />
        </svg>
      </section>

      <div v-if="certification.status === 'rejected'" class="reject-alert">
        <strong>审核未通过</strong>
        <p>{{ certification.reject_reason || '认证资料未通过审核，请检查后重新提交。' }}</p>
      </div>

      <section v-if="canEdit" class="content-card form-card">
        <div class="section-heading">
          <div>
            <h2>提交认证材料</h2>
            <p>请确保填写的信息与证件内容完全一致</p>
          </div>
          <span>信息将被加密保存</span>
        </div>

        <div v-if="!authStore.user?.emailVerifiedAt" class="email-warning">
          提交实名认证前，请先前往
          <RouterLink to="/workspace/account">账户设置</RouterLink> 完成邮箱验证。
        </div>

        <form class="verification-form" @submit.prevent="submit">
          <label class="field field-wide">
            <span>真实姓名 <b>*</b><small>（与证件一致）</small></span>
            <input
              v-model="form.name"
              type="text"
              maxlength="100"
              autocomplete="name"
              placeholder="请填写证件上的姓名"
              required
            />
          </label>

          <label class="field field-wide">
            <span>证件类型 <b>*</b></span>
            <select v-model="form.id_type">
              <option v-for="item in idTypeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field field-wide">
            <span>证件号码 <b>*</b></span>
            <input
              v-model="form.id_number"
              type="text"
              autocomplete="off"
              placeholder="请输入证件号码"
              required
            />
            <small class="privacy-tip">证件号码仅用于实名认证，提交后不会在页面回显</small>
          </label>

          <label class="field">
            <span>地区 <small>（可选）</small></span>
            <select v-model="form.nationality">
              <option value="">-- 请选择 --</option>
              <option v-for="item in countryOptions" :key="item[0]" :value="item[0]">
                {{ item[1] }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>出生日期 <small>（可选）</small></span>
            <input v-model="form.dob" type="date" :max="maxDob" />
          </label>

          <fieldset class="upload-section field-wide">
            <legend>证件照片上传</legend>
            <div class="upload-grid">
              <label
                v-for="item in [
                  ['id_image_front', '正面', true],
                  ['id_image_back', '背面', false],
                  ['selfie', '自拍', true],
                ] as const"
                :key="item[0]"
                class="upload-field"
              >
                <span>{{ item[1] }} <b v-if="item[2]">*</b></span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  @change="handleFileChange(item[0], $event)"
                />
                <div class="upload-box" :class="{ uploaded: uploads[item[0]].url }">
                  <img
                    v-if="uploads[item[0]].preview"
                    :src="uploads[item[0]].preview"
                    alt="所选图片预览"
                  />
                  <template v-else>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" />
                    </svg>
                    <strong>{{ uploads[item[0]].filename || '点击上传' }}</strong>
                  </template>
                  <span v-if="uploads[item[0]].uploading" class="upload-mask">上传中…</span>
                  <span v-else-if="uploads[item[0]].url" class="uploaded-badge">✓ 已上传</span>
                </div>
              </label>
            </div>
            <p>支持 JPEG / PNG / WebP，每张不超过 5 MB。请保证证件完整、清晰、无遮挡。</p>
          </fieldset>

          <button
            class="submit-button"
            type="submit"
            :disabled="submitting || anyUploading || !authStore.user?.emailVerifiedAt"
          >
            {{
              submitting
                ? '提交中…'
                : anyUploading
                  ? '图片上传中…'
                  : certification.status === 'rejected'
                    ? '重新提交审核'
                    : '提交审核'
            }}
          </button>
        </form>
      </section>

      <section v-else class="content-card submitted-card">
        <div class="submitted-icon">{{ certification.status === 'verified' ? '✓' : '⌛' }}</div>
        <h2>{{ certification.status === 'verified' ? '实名认证已完成' : '资料正在审核中' }}</h2>
        <p>
          {{
            certification.status === 'verified'
              ? '你已通过个人实名认证，可以使用需要实名身份的功能。'
              : '审核完成后会更新此页面状态，请勿重复提交认证材料。'
          }}
        </p>
        <dl v-if="certification.name">
          <div>
            <dt>认证姓名</dt>
            <dd>{{ certification.name }}</dd>
          </div>
          <div>
            <dt>证件类型</dt>
            <dd>
              {{
                idTypeOptions.find((item) => item.value === certification.id_type)?.label ||
                certification.id_type
              }}
            </dd>
          </div>
          <div v-if="certification.created_at">
            <dt>提交时间</dt>
            <dd>{{ new Date(certification.created_at).toLocaleString('zh-CN') }}</dd>
          </div>
        </dl>
        <button type="button" class="refresh-button" @click="loadCertification">刷新状态</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.workspace-shell {
  min-height: 100vh;
  color: #111a36;
  background: #f3f6fc;
}
.workspace-header {
  position: fixed;
  z-index: 30;
  inset: 0 0 auto;
  display: flex;
  height: 70px;
  align-items: center;
  padding: 0 30px;
  border-bottom: 1px solid #e5eaf4;
  background: #fff;
}
.brand {
  display: flex;
  width: 190px;
  align-items: center;
  gap: 10px;
  font-size: 17px;
}
.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: #5854f2;
  color: #fff;
  font-weight: 800;
}
.top-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
.top-nav a {
  padding: 10px 12px;
  color: #4f52e9;
  font-size: 14px;
}
.top-nav .active {
  border-radius: 9px;
  background: #f0f2ff;
}
.header-tools {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-left: auto;
  color: #667596;
  font-size: 13px;
}
.header-tools > button,
.avatar,
.menu-button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}
.account-menu {
  position: relative;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #edf0f6;
  color: #25304a;
  font-weight: 700;
}
.account-dropdown {
  position: absolute;
  z-index: 60;
  top: calc(100% + 14px);
  right: 0;
  width: 250px;
  overflow: hidden;
  border: 1px solid #e4e8f0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(32 43 70 / 16%);
}
.account-email {
  overflow: hidden;
  padding: 17px 16px;
  border-bottom: 1px solid #edf0f5;
  color: #667896;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plan-menu-item {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 13px 14px;
  margin: 8px;
  border-radius: 9px;
  background: #f1f0ff;
  color: #37348e;
}
.plan-menu-item:hover {
  background: #e9e7ff;
}
.plan-menu-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: #5957e8;
  color: #fff;
}
.plan-menu-item > span:nth-child(2) {
  display: grid;
  gap: 3px;
}
.plan-menu-item strong {
  font-size: 13px;
}
.plan-menu-item small {
  color: #7775ae;
  font-size: 10px;
  font-weight: 400;
}
.plan-menu-item b {
  font-size: 20px;
  font-weight: 400;
}
.account-dropdown-item {
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid #edf0f5;
  background: #fff;
  color: #17213a;
  cursor: pointer;
}
.logout-item {
  color: #ef3f1c;
}
.menu-button {
  display: none;
  margin-left: auto;
  font-size: 22px;
}
.sidebar {
  position: fixed;
  z-index: 20;
  top: 70px;
  bottom: 0;
  left: 0;
  display: flex;
  width: 268px;
  flex-direction: column;
  border-right: 1px solid #e1e7f1;
  background: #fff;
}
.sidebar-scroll {
  overflow-y: auto;
  padding: 20px 14px;
}
.nav-heading {
  margin: 5px 14px 8px;
  color: #98a8c8;
  font-size: 12px;
  font-weight: 700;
}
.side-item {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  gap: 13px;
  padding: 0 15px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: #587096;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}
.side-item span {
  width: 18px;
  color: #91a3c7;
  font-size: 17px;
  text-align: center;
}
.side-item:hover,
.side-item.active {
  background: #eef1ff;
  color: #4d4bea;
}
.nav-divider {
  height: 1px;
  margin: 13px 0;
  background: #e7ebf3;
}
.balance-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px;
  padding: 13px 16px;
  margin: auto 14px 14px;
  border-radius: 10px;
  background: #f3f6fc;
  font-size: 11px;
}
.balance-card small,
.balance-card em {
  color: #18a262;
  font-style: normal;
}
.workspace-main {
  width: min(920px, calc(100% - 330px));
  padding: 112px 0 70px;
  margin-left: max(300px, calc(50% - 310px));
  transition: opacity 0.2s;
}
.workspace-main.loading {
  opacity: 0.62;
}
.breadcrumb {
  color: #5454ef;
  font-size: 13px;
}
.breadcrumb span {
  margin-left: 6px;
  color: #9badcc;
}
h1 {
  margin: 24px 0 28px;
  font-size: 32px;
  letter-spacing: -0.04em;
}
.content-card {
  padding: 34px 36px;
  margin-bottom: 28px;
  border: 1px solid #dfe6f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 4px rgb(31 44 75 / 3%);
}
.content-card h2 {
  margin: 0;
  font-size: 18px;
}
.status-card {
  display: flex;
  min-height: 150px;
  align-items: center;
  justify-content: space-between;
}
.status-card h2 {
  margin-bottom: 20px;
}
.status-card p {
  margin: 8px 0 0;
  color: #8293b0;
  font-size: 13px;
}
.status-card > svg {
  width: 58px;
  height: 58px;
  fill: none;
  stroke: #c8d0e0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}
.status-value {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #8da0c3;
  font-size: 18px;
}
.status-value i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentcolor;
}
.status-pending .status-value {
  color: #e29a00;
}
.status-pending > svg {
  stroke: #e9b23c;
}
.status-verified .status-value {
  color: #13a262;
}
.status-verified > svg {
  stroke: #13a262;
}
.status-rejected .status-value {
  color: #e65038;
}
.status-rejected > svg {
  stroke: #e65038;
}
.reject-alert,
.email-warning {
  padding: 18px 20px;
  margin-bottom: 22px;
  border: 1px solid #f3b3a8;
  border-radius: 12px;
  background: #fff6f4;
  color: #c83e29;
}
.reject-alert p {
  margin: 7px 0 0;
  font-size: 13px;
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}
.section-heading h2 {
  margin-bottom: 8px;
}
.section-heading p {
  margin: 0;
  color: #8293b0;
  font-size: 13px;
}
.section-heading > span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef8f4;
  color: #17966a;
  font-size: 11px;
}
.email-warning {
  margin: 0 0 24px;
  border-color: #f1cf7d;
  background: #fff9e9;
  color: #ad6500;
  font-size: 13px;
}
.email-warning a {
  font-weight: 700;
  text-decoration: underline;
}
.verification-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 23px;
}
.field {
  display: grid;
  min-width: 0;
  gap: 9px;
  color: #61779b;
  font-size: 14px;
}
.field-wide {
  grid-column: 1 / -1;
}
.field b,
.upload-field b {
  color: #e4513b;
}
.field small {
  color: #9aa8c1;
  font-weight: 400;
}
.field input,
.field select {
  width: 100%;
  height: 54px;
  padding: 0 18px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  outline: 0;
  background: #fff;
  color: #1b2945;
}
.field input:focus,
.field select:focus {
  border-color: #5a56ee;
  box-shadow: 0 0 0 3px rgb(90 86 238 / 10%);
}
.field input::placeholder {
  color: #a5b3ce;
}
.field .privacy-tip {
  margin-top: -2px;
  color: #9aa8c1;
  font-size: 11px;
}
.upload-section {
  padding: 0;
  margin: 4px 0 0;
  border: 0;
}
.upload-section legend {
  padding: 0;
  margin-bottom: 16px;
  color: #61779b;
  font-size: 14px;
}
.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.upload-field {
  display: grid;
  gap: 9px;
  color: #7285a6;
  font-size: 13px;
  cursor: pointer;
}
.upload-field > input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.upload-box {
  position: relative;
  display: grid;
  height: 155px;
  overflow: hidden;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 2px dashed #cdd7e7;
  border-radius: 12px;
  background: #fbfcfe;
  color: #7083a6;
}
.upload-box:hover {
  border-color: #716ef0;
  background: #f8f8ff;
  color: #5754e8;
}
.upload-box svg {
  width: 31px;
  height: 31px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}
.upload-box strong {
  font-size: 13px;
  font-weight: 500;
}
.upload-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upload-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(22 31 55 / 60%);
  color: #fff;
}
.uploaded-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #17a36f;
  color: #fff;
  font-size: 11px;
}
.upload-section > p {
  margin: 13px 0 0;
  color: #8293b0;
  font-size: 12px;
}
.submit-button {
  grid-column: 1 / -1;
  width: fit-content;
  min-width: 128px;
  height: 48px;
  padding: 0 26px;
  border: 0;
  border-radius: 10px;
  background: #554ff5;
  color: #fff;
  font-weight: 650;
  cursor: pointer;
}
.submit-button:hover {
  background: #4843df;
}
.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.submitted-card {
  display: grid;
  justify-items: center;
  padding: 52px 36px;
  text-align: center;
}
.submitted-icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 50%;
  background: #eff1ff;
  color: #5753ef;
  font-size: 26px;
}
.submitted-card h2 {
  margin-bottom: 10px;
}
.submitted-card > p {
  max-width: 520px;
  margin: 0;
  color: #7385a5;
  font-size: 13px;
  line-height: 1.8;
}
.submitted-card dl {
  width: min(500px, 100%);
  padding-top: 18px;
  margin: 28px 0 0;
  border-top: 1px solid #edf0f5;
}
.submitted-card dl div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}
.submitted-card dt {
  color: #91a3c7;
}
.submitted-card dd {
  margin: 0;
}
.refresh-button {
  padding: 10px 18px;
  margin-top: 24px;
  border: 1px solid #d7ddec;
  border-radius: 9px;
  background: #fff;
  color: #5454e9;
  cursor: pointer;
}
@media (max-width: 900px) {
  .top-nav,
  .header-tools {
    display: none;
  }
  .menu-button {
    display: block;
  }
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s;
    box-shadow: 18px 0 40px rgb(35 48 82 / 12%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .workspace-main {
    width: min(100% - 32px, 720px);
    margin: 0 auto;
  }
}
@media (max-width: 620px) {
  .workspace-header {
    height: 62px;
    padding: 0 17px;
  }
  .workspace-main {
    padding-top: 94px;
  }
  .content-card {
    padding: 25px 20px;
    border-radius: 15px;
  }
  .verification-form {
    grid-template-columns: 1fr;
  }
  .field-wide {
    grid-column: auto;
  }
  .upload-section {
    grid-column: auto;
  }
  .upload-grid {
    grid-template-columns: 1fr;
  }
  .upload-box {
    height: 175px;
  }
  .section-heading {
    gap: 15px;
  }
  .section-heading > span {
    display: none;
  }
  .brand {
    width: auto;
  }
  h1 {
    font-size: 28px;
  }
}
</style>
