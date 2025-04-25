// Script di test preventivo bundle
// Replit: incolla nella Shell ed esegui con `node test-bundle-request.js`

import fetch from "node-fetch";

async function main() {
  console.log("🛠️ Avvio test creazione preventivo da bundle...");

  // 1. Test cliente nuovo
  const newClientData = {
    firstName: "Test",
    lastName: "ClienteNuovo",
    email: `testclientenuovo_${Date.now()}@example.com`,
    phone: `+3934${Math.floor(Math.random() * 10000000)}`,
    eventDate: "2025-08-30",
    location: "Ristorante Prova",
    message: "Preventivo di test cliente nuovo",
    bundleId: 1, // Usa un ID reale di un bundle esistente
  };

  // 2. Test cliente esistente
  const existingClientData = {
    firstName: "Test",
    lastName: "ClienteEsistente",
    email: "clienteesistente@example.com", // Una email che già esiste nel DB
    phone: "+393401234567",
    eventDate: "2025-09-15",
    location: "Villa Test",
    message: "Preventivo di test cliente esistente",
    bundleId: 1, // Usa sempre bundle reale
  };

  try {
    // Prima creiamo il cliente esistente (se non esiste già)
    console.log("🔍 Creazione cliente esistente (se non presente)...");
    await fetch("http://localhost:5000/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Test",
        lastName: "ClienteEsistente",
        email: "clienteesistente@example.com",
        phone: "+393401234567",
      }),
    });

    // 3. Richiesta preventivo per cliente nuovo
    console.log("🚀 Inviando richiesta preventivo per CLIENTE NUOVO...");
    const resNew = await fetch(
      "http://localhost:5000/api/bundle-leads/create-quote",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientData),
      },
    );
    const resNewJson = await resNew.json();
    console.log("✅ Risposta cliente nuovo:", resNewJson);

    // 4. Richiesta preventivo per cliente esistente
    console.log("🚀 Inviando richiesta preventivo per CLIENTE ESISTENTE...");
    const resExisting = await fetch(
      "http://localhost:5000/api/bundle-leads/create-quote",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existingClientData),
      },
    );
    const resExistingJson = await resExisting.json();
    console.log("✅ Risposta cliente esistente:", resExistingJson);
  } catch (error) {
    console.error("❌ Errore durante il test:", error.message);
  }
}

main();
