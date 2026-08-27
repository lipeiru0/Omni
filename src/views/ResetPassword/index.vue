<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resetPassword } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import AuthFormShell from '@/components/auth/AuthFormShell.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { passwordByteLengthRule } from '@/utils/validation'

const formRef = ref<FormInstance>()
const loading = ref(false)
const route = useRoute()
const router = useRouter()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const form = reactive({ password: '', confirmPassword: '' })
const rules: FormRules = {
  password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, passwordByteLengthRule],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) =>
        value === form.password ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: ['blur', 'change'],
    },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!token) {
    ElMessage.error('重置链接缺少 token，请重新申请。')
    return
  }
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    await resetPassword({ token, new_password: form.password })
    ElMessage.success('密码已重置，请重新登录')
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout eyebrow="ACCOUNT RECOVERY" title="重置密码" subtitle="设置一个新的登录密码。">
    <AuthFormShell footer-text="重置链接失效？" link-label="重新申请" link-to="/forgot-password">
      <ElAlert
        v-if="!token"
        type="error"
        :closable="false"
        show-icon
        title="当前链接缺少重置 token。"
      />
      <ElForm
        v-else
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <ElFormItem label="新密码" prop="password"
          ><ElInput
            v-model="form.password"
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
            placeholder="请再次输入新密码"
            size="large"
            @keyup.enter="handleSubmit"
        /></ElFormItem>
        <ElButton type="primary" native-type="submit" :loading="loading">确认重置</ElButton>
      </ElForm>
    </AuthFormShell>
  </AuthLayout>
</template>
