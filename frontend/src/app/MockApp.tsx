import { Route, Routes } from "react-router-dom";
import { MockPreviewPage } from "../pages/MockPreviewPage";

export function MockApp() {
  return (
    <Routes>
      <Route path="*" element={<MockPreviewPage />} />
    </Routes>
  );
}
