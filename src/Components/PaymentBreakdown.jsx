export default function PaymentBreakdown({
    orderId,
    processStatus,
    totalAmount = 0,
    amountPaid = 0,
    balanceDue = 0,
    paidProducts = [],
    unpaidProducts = [],
    editWindowOpen = false,
    editDeadline = null,
    onPayNow,
    loading = false,
    handlingFee = 0 // new prop for handling fee
}) {

    if (!orderId) return null;

    // Normalize status (VERY IMPORTANT)
    const status = processStatus || '';

    const SHOW_STATUSES = [
        'partial_paid',
        'paid',
        'production',
        'dispatched',
        'pending_payment'
    ];

    if (!SHOW_STATUSES.includes(status)) return null;

    const isPartial = status === 'partial_paid';

    const isPaid =
        status === 'paid' ||
        status === 'production' ||
        status === 'dispatched';

    // FIX: safe number handling
    const safeBalance = Number(balanceDue || 0);
    const hasBalance = safeBalance > 0.01;

    const safeTotal = Number(totalAmount || 0);
    const safePaid = Number(amountPaid || 0);

    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">

            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${isPartial
                    ? 'bg-orange-50 border-b border-orange-100'
                    : 'bg-green-50 border-b border-green-100'
                }`}>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800">
                        {isPartial ? 'Additional Payment Required' : 'Payment Summary'}
                    </span>
                </div>

                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPartial
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                    {isPartial ? 'Partial Paid' : 'Paid'}
                </span>
            </div>

            {/* Products */}
            <div className="px-4 py-3 space-y-2">

                {paidProducts?.length > 0 && (
                    <>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                            Paid Products
                        </p>

                        {paidProducts.map((p, i) => (
                            <div key={i} className="flex justify-between bg-green-50 px-3 py-2 rounded-lg">
                                <span className="text-sm">
                                    {p.product_type}
                                </span>
                                <span className="text-green-700 font-medium">
                                    {Number(p.price || 0).toFixed(2)} DKK
                                </span>
                            </div>
                        ))}
                    </>
                )}

                {unpaidProducts?.length > 0 && (
                    <>
                        <p className="text-xs font-medium text-gray-500 uppercase mt-2">
                            Pending Payment
                        </p>

                        {unpaidProducts.map((p, i) => (
                            <div key={i} className="flex justify-between bg-orange-50 px-3 py-2 rounded-lg">
                                <span className="text-sm">
                                    {p.product_type}
                                </span>
                                <span className="text-orange-600 font-medium">
                                    {Number(p.price || 0).toFixed(2)} DKK
                                </span>
                            </div>
                        ))}
                    </>
                )}

                {/* Totals */}
                <div className="border-t pt-3 mt-2 space-y-1">

                    <div className="flex justify-between text-sm">
                        <span>Total</span>
                        <span>{safeTotal.toFixed(2)} DKK</span>
                    </div>

                    <div className="flex justify-between text-sm text-green-600">
                        <span>Paid</span>
                        <span>- {safePaid.toFixed(2)} DKK</span>
                    </div>

                    {handlingFee > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                            <span>Handling Fee</span>
                            <span>{Number(handlingFee).toFixed(2)} DKK</span>
                        </div>
                    )}

                    {hasBalance && (
                        <div className="flex justify-between text-sm font-bold text-orange-600">
                            <span>Balance</span>
                            <span>{safeBalance.toFixed(2)} DKK</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit window */}
            {editWindowOpen && editDeadline && (
                <div className="px-4 pb-3 text-xs text-blue-600">
                    Edit open until {new Date(editDeadline).toLocaleDateString()}
                </div>
            )}

            {/* Pay button */}
            {hasBalance && (
                <div className="px-4 pb-4">
                    <button
                        onClick={onPayNow}
                        disabled={loading}
                        className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold"
                    >
                        Pay Balance — {safeBalance.toFixed(2)} DKK
                    </button>
                </div>
            )}

            {/* Fully paid */}
            {!hasBalance && isPaid && (
                <div className="px-4 pb-4 text-center text-green-600 text-sm">
                    Fully paid
                </div>
            )}
        </div>
    );
}