import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import SourcesPage from "./pages/SourcesPage";
import AddSourcePage from "./pages/AddSourcePage";
import PreviewPage from "./pages/PreviewPage";
import GraphPage from "./pages/GraphPage";
import EntityPage from "./pages/EntityPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />

        <Route path="/fuentes" element={<SourcesPage />} />
        <Route path="/fuentes/nueva" element={<AddSourcePage />} />
        <Route path="/fuentes/vista-previa" element={<PreviewPage />} />

        <Route path="/grafo" element={<GraphPage />} />
        <Route path="/entidad/:id" element={<EntityPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
