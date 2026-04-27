const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 BASE CLOUDFLARE
const BASE_URL = "https://pub-45d25886bf1f485f84d01802a0471eaa.r2.dev/users";

// 🔹 USUARIOS
const users = {
  ALLAN: { password: "test123", tier: 2 },
  FRANCO: { password: "1234", tier: 1 }
};

// 🔹 SESIONES (simple)
app.get("/api/image/:user/:slot", (req, res) => {
  const { user, slot } = req.params;

  const imageUrl = `${BASE_URL}/${user}/${slot}.jpg`;

  res.redirect(imageUrl);
});
// 🔹 LOGIN
app.get("/api/auth/:user/:pass", (req, res) => {
  const { user, pass } = req.params;

  const u = users[user];

  if (!u || u.password !== pass) {
    return res.json({
      success: false,
      tier: 0,
      displayName: "",
      urls: [],
      error: "Invalid login"
    });
  }

  activeUser = user;

  // URLs FIJAS (Unity usa estas)
  const urls = [];
  for (let i = 0; i < 15; i++) {
    const slot = i.toString().padStart(2, "0");
    urls.push(`https://vrchat-backend.onrender.com/api/image/slot_${slot}`);
  }

  res.json({
    success: true,
    tier: u.tier,
    displayName: user,
    urls: urls,
    error: ""
  });
});

// 🔹 SERVIR IMÁGENES DINÁMICAS
app.get("/api/image/:slot", async (req, res) => {
  if (!activeUser) {
    return res.status(403).send("Not logged in");
  }

  const slot = req.params.slot;

  const imageUrl = `${BASE_URL}/${activeUser}/${slot}.jpg`;

  try {app.get("/api/image/:slot", (req, res) => {
  if (!activeUser) {
    return res.status(403).send("Not logged in");
  }

  const slot = req.params.slot;

  const imageUrl = `${BASE_URL}/${activeUser}/${slot}.jpg`;

  // 🔥 REDIRECT DIRECTO (CLAVE)
  res.redirect(imageUrl);
});
  } catch (err) {
    res.status(500).send("Error loading image");
  }
});

// 🔹 HEALTH
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});