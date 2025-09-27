import { fileTypeFromBuffer } from "file-type";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { supabase } from "./supabase.js"; // módulo criado com createClient
import DataBase from "./memory.js"; // DataBase adaptado para Postgres

const server = Fastify();

server.register(cors, {
  origin: "*",
  methods: "PUT, DELETE, POST, GET, OPTIONS",
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
        const buffer = await part.toBuffer();

        // detecta tipo MIME
        const type = await fileTypeFromBuffer(buffer);
        const mimeType = type ? type.mime : "application/octet-stream";

        // nome único com extensão
        const extension = part.filename.split(".").pop();
        const filename = generateUniqueFilename(part.filename);

        // upload com MIME correto
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("imagens")
          .upload(filename, buffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: mimeType, // ✅ define o tipo correto
          });

        if (uploadError) return reply.status(500).send(uploadError);

        const { data: publicData } = supabase.storage
          .from("imagens")
          .getPublicUrl(filename);
        productData.image_url = publicData.publicUrl;
      } else {
        if (part.fieldname in productData) {
          productData[part.fieldname] = part.value;
        }
      }
    }

    // salva no banco de dados (Postgres via DataBase)
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

server.listen({ port: 1992, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});
