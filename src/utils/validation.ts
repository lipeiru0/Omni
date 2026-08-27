import type { FormItemRule } from 'element-plus'

export const passwordByteLengthRule: FormItemRule = {
  validator: (_rule, value: string, callback) => {
    const byteLength = new TextEncoder().encode(value).length
    if (byteLength < 8 || byteLength > 72) callback(new Error('密码长度应为 8–72 字节'))
    else callback()
  },
  trigger: 'blur',
}
