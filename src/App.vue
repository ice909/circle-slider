<!-- filepath: /Users/ice/workspace/lzc-photo/ui/src/mobile/views/UserInfo/components/CanvasSliderDemo.vue -->
<template>
  <div class="canvas-slider-demo">
    <div id="canvas-container" class="slider-container"></div>
    <div class="controls">
      <p>当前时间范围: {{ timeRange.start }} - {{ timeRange.end }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCanvasCircleSlider } from './useCanvasCircleSlider'

const { render, changedValue, updateSliderValue, instance } = useCanvasCircleSlider()
const timeRange = ref({ start: '00:00', end: '06:00' })

onMounted(() => {
  // 渲染滑块
  render('canvas-container', {
    min: 0,
    max: 48,
    from: 0,
    to: 12,
    radius: window.innerWidth * 0.84 / 3,
    strokeWidth: 70,
    handleRadius: 38,
    step: 1,
    tickCount: 48,
    majorTickEvery: 4,
    colors: {
      rail: '#E5E7EB',
      bar: '#24C7D4',
      handle: '#FFFFFF',
      tick: '#9CA3AF',
      text: '#374151'
    }
  })

  // 设置完成回调
  instance.value?.setFinishCallback(() => {
    timeRange.value = changedValue()
    console.log('时间范围改变:', timeRange.value)
  })

  // 初始化时间显示
  setTimeout(() => {
    timeRange.value = changedValue()
  }, 100)
})
</script>

<style scoped>
.canvas-slider-demo {
  padding: 20px;
}

.slider-container {
  width: min(84vw, 84vh);
  aspect-ratio: 1/1;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.controls {
  text-align: center;
  margin-top: 20px;
}

button {
  padding: 8px 16px;
  background: #24C7D4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
