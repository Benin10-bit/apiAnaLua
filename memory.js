import crypto from "crypto";
import { sql } from "./db.js"; // ou onde você criou o neon instance

export default class DataBase {

  // Listar todos os produtos
  async List() {
    const produtos = await sql`SELECT * FROM products`;
    return produtos;
  }

  // Criar um produto
  async Create(data) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO products (id, title, description, quantity, imagem)
      VALUES (${id}, ${data.title}, ${data.description}, ${data.quantity}, ${data.image_url})
    `;
    return id;
  }

  // Aumentar estoque
  async IncreaseStock(id) {
    const updated = await sql`
      UPDATE products
      SET quantity = quantity + 1
      WHERE id = ${id}
      RETURNING *;
    `;
    return updated.length > 0;
  }

  // Diminuir estoque sem deixar negativo
  async DecreaseStock(id) {
    const updated = await sql`
      UPDATE products
      SET quantity = GREATEST(quantity - 1, 0)
      WHERE id = ${id}
      RETURNING *;
    `;
    return updated.length > 0;
  }

  async Delete(id) {
    const deleted = await sql`
      DELETE FROM products
      WHERE id = ${id}
      RETURNING *;
    `;
    return deleted.length > 0;
  }
}
