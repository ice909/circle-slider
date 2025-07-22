import {
  defineComponent,
  ref,
  watch,
  computed,
  onMounted,
  onUnmounted,
} from 'vue';

export type TimeRange = { start: string; end: string };

export default defineComponent({
  name: 'CircleSlider',
  props: {
    initial: {
      type: Object as () => TimeRange,
      default: () => ({ start: '00:00', end: '7:00' }),
    },
    size: {
      type: Number,
      default: 300,
		},
		// 轨道宽度
		railWidth: {
			type: Number,
			default: 30,
		},
		// 轨道颜色
		railColor: {
			type: String,
			default: '#ccc',
		}
  },
  emits: ['update', 'submit'],
  setup(props, { emit }) {
    // DOM refs
    const canvasRef = ref<HTMLCanvasElement>();
    const containerRef = ref<HTMLDivElement>();

    // Canvas state
    const canvasSize = ref(props.size);
		const ctx = ref<CanvasRenderingContext2D>();
		const dpr = window.devicePixelRatio || 1;
		console.log('Canvas Size:', canvasSize.value);
		console.log('Device Pixel Ratio:', dpr);

    // 设置高清 Canvas
    function setupHighDPICanvas(
      canvas: HTMLCanvasElement
		): CanvasRenderingContext2D {
			if (!ctx.value) return;
      const dpr = window.devicePixelRatio || 1;


      // 设置 Canvas 的实际尺寸（考虑设备像素比）
      canvas.width = canvasSize.value * dpr;
			canvas.height = canvasSize.value * dpr;
			
			canvas.style.width = `${canvasSize.value}px`;
			canvas.style.height = `${canvasSize.value}px`;

      // 缩放上下文以匹配设备像素比
      ctx.value.scale(dpr, dpr);
    }

    // 绘制函数
    function draw() {
      if (!ctx.value) return;

      const c = ctx.value;
      const size = canvasSize.value;

      // 清空画布
      c.clearRect(0, 0, size, size);

      // 绘制背景轨道
      drawRails();
		}
		
		function drawRails() { 
			if (!ctx.value) return;

			const c = ctx.value;
			const size = canvasSize.value;
			const radius = size / 2 - props.railWidth; // 留出边距

			// 绘制轨道
			c.beginPath();
			c.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
			c.lineWidth = props.railWidth;
			c.strokeStyle = props.railColor;
			c.stroke();
		}

    onMounted(() => {
      ctx.value = canvasRef.value?.getContext('2d') || undefined;
      if (ctx.value) {
        setupHighDPICanvas(canvasRef.value); // 设置高清 Canvas
			}
			draw();
    });

    return () => (
      <div
        ref={containerRef}
        class="circle-slider-canvas"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            cursor: 'pointer'
          }}
        />
      </div>
    );
  },
});
