const express = require("express");


const app = express();


// 🔥 URL BASE DE CLOUDLFARE (TU R2)
const BASE_URL = "https://pub-45d25886bf1f485f84d01802a0471eaa.r2.dev/users";

// 🔐 USUARIOS (puedes añadir más aquí)
const users = {
  "ALLAN": {
    password: "test123",
    tier: 2
  },
  "FRANCO": {
    password: "1234",
    tier: 1
  }
};

// 🧪 HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 🔑 LOGIN (compatible con VRChat)
app.get("/api/auth", (req, res) => {
  const { user, pass } = req.query;

  // Validación básica
  if (!user || !pass) {
    return res.json({
      success: false,
      tier: 0,
      displayName: "",
      urls: [],
      error: "Missing credentials"
    });
  }

  const userData = users[user];

  if (!userData || userData.password !== pass) {
    return res.json({
      success: false,
      tier: 0,
      displayName: "",
      urls: [],
      error: "Invalid username or password"
    });
  }

  // 🔥 GENERAR URLs DE IMÁGENES
  const urls = [];
  for (let i = 0; i < 15; i++) {
    const slot = `slot_${i.toString().padStart(2, "0")}`;
    urls.push(`https://vrchat-backend.onrender.com/api/image/${user}/${slot}`);
  }

  res.json({
    success: true,
    tier: userData.tier,
    displayName: user,
    urls: urls,
    error: ""
  });
});

// 🖼️ SERVIR IMÁGENES (REDIRECT → CLOUDLFARE)
app.get("/api/image/:user/:slot", (req, res) => {
  const { user, slot } = req.params;

  // 🔥 URL FINAL EN R2
  const imageUrl = `${BASE_URL}/${user}/${slot}.jpg`;

  // 🔥 REDIRECT (clave para VRChat)
  res.redirect(imageUrl);
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});