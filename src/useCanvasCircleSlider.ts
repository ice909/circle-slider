import { ref, onUnmounted } from 'vue'

interface CanvasSliderConfig {
  min: number
  max: number
  from: number
  to: number
  step: number | null  // 添加步长配置
  radius: number
  strokeWidth: number
  handleRadius: number
  tickCount: number
  majorTickEvery: number
  colors: {
    rail: string
    bar: string
    handle: string
    tick: string
    text: string
  }
}

export function useCanvasCircleSlider() {
  const canvasRef = ref<HTMLCanvasElement>()
  const instance = ref<CanvasCircularSlider>()

  function render(containerId: string, config: Partial<CanvasSliderConfig>) {
    const container = document.getElementById(containerId)
    if (!container) return

    const canvas = document.createElement('canvas')
    canvas.id = 'canvas-slider'
    canvas.width = window.innerWidth * 0.84
    canvas.height = canvas.width
    container.appendChild(canvas)

    canvasRef.value = canvas
    instance.value = new CanvasCircularSlider(canvas, config)
  }

  function changedValue() {
    if (!instance.value) return { start: '00:00', end: '00:00' }

    const { from, to } = instance.value.getValues()
    const start = ratio2HourMin(from / instance.value.config.max)
    const end = ratio2HourMin(to / instance.value.config.max)
    return { start, end }
  }

  function updateSliderValue(from: string, to: string) {
    if (!instance.value) return

    const fromRatio = parseHourMinToRatio(from) * instance.value.config.max
    const toRatio = parseHourMinToRatio(to) * instance.value.config.max
    instance.value.setValues(fromRatio, toRatio)
  }

  onUnmounted(() => {
    instance.value?.destroy()
  })

  return {
    canvasRef,
    instance,
    render,
    changedValue,
    updateSliderValue
  }
}

class CanvasCircularSlider {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  public config: CanvasSliderConfig
  private center: { x: number; y: number }
  private isDragging = false
  private dragTarget: 'from' | 'to' | 'bar' | null = null
  private angleFrom = 0
  private angleTo = Math.PI / 2
  private onFinish?: () => void

  private readonly defaultConfig: CanvasSliderConfig = {
    min: 0,
    max: 48,
    from: 0,
    to: 12,
    step: null,  // 默认连续滑动，无步长限制
    radius: 120,
    strokeWidth: 8,
    handleRadius: 12,
    tickCount: 48,
    majorTickEvery: 4,
    colors: {
      rail: '#E5E7EB',
      bar: '#24C7D4',
      handle: '#FFFFFF',
      tick: '#9CA3AF',
      text: '#374151'
    }
  }

  constructor(canvas: HTMLCanvasElement, config: Partial<CanvasSliderConfig> = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.config = { ...this.defaultConfig, ...config }

    // 验证配置
    this.validateConfig()

    this.center = {
      x: canvas.width / 2,
      y: canvas.height / 2
    }

    this.angleFrom = this.valueToAngle(this.config.from)
    this.angleTo = this.valueToAngle(this.config.to)

    this.setupEventListeners()
    this.draw()
  }

  private validateConfig() {
    // 检查步长配置的有效性
    if (this.config.step !== null && this.config.step > 0) {
      const range = this.config.max - this.config.min
      const steps = range / this.config.step

      if (steps < 3) {
        throw new Error('Not enough steps: at least three are required')
      }

      if (steps < this.config.tickCount) {
        console.warn('Step size might be too big for the number of ticks')
      }
    }
  }

  private setupEventListeners() {
    const getEventPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getEventPos(e)
      const angle = this.getAngleFromPoint(pos.x, pos.y)

      // 检测点击的目标
      if (this.isPointInHandle(pos.x, pos.y, this.angleFrom)) {
        this.dragTarget = 'from'
      } else if (this.isPointInHandle(pos.x, pos.y, this.angleTo)) {
        this.dragTarget = 'to'
      } else if (this.isPointOnBar(angle)) {
        this.dragTarget = 'bar'
      }

      if (this.dragTarget) {
        this.isDragging = true
      }
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging || !this.dragTarget) return

      e.preventDefault()
      const pos = getEventPos(e)
      const angle = this.getAngleFromPoint(pos.x, pos.y)

