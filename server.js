const express = require('express');
const app = express();

// 🔥 TU BASE DE CLOUDFLARE
const IMAGE_BASE = "https://pub-45d25886bf1f485f84d01802a0471eaa.r2.dev";

// 👤 USUARIOS
const USERS = {
    "ALLAN": {
        password: "test123",
        tier: 2
    },
    "ADMIN": {
        password: "admin123",
        tier: 3
    }
};

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: "ok" });
});

// 🔐 LOGIN (FORMATO COMPATIBLE CON UDON)
app.get('/api/auth/:user/:pass', (req, res) => {
    const user = (req.params.user || "").trim();
    const pass = (req.params.pass || "").trim();

    const u = USERS[user];

    if (!u || u.password !== pass) {
        return res.json({
            success: false,
            tier: 0,
            displayName: "",
            urls: [],
            error: "Invalid username or password"
        });
    }

    // 📸 GENERAR URLs
    const urls = [];
    for (let i = 0; i < 15; i++) {
        const index = String(i).padStart(2, '0');
        urls.push(`${IMAGE_BASE}/users/${user}/slot_${index}.jpg`);
    }

    res.json({
        success: true,
        tier: u.tier,
        displayName: user,
        urls: urls,
        error: ""
    });
});

// 🚀 PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
});