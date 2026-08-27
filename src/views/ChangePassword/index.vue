<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { setPassword } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import AuthFormShell from '@/components/auth/AuthFormShell.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { passwordByteLengthRule } from '@/utils/validation'

const formRef = ref<FormInstance>()
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const rules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    passwordByteLengthRule,
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        value === form.newPassword ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: ['blur', 'change'],
    },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    await setPassword({
      new_password: form.newPassword,
      ...(form.currentPassword ? { current_password: form.currentPassword } : {}),
    })
    authStore.logout()
    ElMessage.success('密码已更新，请重新登录')
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="ACCOUNT SECURITY"
    title="设置或修改密码"
    subtitle="修改成功后，所有已登录设备都会退出。"
  >
    <AuthFormShell footer-text="暂不修改？" link-label="返回首页" link-to="/">
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <ElFormItem label="当前密码（首次从第三方账号设置密码时可留空）"
          ><ElInput
            v-model="form.currentPassword"
            type="password"
            show-password
            autocomplete="current-password"
            size="large"
        /></ElFormItem>
        <ElFormItem label="新密码" prop="newPassword"
          ><ElInput
            v-model="form.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请输入 8–72 字节密码"
            size="large"
        /></ElFormItem>
        <ElFormItem label="确认新密码" prop="confirmPassword"
          ><ElInput
            v-model="form.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            size="large"
            @keyup.enter="handleSubmit"
        /></ElFormItem>
        <ElButton type="primary" native-type="submit" :loading="loading">保存新密码</ElButton>
      </ElForm>
    </AuthFormShell>
  </AuthLayout>
</template>
