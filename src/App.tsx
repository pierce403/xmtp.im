import { Navigate, Route, Routes } from "react-router-dom";

import Chat from "./routes/Chat";
import Home from "./routes/Home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:target" element={<Chat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

