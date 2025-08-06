import {CircleSliderConfig} from "./types.ts";

export class Slider {
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public config: CircleSliderConfig;
    // 画布中心点
    private center: { x: number; y: number };
    private isDragging = false;
    // 当前拖拽目标: 'from', 'to', 'bar' 或 null
    // 'from' 和 'to' 分别表示起始和结束角度的拖拽，'bar' 表示拖拽整个圆弧
    private dragTarget: 'from' | 'to' | 'bar' | null = null;
    // 起始角度
    private angleFrom = 0;
    // 结束角度
    private angleTo = Math.PI / 2;
    // 保存上次通知的值，避免重复通知
    private lastNotifiedValues: { from: number; to: number } = { from: 0, to: 0 };
    // 拖拽时from和to更新的回调
    private changeCallback?: (from: number, to: number) => void;
    private eventListeners: Array<{
        element: Element | Document;
        event: string;
        handler: EventListener;
        options?: boolean | AddEventListenerOptions;
    }> = [];

    setChangeCallback(callback: (from: number, to: number) => void) {
        this.changeCallback = callback;
    }

    private notifyChange() {
        if (this.changeCallback) {
            const currentValues = this.getValues();

            const fromChanged = Math.abs(currentValues.from - this.lastNotifiedValues.from) >= (this.config.step || 0.1);
            const toChanged = Math.abs(currentValues.to - this.lastNotifiedValues.to) >= (this.config.step || 0.1);

            if (fromChanged || toChanged) {
                this.lastNotifiedValues = { ...currentValues };
                console.log('Notifying change:', currentValues);
                this.changeCallback(currentValues.from, currentValues.to);
            }
        }
    }

    constructor(canvas: HTMLCanvasElement, config: CircleSliderConfig) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.config = config;

        this.validateConfig();

        this.setupCanvasDPI();

        this.angleFrom = this.valueToAngle(this.config.from);
        this.angleTo = this.valueToAngle(this.config.to);

        this.lastNotifiedValues = { from: this.config.from, to: this.config.to };

