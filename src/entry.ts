import { defineCustomElement } from "vue";
import CircleSlider from "./Slider.ts";

customElements.define("circle-slider", defineCustomElement(CircleSlider));