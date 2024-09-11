require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const sharp = require("sharp");
const fs = require("fs");
const { OcrService } = require("./analyser");
const PORT = 3000;

// Middleware para interpretar o corpo das requisições
app.use(bodyParser.json({ limit: "10mb" })); // Aumenta o limite para arquivos grandes
app.use(express.static("public")); // Serve arquivos estáticos da pasta 'public'

// Rota para servir a página HTML
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Rota para receber o arquivo
app.post("/upload", async (req, res) => {
  const { file, ext } = req.body;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }

  const fileBuffer = Buffer.from(file, "base64");

  const grayscaleImageBuffer = await sharp(fileBuffer).grayscale().toBuffer();

  fs.writeFileSync(`./public/image.${ext}`, grayscaleImageBuffer); // salva a imagem para visualização

  const ocrService = new OcrService();

  const response = await ocrService.detectText(grayscaleImageBuffer);

  console.log("Arquivo recebido com sucesso!");

  res.json({ analysis: JSON.stringify(response, null, 2) });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
