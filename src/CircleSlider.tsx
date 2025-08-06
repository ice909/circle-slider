import {defineComponent, nextTick, onMounted, onUnmounted, PropType, ref} from 'vue';
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
      type: Object as PropType<CircleSliderConfig>,
      default: () => ({} as CircleSliderConfig),
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
    padding: {
      type: Number,
      default: 20,
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const canvasContainer = ref<HTMLDivElement>();
    const canvasRef = ref<HTMLCanvasElement>();
    const sliderInstance = ref<Slider>();

    const config = ref<CircleSliderConfig>(props.config);

    const initSlider = () => {
      if (!canvasRef.value) return;

      // 销毁旧实例
      if (sliderInstance.value) {
        sliderInstance.value.destroy();
      }

      // 创建新实例
      sliderInstance.value = new Slider(
        canvasRef.value,
        config.value
      );

      // 设置初始值
      sliderInstance.value.setValues(
        config.value.from || props.modelValue.from,
        config.value.to || props.modelValue.to
      );

      // 设置回调
      sliderInstance.value.setChangeCallback((from, to) => {
        console.log('Slider values changed:', { from, to });
        emit('update:modelValue', { from, to });
        emit('change', { from, to });
      });
    };

    const setupAndInit = async () => {
      await nextTick();

      console.log('Setting up CircleSlider with config:', config.value);
      if (!canvasContainer.value) return;
      console.log('Canvas container:', canvasContainer.value);
      const width = canvasContainer.value.clientWidth;
      const strokeWidth = Math.max(6, width * 0.09);
      const strokePadding = Math.max(2, width * 0.02);
      const handleRadius = strokeWidth / 2;
      const margin = 2;
      const radius = width / 2 - margin - props.padding;

      let _config = props.config;

      _config.min = 0;
      _config.max = 48;
      _config.from = 0;
      _config.to = 12;
      _config.step = 1;
      _config.radius = radius;
      _config.handleRadius = handleRadius;
      _config.strokeWidth = strokeWidth;
      _config.strokePadding = strokePadding;
      _config.tickCount = 24;
      _config.majorTickEvery = 2;
      _config.colors = {
        rail: '#f3f7fa',
        bar: '#24C7D4',
        handle: '#FFFFFF',
        tick: '#e3e5e8',
        text: '#374151',
      };
      initSlider();
    };

    onMounted(() => {
      setupAndInit();
    });

    onUnmounted(() => {
      if (sliderInstance.value) {
        sliderInstance.value.destroy();
      }
    });

    return () => (
      <div>
        <div
          ref={canvasContainer}
          style={{
            padding: '20px',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>
      </div>
    );
  },
});
