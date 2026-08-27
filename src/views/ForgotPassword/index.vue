<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'

import { forgotPassword } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import AuthFormShell from '@/components/auth/AuthFormShell.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitted = ref(false)
const form = reactive({ email: '' })
const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    await forgotPassword({ email: form.email })
    submitted.value = true
    ElMessage.success('请求已提交')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="ACCOUNT RECOVERY"
    title="找回密码"
    subtitle="输入注册邮箱，我们会发送重置链接。"
  >
    <AuthFormShell footer-text="想起密码了？" link-label="返回登录" link-to="/login">
      <ElAlert
        v-if="submitted"
        type="success"
        :closable="false"
        show-icon
        title="如果该邮箱已注册，重置邮件将很快送达。"
      />
      <ElForm
        v-else
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <ElFormItem label="邮箱" prop="email">
          <ElInput
            v-model.trim="form.email"
            autocomplete="email"
            placeholder="请输入邮箱"
            size="large"
            @keyup.enter="handleSubmit"
          />
        </ElFormItem>
        <ElButton type="primary" native-type="submit" :loading="loading">发送重置邮件</ElButton>
      </ElForm>
    </AuthFormShell>
  </AuthLayout>
</template>
