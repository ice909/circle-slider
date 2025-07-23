import { defineComponent } from "vue";
import CircleSlider from "./CircleSlider";

export default defineComponent({
    name: "App",
    setup() {
        return () => (
          <>
            <CircleSlider config={{ strokeWidth: 34, handleRadius: 17 }} />
          </>
        );
    }
})