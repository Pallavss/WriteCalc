import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API route for handwriting recognition
  app.post("/api/recognize", async (req, res) => {
    try {
      const { imageBase64, inventory } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 in request" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Format inventory list for prompt context
      let inventoryContext = "";
      if (Array.isArray(inventory) && inventory.length > 0) {
        inventoryContext = `Current Store Inventory Catalog with unit rates:\n` +
          inventory.map((item: any) => `- ${item.name}: ₹${item.price} per ${item.unit}`).join("\n");
      } else {
        inventoryContext = `Default Store Inventory Catalog with unit rates:\n- Rice: ₹120 per kg\n- Sugar: ₹45 per kg\n- Wheat Flour: ₹40 per kg\n- Mustard Oil: ₹150 per L\n- Toor Dal: ₹160 per kg\n- Milk: ₹60 per L\n- Salt: ₹25 per kg\n- Potato: ₹30 per kg\n- Onion: ₹40 per kg`;
      }

      const promptText = `You are an expert handwriting recognizer and retail billing assistant for a grocery / kirana shopkeeper.
Analyze the handwritten drawing on this digital notepad.

${inventoryContext}

Rules for interpretation:
1. INVENTORY ITEMS & QUANTITIES:
   - If the shopkeeper wrote an item name and quantity (e.g. "5kg rice", "5 kg rice", "rice 5kg", "2 sugar", "500g dal", "3L oil", "2 pkt milk", "1.5 kg wheat"):
     - Match it against the closest inventory item.
     - Extract the numerical quantity and unit.
     - UNIT CONVERSION: If the shopkeeper writes grams (e.g. "500g") and the inventory unit is "kg", calculate effective quantity as 500 / 1000 = 0.5 kg.
     - UNIT CONVERSION: If the shopkeeper writes milliliters (e.g. "500ml") and the inventory unit is "L", calculate effective quantity as 500 / 1000 = 0.5 L.
     - Calculate amount = effective_quantity * unitPrice.
     - Set type: "item", matchedInventory: true.
2. MATHEMATICAL OPERATIONS:
   - If the shopkeeper wrote a mathematical calculation (e.g. "120 * 5", "5 x 120", "200 + 150", "500 - 10%", "1000 / 4", "150 + 20"):
     - Calculate the result.
     - Set type: "calculation", matchedInventory: false, amount: evaluated result.
3. NON-CATALOG ITEMS WITH EXPLICIT PRICE:
   - If the writing mentions an item with an explicit price (e.g. "Soap 45", "Biscuits 20"):
     - Set type: "item", name: item name, quantity: 1, unit: "pcs", unitPrice: price, amount: price, matchedInventory: false.
4. SIMPLE NUMBERS:
   - If only a plain number is written (e.g. "250"):
     - Set type: "calculation", name: "Amount", quantity: 1, unit: "amount", unitPrice: 250, amount: 250, expression: "250", matchedInventory: false.
5. If multiple distinct lines or items are written, return each item in the items array.

Confidence should be between 0.0 and 1.0.`;

      let response;
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      data: imageBase64.replace(/^data:image\/(png|jpeg);base64,/, ""),
                      mimeType: "image/png"
                    }
                  },
                  {
                    text: promptText
                  }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  rawText: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        name: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        unitPrice: { type: Type.NUMBER },
                        amount: { type: Type.NUMBER },
                        expression: { type: Type.STRING },
                        matchedInventory: { type: Type.BOOLEAN }
                      },
                      required: ["type", "name", "quantity", "unit", "unitPrice", "amount", "expression", "matchedInventory"]
                    }
                  }
                },
                required: ["rawText", "confidence", "items"]
              }
            }
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          retries--;
          console.warn(`Gemini API attempt failed, ${retries} retries left. Error:`, error.message);
          if (retries === 0 || (error.status !== 503 && !error.message?.includes("503"))) {
            throw error; // Throw if out of retries or not a 503 error
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      if (response && response.text) {
        const result = JSON.parse(response.text);
        res.json(result);
      } else {
        res.status(500).json({ error: "No response from AI" });
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to recognize handwriting" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
