<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPersonalCertification,
  submitPersonalCertification,
  uploadCertificationImage,
} from '@/api/certifications'
import { getErrorMessage } from '@/api/errors'
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
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const mobileMenuOpen = ref(false)
const accountMenuOpen = ref(false)
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
  ['◇', '我的套餐'],
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

async function logout(): Promise<void> {
  accountMenuOpen.value = false
  await authStore.logoutFromServer()
  await router.replace('/login')
}

function closeMenus(): void {
  accountMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closeMenus)
  void loadCertification()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
  Object.values(uploads).forEach((item) => {
    if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview)
  })
})
</script>

<template>
  <div class="workspace-shell">
    <header class="workspace-header">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">O</span><strong>OmniMind</strong>
      </RouterLink>
      <nav class="top-nav" aria-label="顶部导航">
        <a href="#">套餐</a><a href="#">模型</a><a href="#">体验</a>
        <RouterLink class="active" to="/workspace">工作台</RouterLink>
        <a href="#">文档</a><a href="#">合作</a>
      </nav>
      <div class="header-tools">
        <button type="button" aria-label="切换主题">☾</button>
        <button type="button">◎ UTC+8</button><button type="button">中</button
        ><button type="button">♧</button>
        <div class="account-menu" @click.stop>
          <button class="avatar" type="button" @click="accountMenuOpen = !accountMenuOpen">
            {{ authStore.user?.email?.slice(0, 1).toUpperCase() || 'O' }}
          </button>
          <div v-if="accountMenuOpen" class="account-dropdown">
            <div class="account-email">{{ authStore.user?.email || '未知账号' }}</div>
            <RouterLink class="account-dropdown-item" to="/workspace/account">账号设置</RouterLink>
            <button class="account-dropdown-item logout-item" type="button" @click="logout">
              退出登录
            </button>
          </div>
        </div>
      </div>
      <button class="menu-button" type="button" @click="mobileMenuOpen = !mobileMenuOpen">
        ☰
      </button>
    </header>

    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-scroll">
        <p class="nav-heading">开发</p>
        <button v-for="item in primaryNav" :key="item[1]" type="button" class="side-item">
          <span>{{ item[0] }}</span
          >{{ item[1] }}
        </button>
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
      <div class="breadcrumb">
        <RouterLink to="/workspace">工作台</RouterLink><span>/</span>身份中心
      </div>

      <section class="identity-hero" :class="`status-${certification.status}`">
        <div class="hero-copy">
          <span class="eyebrow">IDENTITY CENTER</span>
          <h1>让身份成为<br /><em>你的信任凭证</em></h1>
          <p>一次认证，安全解锁更多平台能力。你的敏感信息将被加密存储。</p>
          <div class="hero-status">
            <span class="status-dot"></span>
            <div>
              <small>当前状态</small>
              <strong>{{ loading ? '正在同步' : statusMeta.label }}</strong>
            </div>
            <span class="status-note">{{ statusMeta.note }}</span>
          </div>
        </div>
        <div class="identity-visual" aria-hidden="true">
          <span class="orbit orbit-one"></span>
          <span class="orbit orbit-two"></span>
          <div class="identity-chip">
            <span class="chip-shine"></span>
            <svg viewBox="0 0 48 48">
              <path d="M24 5 9 11v10.5C9 30.7 15.4 38.8 24 41c8.6-2.2 15-10.3 15-19.5V11L24 5Z" />
              <path d="m17.6 23.2 4.2 4.2 8.8-9" />
            </svg>
            <span>OMNI VERIFIED</span>
            <small>SECURE ID · {{ certification.status.toUpperCase() }}</small>
          </div>
        </div>
      </section>

      <div v-if="certification.status === 'rejected'" class="reject-alert">
        <span class="alert-mark">!</span>
        <div>
          <strong>资料需要调整</strong>
          <p>{{ certification.reject_reason || '认证资料未通过审核，请检查后重新提交。' }}</p>
        </div>
      </div>

      <div v-if="canEdit" class="verification-layout">
        <aside class="process-panel">
          <span class="panel-kicker">认证流程</span>
          <h2>三步建立可信身份</h2>
          <ol class="process-list">
            <li class="active">
              <span>01</span>
              <div><strong>填写身份信息</strong><small>需与证件内容一致</small></div>
            </li>
            <li :class="{ active: uploads.id_image_front.url || uploads.selfie.url }">
              <span>02</span>
              <div><strong>上传证明材料</strong><small>清晰、完整、无遮挡</small></div>
            </li>
            <li :class="{ active: submitting }">
              <span>03</span>
              <div><strong>提交人工审核</strong><small>结果会同步到此页面</small></div>
            </li>
          </ol>
          <div class="security-note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
            </svg>
            <div>
              <strong>隐私安全承诺</strong>
              <p>证件号码提交后不再回显，材料仅用于身份审核。</p>
            </div>
          </div>
        </aside>

        <section class="form-panel">
          <div class="form-intro">
            <div>
              <span class="panel-kicker">{{
                certification.status === 'rejected' ? '重新提交' : '开始认证'
              }}</span>
              <h2>个人认证资料</h2>
              <p>带 <b>*</b> 的项目为必填项</p>
            </div>
            <span class="encrypted-badge">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 5 6v5c0 4.3 2.9 8 7 9.2 4.1-1.2 7-4.9 7-9.2V6l-7-3Z" />
              </svg>
              端到端加密
            </span>
          </div>

          <div v-if="!authStore.user?.emailVerifiedAt" class="email-warning">
            <span>✦</span>
            <p>
              提交前需要完成邮箱验证。请前往
              <RouterLink to="/workspace/account">账户设置</RouterLink> 验证邮箱。
            </p>
          </div>

          <form class="verification-form" @submit.prevent="submit">
            <section class="form-section">
              <header class="form-section-title">
                <span>01</span>
                <div>
                  <h3>基础身份</h3>
                  <p>填写证件上真实、有效的信息</p>
                </div>
              </header>
              <div class="fields-grid">
                <label class="field field-wide">
                  <span>真实姓名 <b>*</b></span>
                  <div class="control">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5.5 20c.4-4 2.6-6 6.5-6s6.1 2 6.5 6" />
                    </svg>
                    <input
                      v-model="form.name"
                      type="text"
                      maxlength="100"
                      autocomplete="name"
                      placeholder="填写与证件一致的姓名"
                      required
                    />
                  </div>
                </label>

                <label class="field">
                  <span>证件类型 <b>*</b></span>
                  <div class="control">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="3" />
                      <circle cx="8" cy="11" r="2" />
                      <path d="M13 10h5M13 14h4M6 16h4" />
                    </svg>
                    <select v-model="form.id_type">
                      <option v-for="item in idTypeOptions" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </option>
                    </select>
                  </div>
                </label>

                <label class="field">
                  <span>证件号码 <b>*</b></span>
                  <div class="control">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 4h10v16H7zM10 8h4M10 12h4M10 16h2" />
                    </svg>
                    <input
                      v-model="form.id_number"
                      type="text"
                      autocomplete="off"
                      placeholder="输入证件号码"
                      required
                    />
                  </div>
                  <small class="privacy-tip">提交后不会在页面回显</small>
                </label>

                <label class="field">
                  <span>签发地区 <small>选填</small></span>
                  <div class="control">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
                      <circle cx="12" cy="10" r="2" />
                    </svg>
                    <select v-model="form.nationality">
                      <option value="">请选择地区</option>
                      <option v-for="item in countryOptions" :key="item[0]" :value="item[0]">
                        {{ item[1] }}
                      </option>
                    </select>
                  </div>
                </label>

                <label class="field">
                  <span>出生日期 <small>选填</small></span>
                  <div class="control">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="3" />
                      <path d="M8 3v4M16 3v4M3 10h18" />
                    </svg>
                    <input v-model="form.dob" type="date" :max="maxDob" />
                  </div>
                </label>
              </div>
            </section>

            <section class="form-section materials-section">
              <header class="form-section-title">
                <span>02</span>
                <div>
                  <h3>证明材料</h3>
                  <p>支持 JPEG、PNG、WebP，单张不超过 5 MB</p>
                </div>
              </header>
              <div class="upload-grid">
                <label
                  v-for="(item, index) in [
                    ['id_image_front', '证件人像面', '包含照片与姓名', true],
                    ['id_image_back', '证件国徽面', '展示有效期与签发机关', false],
                    ['selfie', '本人自拍照', '正脸、光线充足、无遮挡', true],
                  ] as const"
                  :key="item[0]"
                  class="upload-field"
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    @change="handleFileChange(item[0], $event)"
                  />
                  <div class="upload-card" :class="{ uploaded: uploads[item[0]].url }">
                    <span class="upload-index">0{{ index + 1 }}</span>
                    <img
                      v-if="uploads[item[0]].preview"
                      :src="uploads[item[0]].preview"
                      alt="所选图片预览"
                    />
                    <div v-else class="upload-placeholder">
                      <span class="upload-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 16V5m0 0L8 9m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                          />
                        </svg>
                      </span>
                      <strong>{{ item[1] }} <b v-if="item[3]">*</b></strong>
                      <small>{{ item[2] }}</small>
                      <em>{{ uploads[item[0]].filename || '选择图片' }}</em>
                    </div>
                    <span v-if="uploads[item[0]].uploading" class="upload-mask">正在安全上传…</span>
                    <span v-else-if="uploads[item[0]].url" class="uploaded-badge">✓ 已就绪</span>
                  </div>
                </label>
              </div>
              <p class="material-tip">
                <span>拍摄建议</span> 将证件四角完整放入画面，避免反光、模糊或后期修图。
              </p>
            </section>

            <div class="submit-bar">
              <div>
                <strong>准备好了吗？</strong
                ><small>提交后将进入人工审核，审核期间无法修改资料。</small>
              </div>
              <button
                class="submit-button"
                type="submit"
                :disabled="submitting || anyUploading || !authStore.user?.emailVerifiedAt"
              >
                <span>{{
                  submitting
                    ? '提交中…'
                    : anyUploading
                      ? '图片上传中…'
                      : certification.status === 'rejected'
                        ? '重新提交'
                        : '确认并提交'
                }}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
              </button>
            </div>
          </form>
        </section>
      </div>

      <section v-else class="result-panel" :class="`result-${certification.status}`">
        <div class="result-graphic">
          <span></span>
          <div>{{ certification.status === 'verified' ? '✓' : '⌛' }}</div>
        </div>
        <span class="panel-kicker">{{
          certification.status === 'verified' ? 'VERIFICATION COMPLETE' : 'REVIEW IN PROGRESS'
        }}</span>
        <h2>{{ certification.status === 'verified' ? '身份认证已完成' : '资料已进入审核队列' }}</h2>
        <p>
          {{
            certification.status === 'verified'
              ? '你的可信身份已经建立，现在可以使用需要实名认证的平台能力。'
              : '我们正在核验你的信息，审核完成后此处会自动更新，请勿重复提交。'
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
        <button type="button" class="refresh-button" @click="loadCertification">
          刷新认证状态
        </button>
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
  width: min(1080px, calc(100% - 328px));
  padding: 104px 0 80px;
  margin-left: max(296px, calc(50% - 400px));
  transition: opacity 0.2s;
}
.workspace-main.loading {
  opacity: 0.62;
}
.breadcrumb {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-bottom: 22px;
  color: #8a96af;
  font-size: 12px;
}
.breadcrumb a {
  color: #5d58dc;
  font-weight: 650;
}
.identity-hero {
  position: relative;
  display: grid;
  min-height: 340px;
  overflow: hidden;
  grid-template-columns: 1.15fr 0.85fr;
  padding: 48px 54px;
  border-radius: 30px;
  background:
    radial-gradient(circle at 78% 20%, rgb(119 107 255 / 45%), transparent 27%),
    radial-gradient(circle at 92% 90%, rgb(86 225 191 / 22%), transparent 30%),
    linear-gradient(135deg, #11152b 0%, #1b2040 55%, #252352 100%);
  box-shadow: 0 30px 70px rgb(19 25 60 / 22%);
  color: #fff;
}
.identity-hero::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 4%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px);
  background-size: 34px 34px;
  content: '';
  mask-image: linear-gradient(to right, #000, transparent 75%);
}
.hero-copy {
  position: relative;
  z-index: 2;
}
.eyebrow,
.panel-kicker {
  display: inline-block;
  color: #8c82ff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
}
.identity-hero .eyebrow {
  color: #8df0d7;
}
.identity-hero h1 {
  margin: 15px 0 14px;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.08;
  letter-spacing: -0.055em;
}
.identity-hero h1 em {
  color: #a89fff;
  font-style: normal;
}
.identity-hero .hero-copy > p {
  max-width: 480px;
  margin: 0;
  color: #aeb7d0;
  font-size: 14px;
  line-height: 1.8;
}
.hero-status {
  display: grid;
  width: min(455px, 100%);
  grid-template-columns: auto auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px 18px;
  margin-top: 30px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 16px;
  background: rgb(255 255 255 / 7%);
  backdrop-filter: blur(12px);
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #a89fff;
  box-shadow: 0 0 0 5px rgb(168 159 255 / 12%);
}
.hero-status > div {
  display: grid;
  gap: 2px;
}
.hero-status small {
  color: #8490ad;
  font-size: 9px;
  letter-spacing: 0.08em;
}
.hero-status strong {
  font-size: 14px;
}
.status-note {
  overflow: hidden;
  color: #9da8c2;
  font-size: 11px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-pending .status-dot {
  background: #f4c96b;
  box-shadow: 0 0 0 5px rgb(244 201 107 / 12%);
}
.status-verified .status-dot {
  background: #72e7c5;
  box-shadow: 0 0 0 5px rgb(114 231 197 / 12%);
}
.status-rejected .status-dot {
  background: #ff8d8d;
  box-shadow: 0 0 0 5px rgb(255 141 141 / 12%);
}
.identity-visual {
  position: relative;
  display: grid;
  min-height: 240px;
  place-items: center;
}
.orbit {
  position: absolute;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 50%;
}
.orbit-one {
  width: 290px;
  height: 290px;
}
.orbit-two {
  width: 210px;
  height: 210px;
  border-style: dashed;
  animation: orbit-spin 24s linear infinite;
}
.identity-chip {
  position: relative;
  z-index: 2;
  display: grid;
  width: 210px;
  height: 258px;
  overflow: hidden;
  justify-items: center;
  align-content: center;
  gap: 13px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 26px;
  background: linear-gradient(145deg, rgb(255 255 255 / 18%), rgb(255 255 255 / 5%));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 25%),
    0 28px 50px rgb(5 9 30 / 38%);
  backdrop-filter: blur(16px);
  transform: rotate(5deg);
}
.chip-shine {
  position: absolute;
  top: -30%;
  left: -55%;
  width: 75%;
  height: 170%;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 12%), transparent);
  transform: rotate(25deg);
}
.identity-chip svg {
  width: 75px;
  height: 75px;
  fill: rgb(119 107 255 / 16%);
  stroke: #8df0d7;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}
.identity-chip > span:not(.chip-shine) {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.identity-chip small {
  color: #8f9bb6;
  font-size: 8px;
  letter-spacing: 0.1em;
}
.reject-alert {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px 22px;
  margin-top: 22px;
  border: 1px solid #ffd0ca;
  border-radius: 18px;
  background: #fff6f4;
  color: #b93f31;
}
.alert-mark {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #ffe4df;
  font-weight: 800;
}
.reject-alert p {
  margin: 5px 0 0;
  color: #b6665c;
  font-size: 12px;
}
.verification-layout {
  display: grid;
  grid-template-columns: 265px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  margin-top: 28px;
}
.process-panel {
  position: sticky;
  top: 94px;
  padding: 28px 24px;
  border: 1px solid #e4e8f2;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 14px 40px rgb(29 39 80 / 6%);
}
.process-panel h2 {
  margin: 8px 0 27px;
  font-size: 21px;
  line-height: 1.3;
  letter-spacing: -0.03em;
}
.process-list {
  position: relative;
  display: grid;
  gap: 24px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.process-list::before {
  position: absolute;
  top: 22px;
  bottom: 22px;
  left: 18px;
  width: 1px;
  background: #e6e9f0;
  content: '';
}
.process-list li {
  position: relative;
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 13px;
  align-items: center;
}
.process-list li > span {
  z-index: 1;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid #e2e6ef;
  border-radius: 50%;
  background: #fff;
  color: #9aa5ba;
  font-size: 10px;
  font-weight: 800;
}
.process-list li.active > span {
  border-color: #776bff;
  background: #776bff;
  box-shadow: 0 8px 18px rgb(119 107 255 / 25%);
  color: #fff;
}
.process-list li > div {
  display: grid;
  gap: 4px;
}
.process-list strong {
  color: #28304a;
  font-size: 13px;
}
.process-list small {
  color: #99a3b6;
  font-size: 10px;
}
.security-note {
  display: flex;
  gap: 11px;
  padding: 16px;
  margin-top: 28px;
  border-radius: 16px;
  background: #f2fbf8;
}
.security-note svg {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  fill: none;
  stroke: #35ad8a;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}
.security-note strong {
  color: #258c70;
  font-size: 11px;
}
.security-note p {
  margin: 5px 0 0;
  color: #6b9489;
  font-size: 10px;
  line-height: 1.6;
}
.form-panel {
  overflow: hidden;
  border: 1px solid #e4e8f2;
  border-radius: 26px;
  background: #fff;
  box-shadow: 0 20px 60px rgb(29 39 80 / 8%);
}
.form-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 31px 36px 27px;
  border-bottom: 1px solid #edf0f5;
}
.form-intro h2 {
  margin: 7px 0 4px;
  font-size: 25px;
  letter-spacing: -0.04em;
}
.form-intro p {
  margin: 0;
  color: #9aa4b7;
  font-size: 11px;
}
.form-intro p b,
.field b,
.upload-placeholder b {
  color: #f06c5d;
}
.encrypted-badge {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 8px 11px;
  border-radius: 999px;
  background: #f0faf7;
  color: #289879;
  font-size: 10px;
  font-weight: 650;
}
.encrypted-badge svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.8;
}
.email-warning {
  display: flex;
  gap: 11px;
  align-items: center;
  padding: 15px 18px;
  margin: 24px 36px 0;
  border: 1px solid #f0dda5;
  border-radius: 14px;
  background: #fffaeb;
  color: #8e6a14;
  font-size: 11px;
}
.email-warning > span {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #fff1c7;
}
.email-warning p {
  margin: 0;
}
.email-warning a {
  color: #6b51d9;
  font-weight: 750;
}
.verification-form {
  display: grid;
}
.form-section {
  padding: 32px 36px 36px;
  border-bottom: 1px solid #edf0f5;
}
.form-section-title {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 25px;
}
.form-section-title > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  background: #f0efff;
  color: #6d62ef;
  font-size: 10px;
  font-weight: 800;
}
.form-section-title h3 {
  margin: 0;
  color: #232b43;
  font-size: 15px;
}
.form-section-title p {
  margin: 4px 0 0;
  color: #9aa4b7;
  font-size: 10px;
}
.fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.field {
  display: grid;
  min-width: 0;
  gap: 8px;
  color: #596781;
  font-size: 11px;
  font-weight: 650;
}
.field-wide {
  grid-column: 1 / -1;
}
.field > span small {
  padding: 3px 7px;
  margin-left: 4px;
  border-radius: 999px;
  background: #f1f3f7;
  color: #9aa4b7;
  font-size: 8px;
  font-weight: 650;
}
.control {
  position: relative;
}
.control > svg {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 15px;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: #a6afc0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.55;
  transform: translateY(-50%);
  pointer-events: none;
}
.control input,
.control select {
  width: 100%;
  height: 52px;
  padding: 0 16px 0 44px;
  border: 1px solid #e0e4ed;
  border-radius: 13px;
  outline: 0;
  background: #fafbfc;
  color: #222a42;
  font-size: 12px;
  transition:
    border-color 0.18s,
    box-shadow 0.18s,
    background 0.18s;
}
.control input:focus,
.control select:focus {
  border-color: #8176f4;
  background: #fff;
  box-shadow: 0 0 0 4px rgb(119 107 255 / 10%);
}
.control input::placeholder {
  color: #abb4c5;
}
.privacy-tip {
  color: #a0a9ba;
  font-size: 9px;
  font-weight: 400;
}
.materials-section {
  background: #fbfcfe;
}
.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.upload-field {
  min-width: 0;
  cursor: pointer;
}
.upload-field > input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.upload-card {
  position: relative;
  height: 214px;
  overflow: hidden;
  border: 1px solid #dfe4ee;
  border-radius: 18px;
  background: #fff;
  transition:
    transform 0.18s,
    border-color 0.18s,
    box-shadow 0.18s;
}
.upload-card:hover {
  border-color: #8c81f4;
  box-shadow: 0 14px 30px rgb(50 47 110 / 10%);
  transform: translateY(-3px);
}
.upload-index {
  position: absolute;
  z-index: 3;
  top: 12px;
  left: 12px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #e7e9ef;
  border-radius: 9px;
  background: rgb(255 255 255 / 92%);
  color: #8b94a6;
  font-size: 9px;
  font-weight: 800;
  backdrop-filter: blur(8px);
}
.upload-card > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upload-placeholder {
  display: grid;
  height: 100%;
  justify-items: center;
  align-content: center;
  padding: 34px 14px 18px;
  text-align: center;
}
.upload-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 15px;
  background: #f0efff;
  color: #7065ef;
}
.upload-icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.65;
}
.upload-placeholder strong {
  color: #30384e;
  font-size: 12px;
}
.upload-placeholder small {
  margin-top: 5px;
  color: #a1aabc;
  font-size: 9px;
  line-height: 1.5;
}
.upload-placeholder em {
  padding: 6px 10px;
  margin-top: 13px;
  border-radius: 8px;
  background: #f5f6f9;
  color: #7369e7;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
}
.upload-mask {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(25 29 51 / 72%);
  color: #fff;
  font-size: 11px;
}
.uploaded-badge {
  position: absolute;
  z-index: 4;
  right: 10px;
  bottom: 10px;
  padding: 6px 9px;
  border-radius: 999px;
  background: #2eb68f;
  box-shadow: 0 7px 16px rgb(25 126 98 / 25%);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
}
.material-tip {
  padding: 12px 14px;
  margin: 16px 0 0;
  border-radius: 11px;
  background: #f2f4f8;
  color: #8b95a8;
  font-size: 9px;
  line-height: 1.6;
}
.material-tip span {
  padding: 3px 7px;
  margin-right: 7px;
  border-radius: 6px;
  background: #fff;
  color: #5e6780;
  font-weight: 750;
}
.submit-bar {
  display: flex;
  gap: 22px;
  align-items: center;
  justify-content: space-between;
  padding: 24px 36px;
}
.submit-bar > div {
  display: grid;
  gap: 4px;
}
.submit-bar strong {
  color: #2c344b;
  font-size: 12px;
}
.submit-bar small {
  color: #9aa4b7;
  font-size: 9px;
}
.submit-button {
  display: inline-flex;
  min-width: 150px;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 20px;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(135deg, #7569f5, #5a50da);
  box-shadow: 0 12px 24px rgb(96 82 220 / 24%);
  color: #fff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 750;
}
.submit-button svg {
  width: 17px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
.submit-button:hover {
  box-shadow: 0 15px 30px rgb(96 82 220 / 32%);
  transform: translateY(-1px);
}
.submit-button:disabled {
  box-shadow: none;
  cursor: not-allowed;
  filter: grayscale(0.25);
  opacity: 0.55;
  transform: none;
}
.result-panel {
  display: grid;
  min-height: 470px;
  justify-items: center;
  align-content: center;
  padding: 55px;
  margin-top: 28px;
  border: 1px solid #e3e7f0;
  border-radius: 28px;
  background: radial-gradient(circle at 50% 20%, rgb(119 107 255 / 10%), transparent 30%), #fff;
  box-shadow: 0 20px 60px rgb(29 39 80 / 8%);
  text-align: center;
}
.result-graphic {
  position: relative;
  display: grid;
  width: 104px;
  height: 104px;
  place-items: center;
  margin-bottom: 26px;
}
.result-graphic > span {
  position: absolute;
  inset: 0;
  border: 1px dashed #b4acee;
  border-radius: 50%;
  animation: orbit-spin 18s linear infinite;
}
.result-graphic > div {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 24px;
  background: linear-gradient(145deg, #8175f7, #5d54d6);
  box-shadow: 0 16px 30px rgb(93 84 214 / 28%);
  color: #fff;
  font-size: 28px;
}
.result-verified .result-graphic > div {
  background: linear-gradient(145deg, #4bd0ad, #25a982);
  box-shadow: 0 16px 30px rgb(37 169 130 / 25%);
}
.result-panel h2 {
  margin: 9px 0 10px;
  color: #252d45;
  font-size: 27px;
  letter-spacing: -0.04em;
}
.result-panel > p {
  max-width: 520px;
  margin: 0;
  color: #8893a8;
  font-size: 12px;
  line-height: 1.8;
}
.result-panel dl {
  width: min(520px, 100%);
  padding: 16px 20px;
  margin: 28px 0 0;
  border-radius: 16px;
  background: #f7f8fb;
}
.result-panel dl div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 11px;
}
.result-panel dt {
  color: #929caf;
}
.result-panel dd {
  margin: 0;
  color: #30384f;
  font-weight: 650;
}
.refresh-button {
  padding: 10px 16px;
  margin-top: 22px;
  border: 1px solid #dfe3ec;
  border-radius: 10px;
  background: #fff;
  color: #655be0;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}
@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1150px) {
  .workspace-main {
    width: min(820px, calc(100% - 310px));
    margin-left: 286px;
  }
  .identity-hero {
    grid-template-columns: 1fr 0.72fr;
    padding: 42px;
  }
  .verification-layout {
    grid-template-columns: 230px minmax(0, 1fr);
  }
  .upload-grid {
    grid-template-columns: 1fr;
  }
  .upload-card {
    height: 180px;
  }
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
    width: min(100% - 32px, 760px);
    margin: 0 auto;
  }
  .verification-layout {
    grid-template-columns: 1fr;
  }
  .process-panel {
    position: static;
  }
  .process-list {
    grid-template-columns: repeat(3, 1fr);
  }
  .process-list::before {
    top: 19px;
    right: 16%;
    bottom: auto;
    left: 16%;
    width: auto;
    height: 1px;
  }
  .process-list li {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
  .security-note {
    display: none;
  }
}
@media (max-width: 620px) {
  .workspace-header {
    height: 62px;
    padding: 0 17px;
  }
  .brand {
    width: auto;
  }
  .workspace-main {
    width: calc(100% - 24px);
    padding-top: 84px;
  }
  .breadcrumb {
    margin-left: 4px;
  }
  .identity-hero {
    min-height: 440px;
    grid-template-columns: 1fr;
    padding: 32px 26px;
    border-radius: 24px;
  }
  .identity-hero h1 {
    font-size: 35px;
  }
  .identity-visual {
    position: absolute;
    right: -72px;
    bottom: -115px;
    width: 270px;
    opacity: 0.5;
  }
  .identity-chip {
    width: 165px;
    height: 205px;
  }
  .hero-copy > p {
    max-width: 280px;
  }
  .hero-status {
    grid-template-columns: auto auto;
  }
  .status-note {
    display: none;
  }
  .verification-layout {
    margin-top: 18px;
  }
  .process-panel {
    padding: 24px 18px;
    border-radius: 20px;
  }
  .process-panel h2 {
    margin-bottom: 22px;
    font-size: 19px;
  }
  .process-list small {
    display: none;
  }
  .process-list strong {
    font-size: 10px;
  }
  .form-panel {
    border-radius: 22px;
  }
  .form-intro,
  .form-section,
  .submit-bar {
    padding-right: 20px;
    padding-left: 20px;
  }
  .form-intro {
    align-items: flex-start;
  }
  .form-intro h2 {
    font-size: 22px;
  }
  .encrypted-badge {
    padding: 7px;
    font-size: 0;
  }
  .encrypted-badge svg {
    width: 16px;
    height: 16px;
  }
  .email-warning {
    margin-right: 20px;
    margin-left: 20px;
  }
  .fields-grid {
    grid-template-columns: 1fr;
  }
  .field-wide {
    grid-column: auto;
  }
  .upload-grid {
    grid-template-columns: 1fr;
  }
  .upload-card {
    height: 205px;
  }
  .submit-bar {
    align-items: stretch;
    flex-direction: column;
  }
  .submit-button {
    width: 100%;
  }
  .result-panel {
    padding: 40px 22px;
    border-radius: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .orbit-two,
  .result-graphic > span {
    animation: none;
  }
}
</style>
