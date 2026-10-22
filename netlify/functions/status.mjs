// Consulta o status de um pagamento (usado para saber quando o Pix foi pago).
export default async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return Response.json({ erro: "id inválido" }, { status: 400 });
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  const p = await r.json();
  if (!r.ok) return Response.json({ erro: "não encontrado" }, { status: 404 });
  return Response.json({ status: p.status });
};