        this.setupEventListeners();
        this.draw();
    }

    // 适配高DPI屏幕
    private setupCanvasDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);

        this.center = {
            x: this.canvas.width / (2 * dpr),
            y: this.canvas.height / (2 * dpr),
        };
    }

    private validateConfig() {
        if (this.config.step !== null && this.config.step > 0) {
            const range = this.config.max - this.config.min;
            const steps = range / this.config.step;

            if (steps < 3) {
                throw new Error('Not enough steps: at least three are required');
            }

            if (steps < this.config.tickCount) {
                console.warn('Step size might be too big for the number of ticks');
            }
        }
    }

    private addEventListener(
        element: Element | Document,
        event: string,
        handler: EventListener,
        options?: boolean | AddEventListenerOptions
    ) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    private setupEventListeners() {
        const getEventPos = (e: MouseEvent | TouchEvent) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        };

        let barDragOffset = 0;

        const handleStart = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const pos = getEventPos(e);
            const angle = this.getAngleFromPoint(pos.x, pos.y);

            if (this.isPointInHandle(pos.x, pos.y, this.angleFrom)) {
                this.dragTarget = 'from';
            } else if (this.isPointInHandle(pos.x, pos.y, this.angleTo)) {
                this.dragTarget = 'to';
            } else if (this.isPointOnBar(angle)) {
                this.dragTarget = 'bar';
                const currentAngle = this.fromCanvasAngle(angle);
                let barCenter: number;
                if (this.angleFrom <= this.angleTo) {
                    // 不跨越边界的情况
                    barCenter = (this.angleFrom + this.angleTo) / 2;
                } else {
                    // 跨越边界的情况 (例如: from=350°, to=30°)
                    const midAngle = (this.angleFrom + this.angleTo + Math.PI * 2) / 2;
                    barCenter = midAngle > Math.PI * 2 ? midAngle - Math.PI * 2 : midAngle;
                }

                barDragOffset = currentAngle - barCenter;

                // 处理偏移量跨越边界的情况
                if (barDragOffset > Math.PI) {
                    barDragOffset -= Math.PI * 2;
                } else if (barDragOffset < -Math.PI) {
                    barDragOffset += Math.PI * 2;
                }
            }

            if (this.dragTarget) {
                this.isDragging = true;
            }
        };

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!this.isDragging || !this.dragTarget) return;

            e.preventDefault();
            const pos = getEventPos(e);
            const angle = this.getAngleFromPoint(pos.x, pos.y);

            switch (this.dragTarget) {
                case 'from':
                    this.angleFrom = this.adjustAngle(this.fromCanvasAngle(angle));
                    break;
                case 'to':
                    this.angleTo = this.adjustAngle(this.fromCanvasAngle(angle));
                    break;
                case 'bar':
                    const arcLength = this.getArcLength(this.angleFrom, this.angleTo);
                    // 使用偏移量计算新的中心位置
                    const newCenter = this.fromCanvasAngle(angle) - barDragOffset;
                    this.angleFrom = this.adjustAngle(newCenter - arcLength / 2);
                    this.angleTo = this.adjustAngle(newCenter + arcLength / 2);
                    break;
            }

            this.draw();
            this.notifyChange();
        };

        const handleEnd = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.dragTarget = null;
            }
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const weight = 0.01 * e.deltaY;

            this.angleFrom = this.adjustAngle(
                this.angleFrom - (weight * Math.PI) / 50
            );
            this.angleTo = this.adjustAngle(this.angleTo + (weight * Math.PI) / 50);

            this.draw();
        };

        // 注册事件监听器
        this.addEventListener(this.canvas, 'mousedown', handleStart);
        this.addEventListener(document, 'mousemove', handleMove);
        this.addEventListener(document, 'mouseup', handleEnd);

        this.addEventListener(this.canvas, 'touchstart', handleStart, {
            passive: false,
        });
        this.addEventListener(document, 'touchmove', handleMove, {
            passive: false,
        });
        this.addEventListener(document, 'touchend', handleEnd);
        this.addEventListener(this.canvas, 'wheel', handleWheel);

        // 使canvas可以获得焦点
        this.canvas.tabIndex = 0;
    }

    private getTickSizes() {
        const baseSize = this.config.radius * 0.03
        const isLandscape = window.innerWidth > window.innerHeight;
        return {
            majorTickLength: baseSize * (isLandscape ? 1.5 : 2),
            minorTickLength: baseSize * (isLandscape ? 1 : 1.5),
            majorTickWidth: isLandscape ? 1.5 : 2,
            minorTickWidth: isLandscape ? 0.8 : 1
        }
    }

    private adjustAngle(angle: number): number {
        angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        if (this.config.step === null) {
            return angle;
        }

        const value = this.angleToValue(angle);
        const steppedValue =
            this.config.step * Math.round(value / this.config.step);
        return this.valueToAngle(steppedValue);
    }

    private angleToValue(angle: number): number {
        const normalizedAngle =
            ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const ratio = normalizedAngle / (Math.PI * 2);
        const value = this.config.min + ratio * (this.config.max - this.config.min);

        // 如果有步长，按步长取整
        if (this.config.step !== null && this.config.step > 0) {
            const steppedValue = this.config.step * Math.round(value / this.config.step);
            return Math.round(steppedValue);
        }

        // 没有步长时直接取整
        return Math.round(value);
    }

    private valueToAngle(value: number): number {
        while (value < this.config.min) {
            value = this.config.max - (this.config.min - value);
        }
        if (value > this.config.max) {
            value = value % this.config.max;
        }

        const ratio =
            (value - this.config.min) / (this.config.max - this.config.min);
        return ratio * Math.PI * 2;
    }

    private draw() {
        const { ctx } = this;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawRail();
        this.drawTicks();
        this.drawBar();
        this.drawHandle(this.angleFrom);
        this.drawHandle(this.angleTo);
    }

    // 绘制圆环
    private drawRail() {
        const { ctx, center, config } = this;

        ctx.beginPath();
        ctx.arc(
            center.x,
            center.y,
            config.radius - config.strokeWidth / 2 - config.strokePadding,
            0,
            Math.PI * 2
        );
        ctx.strokeStyle = config.colors.rail;
        ctx.lineWidth = config.strokeWidth + config.strokePadding * 2;
        ctx.stroke();
    }

    // 绘制刻度
    private drawTicks() {
        const { ctx, center, config } = this;
        const {
            majorTickLength,
            minorTickLength,
            majorTickWidth,
            minorTickWidth
        } = this.getTickSizes();

        for (let i = 0; i < config.tickCount; i++) {
            const angle = (i / config.tickCount) * Math.PI * 2;
            const isMajor = i % config.majorTickEvery === 0;

            const tickLength = isMajor ? majorTickLength : minorTickLength;
            const lineWidth = isMajor ? majorTickWidth : minorTickWidth;

            const innerRadius = config.radius - config.strokeWidth - config.strokePadding * 2 - tickLength;
            const outerRadius = config.radius - config.strokeWidth - config.strokePadding * 2 - 1;

            const x1 = center.x + Math.cos(angle) * innerRadius;
            const y1 = center.y + Math.sin(angle) * innerRadius;
            const x2 = center.x + Math.cos(angle) * outerRadius;
            const y2 = center.y + Math.sin(angle) * outerRadius;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = config.colors.tick;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    private drawBar() {
        const { ctx, center, config } = this;

        // 获取当前的实际值进行比较
        const fromValue = this.angleToValue(this.angleFrom);
        const toValue = this.angleToValue(this.angleTo);

        // 如果值相等，不绘制圆弧
        if (fromValue === toValue) {
            return;
        }

        const canvasAngleFrom = this.toCanvasAngle(this.angleFrom);
        const canvasAngleTo = this.toCanvasAngle(this.angleTo);

        // 如果转换后的角度也相等，不绘制圆弧
        if (Math.abs(canvasAngleFrom - canvasAngleTo) < 0.001) {
            return;
        }

        // 计算圆弧外接矩形的两个端点，实现类似SVG的右上到左下方向渐变
        const r = config.radius - config.strokeWidth / 2 - config.strokePadding;
        const x0 = center.x + r, y0 = center.y - r; // 右上
        const x1 = center.x - r, y1 = center.y + r; // 左下

        // 创建线性渐变
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, 'rgba(36,199,212,0.5)'); // #24C7D4, 0.5透明
        gradient.addColorStop(1, '#24C7D4');              // #24C7D4, 不透明

        ctx.beginPath();
        ctx.arc(
            center.x,
            center.y,
            r,
            canvasAngleFrom,
            canvasAngleTo
        );
        ctx.strokeStyle = gradient; // 使用渐变
        ctx.lineWidth = config.strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    private drawHandle(angle: number) {
        const { ctx, center, config } = this;

        const canvasAngle = this.toCanvasAngle(angle);

        const x =
            center.x +
            Math.cos(canvasAngle) *
            (config.radius - config.strokeWidth / 2 - config.strokePadding);
        const y =
            center.y +
            Math.sin(canvasAngle) *
            (config.radius - config.strokeWidth / 2 - config.strokePadding);

        ctx.beginPath();
        ctx.arc(x, y, config.handleRadius + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = config.colors.handle;
        ctx.fill();
    }

    private getAngleFromPoint(x: number, y: number): number {
        const dx = x - this.center.x;
        const dy = y - this.center.y;
        return Math.atan2(dy, dx);
    }

    private isPointInHandle(x: number, y: number, angle: number): boolean {
        const canvasAngle = this.toCanvasAngle(angle);
        const handleX =
            this.center.x +
            Math.cos(canvasAngle) *
            (this.config.radius -
                this.config.strokeWidth / 2 -
                this.config.strokePadding);
        const handleY =
            this.center.y +
            Math.sin(canvasAngle) *
            (this.config.radius -
                this.config.strokeWidth / 2 -
                this.config.strokePadding);

        const distance = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2);
        return distance <= this.config.handleRadius + 5;
    }

    private isPointOnBar(angle: number): boolean {
        return this.isAngleBetween(angle, this.toCanvasAngle(this.angleFrom), this.toCanvasAngle(this.angleTo));
    }

    private isAngleBetween(angle: number, from: number, to: number): boolean {
        if (from <= to) {
            return angle >= from && angle <= to;
        } else {
            return angle >= from || angle <= to;
        }
    }

    private getArcLength(from: number, to: number): number {
        let length = to - from;
        if (length < 0) length += Math.PI * 2;
        return length;
    }

    private toCanvasAngle(angle: number): number {
        return angle - Math.PI / 2;
    }

    private fromCanvasAngle(angle: number): number {
        return angle + Math.PI / 2;
    }

    public setValues(from: number, to: number) {
        this.angleFrom = this.adjustAngle(this.valueToAngle(from));
        this.angleTo = this.adjustAngle(this.valueToAngle(to));

        this.lastNotifiedValues = { from, to };
        this.draw();
    }

    public getValues() {
        return {
            from: this.angleToValue(this.angleFrom),
            to: this.angleToValue(this.angleTo),
        };
    }

    public destroy() {
        // 移除所有事件监听器
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
    }
}