import {defineComponent, onMounted, onUnmounted, PropType, ref, watch,} from 'vue';
import type { CircleSliderConfig } from "./types.ts";
import { Slider } from "./Slider.ts";

interface SliderValues {
  from: number;
  to: number;
}

export default defineComponent({
  name: 'CanvasCircleSlider',
  props: {
    config: {
      type: Object as PropType<Partial<CircleSliderConfig>>,
      default: () => ({}),
    },
    modelValue: {
      type: Object as PropType<SliderValues>,
      default: () => ({ from: 0, to: 12 }),
    },
    width: {
      type: Number,
      default: () =>
        Math.min(window.innerWidth * 0.84, window.innerHeight * 0.84),
    },
    height: {
      type: Number,
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'change', 'finish'],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement>();
    const sliderInstance = ref<Slider>();

    const strokeWidth = Math.max(6, props.width * 0.05);
    const strokePadding = Math.max(2, props.width * 0.01);
    const handleRadius = strokeWidth / 2;
    
    // Calculate radius to ensure circle doesn't get clipped
    // Account for: strokePadding/2 (rail extension) + small margin
    const margin = 2;
    const radius = props.width / 2 - strokePadding / 2 - margin;
    
    const defaultConfig: CircleSliderConfig = {
      min: 0,
      max: 48,
      from: 0,
      to: 12,
      step: null,
      radius,
      strokeWidth,
      strokePadding,
      tickCount: 48,
      majorTickEvery: 4,
      colors: {
        rail: '#E5E7EB',
        bar: '#24C7D4',
        handle: '#FFFFFF',
        tick: '#9CA3AF',
        text: '#374151',
      },
    };

    const mergedConfig = ref<CircleSliderConfig>({
      ...defaultConfig,
      ...props.config,
      handleRadius
    });

    const initSlider = () => {
      if (!canvasRef.value) return;

      // 销毁旧实例
      if (sliderInstance.value) {
        sliderInstance.value.destroy();
      }

      // 创建新实例
      sliderInstance.value = new Slider(
        canvasRef.value,
        mergedConfig.value
      );

      // 设置初始值
      sliderInstance.value.setValues(
        props.modelValue.from,
        props.modelValue.to
      );

      // 设置回调
      sliderInstance.value.setFinishCallback(() => {
        if (!sliderInstance.value) return;

        const values = sliderInstance.value.getValues();
        emit('update:modelValue', values);
        emit('change', values);
        emit('finish', values);
      });
    };

    // 监听配置变化
    watch(
      () => props.config,
      (newConfig) => {
        mergedConfig.value = { ...defaultConfig, ...newConfig };
        initSlider();
      },
      { deep: true }
    );

    // 监听值变化
    watch(
      () => props.modelValue,
      (newValue) => {
        if (sliderInstance.value) {
          sliderInstance.value.setValues(newValue.from, newValue.to);
        }
      },
      { deep: true }
    );

    onMounted(() => {
      initSlider();
    });

    onUnmounted(() => {
      if (sliderInstance.value) {
        sliderInstance.value.destroy();
      }
    });

    const computedHeight = () => {
      return props.height ?? props.width;
    };

    return () => (
      <canvas
        ref={canvasRef}
        width={props.width}
        height={computedHeight()}
        class="canvas-circle-slider"
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
        }}
      />
    );
  },
});
