const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 URL BASE DE TUS IMÁGENES EN CLOUDFLARE
const BASE_URL = "https://pub-45d25886bf1f485f84d01802a0471eaa.r2.dev/users";

// 🔹 USUARIOS (puedes añadir más aquí)
const users = [
  { username: "ALLAN", password: "test123", tier: 2 },
  { username: "FRANCO", password: "1234", tier: 1 },
  { username: "VIP", password: "vip123", tier: 3 }
];

// 🔹 GENERA SIEMPRE LAS MISMAS URLs (FIJAS)
function generateFixedUrls() {
  const urls = [];

  for (let i = 0; i < 15; i++) {
    const slot = i.toString().padStart(2, "0");
    urls.push(`${BASE_URL}/slot_${slot}.jpg`);
  }

  return urls;
}

// 🔹 LOGIN
app.get("/api/auth/:user/:pass", (req, res) => {
  const { user, pass } = req.params;

  const foundUser = users.find(
    u => u.username === user && u.password === pass
  );

  if (!foundUser) {
    return res.json({
      success: false,
      tier: 0,
      displayName: "",
      urls: [],
      error: "Invalid username or password"
    });
  }

  // ✅ SIEMPRE DEVUELVE LAS MISMAS URLs
  const urls = generateFixedUrls();

  return res.json({
    success: true,
    tier: foundUser.tier,
    displayName: foundUser.username,
    urls: urls,
    error: ""
  });
});

// 🔹 HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});