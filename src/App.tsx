import { defineComponent } from "vue";
import CircleSlider from "./CircleSlider";

export default defineComponent({
    name: "App",
    setup() {
        return () => (
            <>
                <CircleSlider size={window.innerWidth * 0.74} railWidth={50} />
            </>
        );
    }
})