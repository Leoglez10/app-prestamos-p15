import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Kiosk from "./pages/Kiosk";
import Admin from "./pages/Admin";
import PrestamoRapido from "./pages/PrestamoRapido";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/kiosko" element={<Kiosk />} />
        <Route path="/prestamo-rapido" element={<PrestamoRapido />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
