import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import ConfiguratorPage from "./pages/ConfiguratorPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConfiguratorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
