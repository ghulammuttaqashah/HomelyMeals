# Card Payment Policy & Cancellation Restrictions

## Implementation Summary

Added user-friendly notifications and policy information for online payment orders to ensure customers understand the no-cancellation policy.

---

## Changes Made

### 1. **Order Details Page** (`customer/src/pages/OrderDetails.jsx`)

#### ✅ Toast Notification on Cancel Button Click
When a customer tries to cancel an online payment order:
- **Shows toast message:** "Online payment orders cannot be cancelled. Please contact support for refund requests."
- **Duration:** 5 seconds
- **Icon:** 🚫
- **Prevents modal from opening**

#### ✅ Backend Validation
Added check in `handleCancel` function:
```javascript
if (order.paymentMethod !== "cod") {
  toast.error(
    "Online payment orders cannot be cancelled. Please contact support for refund requests.",
    { duration: 5000, icon: "🚫" }
  );
  setShowCancelModal(false);
  return;
}
```

---

### 2. **Checkout Page** (`customer/src/pages/Checkout.jsx`)

#### ✅ Policy Modal on Card Payment Selection
When customer selects "Pay with Card":
- **Shows policy modal** with important information
- **Must accept** before proceeding with card payment
- **One-time acceptance** per checkout session

#### Modal Content:
**⚠️ Important Notice:**
- ❌ **No Cancellations:** Online payment orders cannot be cancelled once placed
- 💰 **Refund Process:** For refund requests, you must contact support
- 🔒 **Secure Payment:** Your payment is processed securely via Stripe

**✅ Why Card Payment?**
- ✓ Instant order confirmation
- ✓ No need for cash handling
- ✓ Secure and convenient

#### Modal Actions:
- **Cancel Button:** Returns to COD payment method
- **I Understand Button:** Accepts policy and enables card payment

---

## User Flow

### Scenario 1: Customer Tries to Cancel Online Payment Order

1. Customer goes to Order Details page
2. Clicks "Request Cancellation" button
3. **Toast appears:** "🚫 Online payment orders cannot be cancelled..."
4. Modal does NOT open
5. Customer is informed to contact support

### Scenario 2: Customer Selects Card Payment at Checkout

1. Customer is on Checkout page
2. Selects "Pay with Card" option
3. **Policy modal appears** with important information
4. Customer reads the policy
5. Options:
   - Click "Cancel" → Returns to COD
   - Click "I Understand" → Proceeds with card payment
6. Once accepted, can use card payment without seeing modal again (same session)

---

## Technical Details

### State Management
```javascript
const [showCardPolicyModal, setShowCardPolicyModal] = useState(false);
const [cardPolicyAccepted, setCardPolicyAccepted] = useState(false);
```

### Payment Method Handler
```javascript
const handlePaymentMethodChange = (method) => {
  if (method === "card" && !cardPolicyAccepted) {
    setShowCardPolicyModal(true);
  } else {
    setPaymentMethod(method);
  }
};
```

### Policy Acceptance
```javascript
const acceptCardPolicy = () => {
  setCardPolicyAccepted(true);
  setPaymentMethod("card");
  setShowCardPolicyModal(false);
};
```

---

## Backend Protection

The backend already has validation in place:

**File:** `server/modules/customer/controllers/customerOrder.controller.js`
```javascript
// Online payment orders cannot be cancelled
if (order.paymentMethod !== "cod") {
  return res.status(400).json({
    message: "Online payment orders cannot be cancelled. Please contact support for refund requests.",
  });
}
```

**File:** `server/modules/cook/controllers/cookOrder.controller.js`
```javascript
// Online payment orders cannot be cancelled
if (order.paymentMethod !== "cod") {
  return res.status(400).json({
    message: "Online payment orders cannot be cancelled. Please contact support.",
  });
}
```

---

## Benefits

✅ **Clear Communication:** Customers know the policy before paying  
✅ **Prevents Confusion:** Toast notifications explain why cancellation isn't available  
✅ **Better UX:** Modal provides all information upfront  
✅ **Reduced Support Tickets:** Customers understand the policy  
✅ **Legal Protection:** Clear acceptance of terms  

---

## Testing Checklist

- [ ] Order Details page shows toast when trying to cancel card payment order
- [ ] Order Details page allows cancellation for COD orders
- [ ] Checkout page shows policy modal when selecting card payment
- [ ] Policy modal "Cancel" button returns to COD
- [ ] Policy modal "I Understand" button enables card payment
- [ ] Policy modal doesn't show again after acceptance (same session)
- [ ] Backend rejects cancellation requests for online payment orders
- [ ] Toast messages are clear and visible

---

## Future Enhancements

- Add policy acceptance to Terms & Conditions
- Store policy acceptance in database
- Add refund request form in customer dashboard
- Email notification with policy details after card payment
