export interface CircleSliderConfig {
    min: number; // 最小值
    max: number; // 最大值
    from: number; // 起始值
    to: number; // 结束值
    step: number | null; // 步长，null表示不使用步长
    radius: number; // 圆的半径
    strokeWidth: number; // 圆环的宽度
    strokePadding: number; // 圆环两侧间距
    handleRadius?: number; // 拖动手柄的半径
    tickCount: number; // 刻度数量
    majorTickEvery: number; // 每隔多少个刻度显示一个大刻度
    colors: {
        rail: string; // 圆环底色
        bar: string; // 进度条颜色
        handle: string; // 拖动手柄颜色
        tick: string; // 刻度颜色
        text: string; // 文本颜色
    };
}