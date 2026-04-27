const express = require('express');
const app = express();

// 🔥 IMPORTANTE: cambia esto por tu URL real de Cloudflare
const IMAGE_BASE = "https://pub-45d25886bf1f485f84d01802a0471eaa.r2.dev";

// 🔐 Usuarios (aquí creas todos los que quieras)
const USERS = {
    "ALLAN": {
        password: "ALLAN123",
        tier: 2
    },
    "admin": {
        password: "admin123",
        tier: 3
    }
};

// ✅ Endpoint de salud (Render lo usa)
app.get('/api/health', (req, res) => {
    res.json({ status: "ok" });
});

// 🔑 LOGIN
app.get('/api/auth', (req, res) => {
    const user = req.query.user;
    const pass = req.query.pass;

    if (!user || !pass) {
        return res.json({
            success: false,
            tier: 0,
            displayName: "",
            urls: [],
            error: "Missing credentials"
        });
    }

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

    // 📸 Generar URLs automáticamente (15 slots)
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

// 🚀 PORT (Render usa esto)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
});