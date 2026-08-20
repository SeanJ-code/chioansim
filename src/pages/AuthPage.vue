<template>
  <div class="q-pa-md">
    <!-- 注册表单 -->
    <div ref="registerForm" class="form-panel form-panel--register" :class="{ 'show': registerActive }">
      <p class="eyebrow">JOIN CHIOANSIM</p>
      <h2 id="register-title">建立安心帳號</h2>
      <p>先建立基本帐号，後續再逐步補上照護資料。</p>
      <form class="q-form auth-form auth-form--register">
        <!-- Form Fields -->
        <label class="q-field row no-wrap items-start q-field--outlined q-input q-field--labeled q-field--error q-field--highlighted q-field--with-bottom" for="f_80b9554c-9650-473c-884a-87603ee150b8">
          <div class="q-field__inner relative-position col self-stretch">
            <div class="q-field__control relative-position row no-wrap text-negative">
              <div class="q-field__prepend q-field__marginal row no-wrap items-center">
                <i class="bx bx-id-card" aria-hidden="true"></i>
              </div>
              <div class="q-field__control-container col relative-position row no-wrap q-anchor--skip">
                <div class="q-field__label no-pointer-events absolute ellipsis">姓名</div>
                <input class="q-field__native q-placeholder" tabindex="0" aria-label="姓名" autocomplete="name" id="f_80b9554c-9650-473c-884a-87603ee150b8" type="text" value="" />
              </div>
            </div>
            <div class="q-field__bottom row items-start q-field__bottom--animated">
              <div class="q-field__messages col"><div role="alert">請輸入姓名</div></div>
            </div>
          </div>
        </label>
        <!-- 其他表单字段... -->
      </form>
      <button type="button" @click="toggleForms">已經有帳號？返回登入</button>
    </div>

    <!-- 登录表单 -->
    <div ref="loginForm" class="form-panel form-panel--login" :class="{ 'show': !registerActive }">
      <p class="eyebrow">WELCOME BACK</p>
      <h1 id="auth-title">歡迎回來</h1>
      <p>登入後即可查看預約、照護進度與重要通知。</p>
      <form class="q-form auth-form" id="auth-form">
        <!-- Form Fields -->
        <label class="q-field row no-wrap items-start q-field--outlined q-input q-field--labeled q-field--with-bottom" for="f_3682f9ab-7150-4d54-ad2b-8117deaf986d">
          <div class="q-field__inner relative-position col self-stretch">
            <div class="q-field__control relative-position row no-wrap" tabindex="-1">
              <div class="q-field__prepend q-field__marginal row no-wrap items-center">
                <i class="bx bx-user" aria-hidden="true"></i>
              </div>
              <div class="q-field__control-container col relative-position row no-wrap q-anchor--skip">
                <div class="q-field__label no-pointer-events absolute ellipsis">登入帳號</div>
                <input class="q-field__native q-placeholder" tabindex="0" aria-label="登入帳號" autocomplete="username" id="f_3682f9ab-7150-4d54-ad2b-8117deaf986d" type="text" value="" />
              </div>
            </div>
          </div>
        </label>
        <!-- 其他表单字段... -->
      </form>
      <button type="button" @click="toggleForms">還沒有帳號？建立帳號</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'

export default {
  setup() {
    const registerForm = ref(null)
    const loginForm = ref(null)
    let registerActive = ref(true)

    // 初始化动画
    function initAnimation() {
      gsap.set(registerForm.value, { x: '12%' })
      gsap.set(loginForm.value, { x: '-12%', opacity: 0 })
    }

    // 切换表单
    function toggleForms() {
      registerActive.value = !registerActive.value

      if (registerActive.value) {
        gsap.to(registerForm.value, { x: '0%', duration: 0.5 })
        gsap.from(loginForm.value, { x: '-12%', opacity: 0, duration: 0.5 })
      } else {
        gsap.to(loginForm.value, { x: '0%', duration: 0.5 })
        gsap.from(registerForm.value, { x: '12%', opacity: 0, duration: 0.5 })
      }
    }

    onMounted(() => {
      initAnimation()
    })

    return {
      registerForm,
      loginForm,
      registerActive,
      toggleForms
    }
  }
}
</script>

<style scoped>
.form-panel {
  width: 434.5px;
  height: 648px;
  position: relative;
  transition: transform 0.5s ease-in-out;
  opacity: 0;
}

.form-panel.show {
  opacity: 1;
}
</style>
