import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{ maxWidth: "calc(100vw - 24px)" }}
        toastOptions={{
          duration: 3000,
          style: { maxWidth: "340px", fontSize: "13px" },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}