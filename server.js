import { fileTypeFromBuffer } from "file-type";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { supabase } from "./supabase.js"; // módulo criado com createClient
import DataBase from "./memory.js"; // DataBase adaptado para Postgres

const server = Fastify();

server.register(cors, {
  origin: "*", // permite qualquer origem
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // array mais seguro
  allowedHeaders: ["Content-Type", "Authorization"], // define headers permitidos
  preflightContinue: false, // padrão
});
server.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = originalName.split(".").pop(); // mantém a extensão
  return `${timestamp}_${random}.${extension}`;
}

const dataBase = new DataBase(); // usa Postgres via sql

server.post("/create-product", async (req, reply) => {
  try {
    const parts = req.parts();
    const productData = {
      title: "",
      description: "",
      quantity: 0,
      image_url: null,
    };

    for await (const part of parts) {
      if (part.file) {
        // É um arquivo
        const buffer = await part.toBuffer();

        const type = await fileTypeFromBuffer(buffer);
        const mimeType = type ? type.mime : "application/octet-stream";

        const filename = generateUniqueFilename(part.filename);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("imagens")
          .upload(filename, buffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: mimeType,
          });

        if (uploadError) return reply.status(500).send(uploadError);

        // Corrigido: getPublicUrl retorna um objeto simples
        const { publicUrl } = supabase.storage
          .from("imagens")
          .getPublicUrl(filename);
        productData.image_url = publicUrl;
      } else if (part.fieldname in productData) {
        // É um campo de formulário
        productData[part.fieldname] = part.value;
      }
    }

    const id = await dataBase.Create(productData);

    return reply
      .status(201)
      .send({ message: "Produto criado", id, product: productData });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: err.message });
  }
});

server.get("/catalog-products", async (req, reply) => {
  const produtos = await dataBase.List();
  return reply.send(produtos);
});

server.put("/product/increase/:id", async (req, reply) => {
  const { id } = req.params;
  try {
    const success = await dataBase.IncreaseStock(id);
    if (!success)
      return reply.status(404).send({ error: "Produto não encontrado" });
    return reply.send({ message: "Estoque aumentado com sucesso" });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: err.message });
  }
});

// Diminuir estoque
server.put("/product/decrease/:id", async (req, reply) => {
  const { id } = req.params;
  try {
    const success = await dataBase.DecreaseStock(id);
    if (!success)
      return reply.status(404).send({ error: "Produto não encontrado" });
    return reply.send({ message: "Estoque diminuído com sucesso" });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: err.message });
  }
});

server.listen({ port: 1992, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});
