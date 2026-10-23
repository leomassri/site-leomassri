// Consulta uma order (usado para saber quando o Pix foi pago).
export default async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) return Response.json({ erro: "id inválido" }, { status: 400 });
  const r = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) return Response.json({ erro: "não encontrado" }, { status: 404 });
  return Response.json({ status: o.status, aprovado: o.status === "processed" });
};
