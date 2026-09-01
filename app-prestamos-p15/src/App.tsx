import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Kiosk from "./pages/Kiosk";
import Admin from "./pages/Admin";
import PrestamoRapido from "./pages/PrestamoRapido";
import { useAutoBackup } from "./hooks/useAutoBackup";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./App.css";

function App() {
  useAutoBackup();

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/kiosko" element={<Kiosk />} />
          <Route path="/prestamo-rapido" element={<PrestamoRapido />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
