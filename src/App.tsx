import { defineComponent } from "vue";
import CircleSlider from "./CircleSlider";

export default defineComponent({
    name: "App",
    setup() {
        return () => (
          <>
            <CircleSlider config={{ strokeWidth: 10, handleRadius: 5, strokePadding: 2 }} />
          </>
        );
    }
})