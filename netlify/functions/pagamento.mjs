// Cria a order no Mercado Pago (API de Orders) a partir dos dados do Payment Brick.
// O valor fica fixo aqui no servidor, para ninguém conseguir alterar pelo navegador.
const PRECO = "397.00";

export default async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return Response.json({ erro: "Pagamento não configurado" }, { status: 500 });

  let dados;
  try { dados = await req.json(); } catch { return Response.json({ erro: "Dados inválidos" }, { status: 400 }); }
  const f = dados.formData || {};
  const aluno = dados.aluno || {};
  const tipo = f.payment_type_id || (f.payment_method_id === "pix" ? "bank_transfer" : "credit_card");

  const pagamento = { amount: PRECO, payment_method: { id: f.payment_method_id, type: tipo } };
  if (tipo === "bank_transfer") {
    pagamento.expiration_time = "PT30M";
  } else {
    pagamento.payment_method.token = f.token;
    pagamento.payment_method.installments = Math.min(Math.max(Number(f.installments) || 1, 1), 3);
  }

  const payer = { email: f.payer?.email };
  if (f.payer?.identification?.number) payer.identification = f.payer.identification;
  if (aluno.nome) { const [n, ...s] = String(aluno.nome).trim().split(/\s+/); payer.first_name = n; if (s.length) payer.last_name = s.join(" "); }

  const corpo = {
    type: "online",
    processing_mode: "automatic",
    total_amount: PRECO,
    external_reference: "mentoria-fundadora-" + Date.now(),
    description: "Mentoria de IA - Turma fundadora",
    payer,
    transactions: { payments: [pagamento] },
  };

  const r = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(corpo),
  });
  const o = await r.json().catch(() => ({}));
  const p = o.transactions?.payments?.[0] || {};
  if (!r.ok) {
    const msg = o.errors?.[0]?.message || o.message || p.status_detail || "Pagamento recusado";
    console.log("orders error", r.status, JSON.stringify(o).slice(0, 800));
    return Response.json({ erro: msg }, { status: 400 });
  }
  const pm = p.payment_method || {};
  return Response.json({
    id: o.id,
    status: o.status,
    detalhe: o.status_detail,
    aprovado: o.status === "processed" || p.status === "processed",
    pix: pm.qr_code ? { codigo: pm.qr_code, imagem: pm.qr_code_base64, link: pm.ticket_url } : null,
  });
};
