import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyOrder, verifyPaymentSession } from "../api/api";

// ─── product label map ────────────────────────────────────────────────────────
const PRODUCT_LABELS = {
  "T-SHIRT":     "T-Shirt",
  "SWEATSHIRT":  "Sweatshirt",
  "HOODIE":      "Hoodie",
  "ZIPPERHOODIE":"Zipper Hoodie",
  "SWEATPANTS":  "Sweatpants",
  "SHORTS":      "Shorts",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("da-DK", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function parseDeliveryDetails(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

// ─── main component ───────────────────────────────────────────────────────────
export default function SuccessScreen() {
  const [searchParams] = useSearchParams();
  const sessionId      = searchParams.get("session_id");

  const [order,     setOrder]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [retries,   setRetries]   = useState(0);

  // Webhook may still be processing — poll up to 10× with 3 s delay
  useEffect(() => {
    let cancelled = false;
    let attempt   = 0;
    const MAX     = 10;

    const fetchOrder = async () => {
      try {
        const res = await getMyOrder();
        if (!res.data?.success || !res.data?.data) {
          throw new Error("Order not found");
        }
        const o = res.data.data;

        // Keep polling while webhook hasn't fired yet
        const stillPending = o.process_status === "pending_payment" ||
                             o.process_status === "on_hold";

        if (stillPending && attempt < MAX) {
          attempt++;
          if (!cancelled) {
            setRetries(attempt);
            setTimeout(fetchOrder, 3000);   // wait 3 s then retry
          }
          return;
        }

        if (!cancelled) {
          setOrder(o);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your order. Please go back to the dashboard.");
          setLoading(false);
        }
      }
    };

    const init = async () => {
      // Ask the backend to confirm the session with Stripe directly first —
      // don't rely solely on the webhook, which can't reach a local/dev server.
      if (sessionId) {
        try { await verifyPaymentSession(sessionId); } catch (e) { console.error("Session verify failed:", e); }
      }
      if (!cancelled) fetchOrder();
    };

    init();
    return () => { cancelled = true; };
  }, [sessionId]);

  // ── Loading / Polling ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-700 font-semibold">
          {retries === 0 ? "Loading your order…" : `Confirming payment… (${retries}/10)`}
        </p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-700 font-semibold text-center max-w-sm">
          {error || "Something went wrong loading your order."}
        </p>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const totalAmount    = parseFloat(order.total_amount  || 0);
  const amountPaid     = parseFloat(order.amount_paid   || 0);
  const balanceDue     = parseFloat(order.balance_due   || Math.max(0, totalAmount - amountPaid));
  const editDeadline   = order.edit_deadline ? new Date(order.edit_deadline) : null;
  const editWindowOpen = editDeadline ? new Date() < editDeadline : false;
  const isPartial      = order.process_status === "partial_paid";
  const isStillPending = order.process_status === "pending_payment";
  const delivery        = parseDeliveryDetails(order.delivery_details);

  // Items — prefer the priced breakdown, fall back to raw order_items
  const paidIds = new Set((order.paid_products || []).map(p => p.id));
  const items = (order.product_price_breakdown && order.product_price_breakdown.length > 0)
    ? order.product_price_breakdown
    : (order.order_items || []).map(i => ({ id: i.id, product_type: i.product_type, color: i.selectedColor, size: i.selectedSize, price: 0 }));

  // ── Still pending after max retries — show processing state ──────────────────
  if (isStillPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Payment Processing</h2>
          <p className="text-slate-500 text-sm">
            Your payment was received by Stripe but our system is still updating. This usually takes a few seconds.
          </p>
          <p className="text-sm text-slate-700 font-semibold">
            Order #ORD-{order.id} · Total {totalAmount.toFixed(2)} DKK
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => { window.location.href = "/"; }}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => { window.location.reload(); }}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl print:border-0 print:rounded-none">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <img src="/clothLogo.png" alt="StudentLife" className="h-9" />
          <button
            onClick={() => window.print()}
            className="print:hidden text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-all"
          >
            Save as PDF
          </button>
        </div>

        <div className="px-8 py-8 space-y-8">

          {/* ── Title ──────────────────────────────────────────────────────────── */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isPartial ? "Payment Received" : "Order Confirmed"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isPartial
                ? "Partial payment recorded. A balance is due for extra products."
                : "Your payment is complete."}
            </p>
          </div>

          {/* ── Order details ──────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Order Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Order No.</p>
                <p className="font-semibold text-slate-800">#ORD-{order.id}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Date</p>
                <p className="font-semibold text-slate-800">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Payment Status</p>
                <p className="font-semibold text-slate-800 capitalize">{order.payment_status}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Order Status</p>
                <p className="font-semibold text-slate-800 capitalize">{(order.process_status || "").replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* ── Items ──────────────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Items</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs border-b border-slate-200">
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold">Color</th>
                  <th className="py-2 font-semibold">Size</th>
                  {isPartial && <th className="py-2 font-semibold">Status</th>}
                  <th className="py-2 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id || i} className="border-b border-slate-100">
                    <td className="py-2.5 font-medium text-slate-700">{PRODUCT_LABELS[item.product_type] || item.product_type}</td>
                    <td className="py-2.5 text-slate-600">{item.color || "—"}</td>
                    <td className="py-2.5 text-slate-600">{item.size || "—"}</td>
                    {isPartial && (
                      <td className={`py-2.5 font-semibold ${paidIds.has(item.id) ? "text-green-600" : "text-orange-600"}`}>
                        {paidIds.has(item.id) ? "Paid" : "Pending"}
                      </td>
                    )}
                    <td className="py-2.5 text-right font-semibold text-slate-800">{Number(item.price || 0).toFixed(2)} DKK</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ─────────────────────────────────────────────────────────── */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Total</span>
                <span className="font-semibold text-slate-800">{totalAmount.toFixed(2)} DKK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-semibold text-green-600">{amountPaid.toFixed(2)} DKK</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-semibold text-slate-700">Balance Due</span>
                  <span className="font-bold text-orange-600">{balanceDue.toFixed(2)} DKK</span>
                </div>
              )}
            </div>
          </div>

          {editWindowOpen && editDeadline && (
            <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              Edit window is open until <strong>{formatDate(editDeadline)}</strong>. Each new product added requires its own payment.
            </div>
          )}

          {/* ── Delivery details ───────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Delivery Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Name</p>
                <p className="font-semibold text-slate-800">{delivery.firstName} {delivery.lastName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Email</p>
                <p className="font-semibold text-slate-800">{delivery.email || "—"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Phone</p>
                <p className="font-semibold text-slate-800">{delivery.phone || "—"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">School</p>
                <p className="font-semibold text-slate-800">{delivery.Skolenavn || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400 text-xs">Address</p>
                <p className="font-semibold text-slate-800">
                  {delivery.address || "—"}{delivery.postalCode ? `, ${delivery.postalCode}` : ""} {delivery.city || ""}{delivery.country ? `, ${delivery.country}` : ""}
                </p>
              </div>
              {delivery.notes && (
                <div className="sm:col-span-2">
                  <p className="text-slate-400 text-xs">Notes</p>
                  <p className="font-semibold text-slate-800">{delivery.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── CTA buttons ────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 print:hidden pt-2">
            <button
              onClick={() => { window.location.href = "/"; }}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              {editWindowOpen ? "Go to Dashboard — Add More Products" : "Go to Dashboard"}
            </button>

            {isPartial && balanceDue > 0 && (
              <button
                onClick={() => { window.location.href = "/"; }}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all"
              >
                Pay Balance ({balanceDue.toFixed(2)} DKK) on Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
