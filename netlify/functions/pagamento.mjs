// Cria o pagamento no Mercado Pago a partir dos dados do Payment Brick.
// O valor é fixo aqui no servidor, para ninguém conseguir alterar pelo navegador.
const PRECO = 397;
const DESCRICAO = "Mentoria de IA - Turma fundadora";

export default async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return Response.json({ erro: "Pagamento não configurado" }, { status: 500 });

  let dados;
  try { dados = await req.json(); } catch { return Response.json({ erro: "Dados inválidos" }, { status: 400 }); }
  const f = dados.formData || {};
  const aluno = dados.aluno || {};

  const corpo = {
    transaction_amount: PRECO,
    description: DESCRICAO,
    payment_method_id: f.payment_method_id,
    payer: {
      email: f.payer?.email,
      identification: f.payer?.identification,
      first_name: (aluno.nome || "").split(" ")[0] || undefined,
    },
    metadata: { nome: aluno.nome, whatsapp: aluno.whatsapp, profissao: aluno.profissao },
    external_reference: "mentoria-fundadora",
    statement_descriptor: "LEOMASSRI",
  };
  if (f.token) {
    corpo.token = f.token;
    corpo.installments = Math.min(Number(f.installments) || 1, 3);
    if (f.issuer_id) corpo.issuer_id = f.issuer_id;
  }
  if (f.payment_method_id === "pix") {
    corpo.date_of_expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("Z", "-00:00");
  }

  const r = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(corpo),
  });
  const p = await r.json();
  if (!r.ok) return Response.json({ erro: p.message || "Pagamento recusado", detalhe: p.cause }, { status: 400 });

  const tx = p.point_of_interaction?.transaction_data || {};
  return Response.json({
    id: p.id,
    status: p.status,
    detalhe: p.status_detail,
    pix: tx.qr_code ? { codigo: tx.qr_code, imagem: tx.qr_code_base64 } : null,
  });
};
