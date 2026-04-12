import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Kiosk from "./pages/Kiosk";
import Admin from "./pages/Admin";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/kiosko" element={<Kiosk />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
