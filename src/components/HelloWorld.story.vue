<script setup lang="ts">
import HelloWorld from './HelloWorld.vue'
const msg = 'ようこそ State Matrix Web'
</script>

<template>
  <Story title="HelloWorld">
    <Variant title="Default">
      <HelloWorld :msg="msg" />
    </Variant>
  </Story>
</template>
