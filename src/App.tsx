import { defineComponent, ref, computed } from 'vue';
import CircleSlider from './CircleSlider';

export default defineComponent({
  name: 'App',
  setup() {
    const fromValue = ref(0);
    const toValue = ref(12);
    
    const valueToTime = (value: number): string => {
      const totalMinutes = value * 30; // 每格0.5小时 = 30分钟
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
    };

    // 计算时间差（以小时为单位）
    const calculateTimeDifference = (from: number, to: number): number => {
      let diff = to - from;

      // 处理跨日情况（比如从22:00到06:00）
      if (diff < 0) {
        diff += 48; // 48格代表24小时
      }

      return diff * 0.5; // 每格0.5小时
    };

    // 格式化时间差为 1h, 1.5h 格式
    const formatTimeDifference = (hours: number): string => {
      if (hours % 1 === 0) {
        // 整数小时
        return `${hours}h`;
      } else {
        // 带小数的小时
        return `${hours}h`;
      }
    };

    // 计算的属性
    const fromTime = computed(() => valueToTime(fromValue.value));
    const toTime = computed(() => valueToTime(toValue.value));
    const timeDifference = computed(() => {
      const diff = calculateTimeDifference(fromValue.value, toValue.value);
      return formatTimeDifference(diff);
    });
    const timeRange = computed(() => `${fromTime.value} ${toTime.value}`);
    return () => (
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 90vh;">
        <div>
          {fromValue.value} - {toValue.value}
        </div>
        <div>
          时间: {timeRange.value}
        </div>
        <div>时长: {timeDifference.value}</div>
        <CircleSlider
          modelValue={{ from: fromValue.value, to: toValue.value }}
          onUpdate:modelValue={({ from, to }) => {
            console.log('Model value updated:', { from, to });
            fromValue.value = from;
            toValue.value = to;
          }}
          style={{ width: '84vw', height: '84vw' }}
        />
      </div>
    );
  },
});