      switch (this.dragTarget) {
        case 'from':
          this.angleFrom = this.adjustAngle(angle)
          break
        case 'to':
          this.angleTo = this.adjustAngle(angle)
          break
        case 'bar':
          // 移动整个选择区域
          const arcLength = this.getArcLength(this.angleFrom, this.angleTo)
          this.angleFrom = this.adjustAngle(angle - arcLength / 2)
          this.angleTo = this.adjustAngle(angle + arcLength / 2)
          break
      }

      this.draw()
    }

    const handleEnd = () => {
      if (this.isDragging) {
        this.isDragging = false
        this.dragTarget = null
        this.onFinish?.()
      }
    }

    // 键盘事件处理
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.canvas.contains(document.activeElement as Node)) return

      e.preventDefault()
      let weight = 1
      let scale = false // 是否缩放模式

      switch (e.key) {
        case 'ArrowUp':
          scale = true
          weight = -1
          break
        case 'ArrowDown':
          scale = true
          weight = 1
          break
        case 'ArrowLeft':
          weight = -1
          break
        case 'ArrowRight':
          weight = 1
          break
        default:
          return
      }

      if (e.shiftKey) {
        weight *= 10
      }

      // 根据步长计算权重
      if (this.config.step === null) {
        weight *= Math.PI / 50 // 连续模式：移动1%或10%
      } else {
        // 步长模式：移动指定步数
        const stepAngle = this.valueToAngle(this.config.min + weight * this.config.step) -
          this.valueToAngle(this.config.min)
        weight = stepAngle
      }

      if (scale) {
        // 缩放模式：同时调整两个手柄
        this.angleFrom = this.adjustAngle(this.angleFrom - weight)
        this.angleTo = this.adjustAngle(this.angleTo + weight)
      } else {
        // 移动模式：整体移动
        this.angleFrom = this.adjustAngle(this.angleFrom + weight)
        this.angleTo = this.adjustAngle(this.angleTo + weight)
      }

      this.draw()
      this.onFinish?.()
    }

    // 鼠标事件
    this.canvas.addEventListener('mousedown', handleStart)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)

    // 触摸事件
    this.canvas.addEventListener('touchstart', handleStart, { passive: false })
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    // 键盘事件
    document.addEventListener('keydown', handleKeyDown)

    // 使canvas可以获得焦点
    this.canvas.tabIndex = 0

    // 双击重置到最近的刻度
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getEventPos(e)
      const angle = this.adjustAngle(this.getAngleFromPoint(pos.x, pos.y))

      const distToFrom = this.getAngularDistance(angle, this.angleFrom)
      const distToTo = this.getAngularDistance(angle, this.angleTo)

      if (distToFrom < distToTo) {
        this.angleFrom = angle
      } else {
        this.angleTo = angle
      }

      this.draw()
      this.onFinish?.()
    })

    // 鼠标滚轮事件
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const weight = 0.01 * e.deltaY

      // 缩放选择区域
      this.angleFrom = this.adjustAngle(this.angleFrom - (weight * Math.PI) / 50)
      this.angleTo = this.adjustAngle(this.angleTo + (weight * Math.PI) / 50)

      this.draw()
      this.onFinish?.()
    })
  }

  // 角度调整方法 - 处理步长约束
  private adjustAngle(angle: number): number {
    // 确保角度在 0 到 2π 之间
    angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

    // 如果没有步长限制，直接返回
    if (this.config.step === null) {
      return angle
    }

    // 有步长限制时，需要对齐到最近的有效值
    const value = this.angleToValue(angle)
    const steppedValue = this.config.step * Math.round(value / this.config.step)
    return this.valueToAngle(steppedValue)
  }

  // 角度转值方法
  private angleToValue(angle: number): number {
    // 确保角度在正确范围内
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const ratio = normalizedAngle / (Math.PI * 2)
    return this.config.min + ratio * (this.config.max - this.config.min)
  }

  // 值转角度方法
  private valueToAngle(value: number): number {
    // 确保值在正确范围内
    while (value < this.config.min) {
      value = this.config.max - (this.config.min - value)
    }
    if (value > this.config.max) {
      value = value % this.config.max
    }

    const ratio = (value - this.config.min) / (this.config.max - this.config.min)
    return ratio * Math.PI * 2
  }

  private draw() {
    const { ctx } = this

    // 清空画布
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 绘制背景轨道
    this.drawRail()

    // 绘制刻度
    this.drawTicks()

    // 绘制选择的弧段
    this.drawBar()

    // 绘制手柄
    this.drawHandle(this.angleFrom)
    this.drawHandle(this.angleTo)
  }

  private drawRail() {
    const { ctx, center, config } = this

    ctx.beginPath()
    ctx.arc(center.x, center.y, config.radius, 0, Math.PI * 2)
    ctx.strokeStyle = config.colors.rail
    ctx.lineWidth = config.strokeWidth
    ctx.stroke()
  }

  private drawTicks() {
    const { ctx, center, config } = this

    for (let i = 0; i < config.tickCount; i++) {
      const angle = (i / config.tickCount) * Math.PI * 2
      const isMajor = i % config.majorTickEvery === 0

      const innerRadius = config.radius - config.strokeWidth / 2 - (isMajor ? 15 : 8)
      const outerRadius = config.radius - config.strokeWidth / 2

      const x1 = center.x + Math.cos(angle) * innerRadius
      const y1 = center.y + Math.sin(angle) * innerRadius
      const x2 = center.x + Math.cos(angle) * outerRadius
      const y2 = center.y + Math.sin(angle) * outerRadius

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = config.colors.tick
      ctx.lineWidth = isMajor ? 2 : 1
      ctx.stroke()
    }
  }

  private drawBar() {
    const { ctx, center, config } = this

    ctx.beginPath()
    ctx.arc(center.x, center.y, config.radius, this.angleFrom, this.angleTo)
    ctx.strokeStyle = config.colors.bar
    ctx.lineWidth = config.strokeWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  private drawHandle(angle: number) {
    const { ctx, center, config } = this

    const x = center.x + Math.cos(angle) * config.radius
    const y = center.y + Math.sin(angle) * config.radius

    ctx.beginPath()
    ctx.arc(x, y, config.handleRadius + 1, 0, Math.PI * 2)
    ctx.fillStyle = config.colors.handle
    ctx.fill()
  }

  private getAngleFromPoint(x: number, y: number): number {
    const dx = x - this.center.x
    const dy = y - this.center.y
    return Math.atan2(dy, dx)
  }

  private isPointInHandle(x: number, y: number, angle: number): boolean {
    const handleX = this.center.x + Math.cos(angle) * this.config.radius
    const handleY = this.center.y + Math.sin(angle) * this.config.radius
    const distance = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2)
    return distance <= this.config.handleRadius + 5
  }

  private isPointOnBar(angle: number): boolean {
    return this.isAngleBetween(angle, this.angleFrom, this.angleTo)
  }

  private isAngleBetween(angle: number, from: number, to: number): boolean {
    // 处理角度跨越0度的情况
    if (from <= to) {
      return angle >= from && angle <= to
    } else {
      return angle >= from || angle <= to
    }
  }

  private getArcLength(from: number, to: number): number {
    let length = to - from
    if (length < 0) length += Math.PI * 2
    return length
  }

  private getAngularDistance(a: number, b: number): number {
    const diff = Math.abs(a - b)
    return Math.min(diff, Math.PI * 2 - diff)
  }

  public setValues(from: number, to: number) {
    this.angleFrom = this.adjustAngle(this.valueToAngle(from))
    this.angleTo = this.adjustAngle(this.valueToAngle(to))
    this.draw()
  }

  public getValues() {
    return {
      from: this.angleToValue(this.angleFrom),
      to: this.angleToValue(this.angleTo)
    }
  }

  public setFinishCallback(callback: () => void) {
    this.onFinish = callback
  }

  public destroy() {
    // 移除事件监听器
    document.removeEventListener('mousemove', () => { })
    document.removeEventListener('mouseup', () => { })
    document.removeEventListener('touchmove', () => { })
    document.removeEventListener('touchend', () => { })
    document.removeEventListener('keydown', () => { })
  }
}

// 工具函数保持不变
export const MAXSLIDERVALUE = 48

export function ratio2HourMin(ratio: number) {
  const decimalHours = (24 * ratio) % 24
  const hours = Math.floor(decimalHours)
  const minutes = Math.round((decimalHours - hours) * 60)
  const formattedHours = String(hours).padStart(2, "0")
  const formattedMinutes = String(minutes).padStart(2, "0")
  return `${formattedHours}:${formattedMinutes}`
}

export function hourMin2Ratio(timeString: string) {
  const a = parseHourMinToRatio(timeString)
  const b = Math.floor(a * MAXSLIDERVALUE)
  return String(b)
}

export function parseHourMinToRatio(timeString: string): number {
  const [hours, minutes] = timeString.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes
  const ratio = totalMinutes / (24 * 60)
  return ratio
}
